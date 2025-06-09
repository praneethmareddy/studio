from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import glob
import pickle
import pandas as pd
import faiss
from typing import List
from sentence_transformers import SentenceTransformer
from langchain_core.documents import Document
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from io import BytesIO
import numpy as np
import uuid
import base64

PENDING_REQUESTS = {} 
app = Flask(__name__)
CORS(app)

# === Paths & Setup ===
FOLDERS = {
    "ciq": "ciq_files",
    "standard_ciq": "standard_ciq", 
    "template": "templates",
    "log": "logs",
    "master_template": "master_templates"
}
FAISS_INDEX_DIR = "faiss_indexes"
os.makedirs(FAISS_INDEX_DIR, exist_ok=True)

EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
router_llm = Ollama(model="llama3")
llm = Ollama(model="llama3.1:8b")

memory = ConversationBufferMemory(return_messages=True)

# === Loaders ===
def load_generic_text_documents(folder, doc_type):
    documents = []
    for filepath in glob.glob(f"{folder}/*"):
        filename = os.path.basename(filepath)
        try:
            with open(filepath, "r") as f:
                content = f.read()
            documents.append(Document(
                page_content=f"[{filename}]\n{content}",
                metadata={"type": doc_type, "path": filepath}
            ))
        except Exception as e:
            print(f"[!] Error reading {doc_type} {filepath}: {e}")
    return documents

def load_ciq_documents(folder):
    documents = []
    for filepath in glob.glob(f"{folder}/*.xlsx"):
        filename = os.path.basename(filepath)
        try:
            df = pd.read_excel(filepath, sheet_name=None)
            content = "\n".join(
                f"Sheet: {sheet}\n{df[sheet].head(5).to_csv(index=False)}"
                for sheet in df
            )
            documents.append(Document(
                page_content=f"[{filename}]\n{content}",
                metadata={"type": "ciq", "path": filepath}
            ))
        except Exception as e:
            print(f"[!] Error reading CIQ {filepath}: {e}")
    return documents

# === FAISS Embedding Indexing ===
def build_faiss_index(docs: List[Document], doc_type: str):
    if not docs:
        print(f"[!] No documents found for {doc_type}, skipping FAISS index build.")
        return

    texts = [doc.page_content for doc in docs]
    embeddings = EMBED_MODEL.encode(texts, convert_to_numpy=True)

    # If only one document, reshape embeddings to 2D
    if embeddings.ndim == 1:
        embeddings = embeddings.reshape(1, -1)

    if embeddings.shape[0] == 0:
        print(f"[!] No embeddings generated for {doc_type}, skipping index build.")
        return

    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)

    with open(f"{FAISS_INDEX_DIR}/{doc_type}_docs.pkl", "wb") as f:
        pickle.dump(docs, f)

    faiss.write_index(index, f"{FAISS_INDEX_DIR}/{doc_type}_index.faiss")
    print(f"✅ Built FAISS index for {doc_type} ({len(docs)} docs)")

def preprocess_all_faiss():
    build_faiss_index(load_ciq_documents(FOLDERS["ciq"]), "ciq")
    build_faiss_index(load_ciq_documents(FOLDERS["standard_ciq"]), "standard_ciq")
    build_faiss_index(load_generic_text_documents(FOLDERS["template"], "template"), "template")
    build_faiss_index(load_generic_text_documents(FOLDERS["log"], "log"), "log")
    build_faiss_index(load_generic_text_documents(FOLDERS["master_template"], "master_template"), "master_template")

def load_faiss_index(doc_type):
    index = faiss.read_index(f"{FAISS_INDEX_DIR}/{doc_type}_index.faiss")
    with open(f"{FAISS_INDEX_DIR}/{doc_type}_docs.pkl", "rb") as f:
        docs = pickle.load(f)
    return index, docs

# === Router ===
def route_db(query):
    prompt = PromptTemplate.from_template("""
Classify the user query into one of the categories:

- ciq: Excel CIQ files with columns like PCI, TAC, etc.
- standard_ciq: Standardized CIQ files with normalized column names.
- template: Config templates generated from CIQ.
- master_template: Global/merged/unified templates.
- log: Diagnostic log files or error traces.
- general: Chat or unrelated to files.

Query: "{query}"
Only respond with one of: ciq, standard_ciq, template, master_template, log, general.
Category:
""")
    raw = router_llm.invoke(prompt.format(query=query)).strip().lower()
    return raw if raw in ["ciq", "standard_ciq", "template", "master_template", "log"] else "general"

# === Prompts per Category ===
ciq_prompt = PromptTemplate.from_template("""
You are a telecom assistant. Use the CIQ (Customer Information Questionnaire) sheet data below to answer the user query.

Context:
{context}

User Query:
{query}

Answer in a structured and helpful way:
""")

standard_ciq_prompt = PromptTemplate.from_template("""
You are a telecom assistant. Use the standardized CIQ sheet data below to answer the user query. The data is normalized for column names and format.

Standardized CIQ Context:
{context}

User Query:
{query}

Answer precisely using the standardized information:
""")

template_prompt = PromptTemplate.from_template("""
You are a config assistant. Use the following NE template (generated from a CIQ) to answer the question.

Template Context:
{context}

Query:
{query}

Response:
""")

master_template_prompt = PromptTemplate.from_template("""
You are a deployment assistant. The context below contains a **global or merged NE master template**. Use it to answer the query.

Master Template:
{context}

User Query:
{query}

Answer with high-level clarity:
""")

log_prompt = PromptTemplate.from_template("""
You are a diagnostics assistant. The context contains a system or error log. Use it to troubleshoot or respond.

Log Context:
{context}

User Query:
{query}

Provide an insightful and actionable answer:
""")

general_prompt = PromptTemplate.from_template("""
You are an assistant. The context contains chat history.

Past Conversation
{context}

User Query:
{query}

Provide a crisp and short answer:
""")

# === Helper: Semantic Column Mapper ===
def semantic_column_mapping(unstandard_cols: List[str], standard_cols: List[str], threshold=0.7):
    """
    Maps each unstandard column to the most semantically similar standard column if similarity >= threshold.
    Returns a dict {unstandard_col: standard_col}.
    """
    unstandard_embeds = EMBED_MODEL.encode(unstandard_cols, convert_to_numpy=True)
    standard_embeds = EMBED_MODEL.encode(standard_cols, convert_to_numpy=True)

    # Normalize vectors to unit norm for cosine similarity
    def normalize(vectors):
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        return vectors / np.clip(norms, 1e-10, None)

    unstandard_embeds_norm = normalize(unstandard_embeds)
    standard_embeds_norm = normalize(standard_embeds)

    sim_matrix = np.dot(unstandard_embeds_norm, standard_embeds_norm.T)  # shape (len(unstandard), len(standard))

    mapping = {}
    for i, col in enumerate(unstandard_cols):
        sim_scores = sim_matrix[i]
        max_idx = np.argmax(sim_scores)
        max_score = sim_scores[max_idx]
        if max_score >= threshold:
            mapping[col] = standard_cols[max_idx]
        else:
            mapping[col] = None  # No confident match

    return mapping

# === Main Standardization Function ===
def standardize_ciq_df(unstandard_df: pd.DataFrame, standard_df: pd.DataFrame):
    unstandard_cols = list(unstandard_df.columns)
    standard_cols = list(standard_df.columns)

    mapping = semantic_column_mapping(unstandard_cols, standard_cols)

    standardized_data = {}
    for std_col in standard_cols:
        matched_cols = [k for k, v in mapping.items() if v == std_col]
        if matched_cols:
            standardized_data[std_col] = unstandard_df[matched_cols[0]]
        else:
            standardized_data[std_col] = [pd.NA] * len(unstandard_df)

    # Fix: detect truly unmatched columns (those not mapped to any standard column)
    unmatched_cols = [col for col, mapped in mapping.items() if mapped is None]

    return pd.DataFrame(standardized_data), unmatched_cols

# === Query Execution ===
 # In-memory store; use DB for production

def retrieve_and_respond(query, top_k=1, file=None):
    if file and ("standard" in query.lower() or "standardized" in query.lower()):
        try:
            unstandard_df = pd.read_excel(file)
            standard_files = glob.glob(f"{FOLDERS['standard_ciq']}/*.xlsx")
            if not standard_files:
                return jsonify({"error": "No standard CIQ template found."}), 500
            standard_template_df = pd.read_excel(standard_files[0])

            standardized_df, unmatched_cols = standardize_ciq_df(unstandard_df, standard_template_df)

            # Create a unique request ID and store in memory
            request_id = str(uuid.uuid4())
            PENDING_REQUESTS[request_id] = {
                "unmatched_cols": unmatched_cols,
                "updated_template": standard_template_df.copy(),
                "template_path": standard_files[0]
            }

            # Prepare standardized file as base64
            output = BytesIO()
            standardized_df.to_excel(output, index=False)
            output.seek(0)
            encoded_file = base64.b64encode(output.read()).decode('utf-8')

            return jsonify({
    "request_id": request_id,
    "standardized_file": encoded_file,
    "standardized_file_base64": encoded_file,  # alias for clarity
    "unmatched_columns": unmatched_cols,
    "message": "Do you want to update the standard CIQ template with unmatched columns?",
    "response": f"✅ CIQ standardized successfully. Found {len(unmatched_cols)} unmatched columns."
})


        except Exception as e:
            print(f"[!] Error processing CIQ: {e}")
            return jsonify({"error": "Failed to process uploaded CIQ file."}), 500
    category = route_db(query)
    print(f"\n🔍 Routed to: {category}")

    if category == "general":
        prompt = general_prompt
        conversation_history = ""
        for msg in memory.buffer:
            role = "User" if msg.type == "human" else "Assistant"
            conversation_history += f"{role}: {msg.content}\n"
        print("📝 General query. No context retrieval.")
        prompt_with_memory = prompt.format(context=f"{conversation_history}", query=query)
        response = llm.invoke(prompt_with_memory)
        memory.save_context({"input": query}, {"output": response})
        print("\n🧠 Response:\n", response)
        return jsonify({"response": response})

    try:
        index, docs = load_faiss_index(category)
        query_vec = EMBED_MODEL.encode([query], convert_to_numpy=True)

        if query_vec.ndim == 1:
            query_vec = query_vec.reshape(1, -1)

        distances, indices = index.search(query_vec, top_k)
        selected_doc = docs[indices[0][0]] if indices[0].size > 0 else None
        context = selected_doc.page_content if selected_doc else "No relevant context found."

        conversation_history = ""
        for msg in memory.buffer:
            role = "User" if msg.type == "human" else "Assistant"
            conversation_history += f"{role}: {msg.content}\n"

        if category == "ciq":
            prompt = ciq_prompt
        elif category == "standard_ciq":
            prompt = standard_ciq_prompt
        elif category == "template":
            prompt = template_prompt
        elif category == "master_template":
            prompt = master_template_prompt
        elif category == "log":
            prompt = log_prompt
        else:
            prompt = PromptTemplate.from_template("Context:\n{context}\nQuery:\n{query}\nAnswer:")

        prompt_with_memory = prompt.format(context=f"{conversation_history}\n{context}", query=query)
        response = llm.invoke(prompt_with_memory)
        memory.save_context({"input": query}, {"output": response})

        print(f"\n✅ Selected file: {selected_doc.metadata['path'] if selected_doc else 'None'}")
        print("\n🧠 Response:\n", response)
        return jsonify({"response": response})

    except Exception as e:
        print(f"❌ Retrieval or LLM failed: {e}")
        return jsonify({"error": "Sorry, I encountered an error processing your query."}), 500

# === Flask Routes ===
@app.route('/')
def home():
    return "Hello, I am the server"

@app.route('/query', methods=['POST'])
def query():
    if 'file' in request.files:
        file = request.files['file']
        # Also accept optional 'query' text param
        user_query = request.form.get('query', '')
        return retrieve_and_respond(user_query, file=file)
    else:
        data = request.get_json()
        user_query = data.get("query", "")
        return retrieve_and_respond(user_query)
@app.route('/confirm-update', methods=['POST','OPTIONS'])
def confirm_update():
    if request.method == 'OPTIONS':
        # CORS preflight response
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response, 200
    data = request.get_json()
    request_id = data.get("request_id")
    decision = data.get("decision", "").lower()

    if not request_id or request_id not in PENDING_REQUESTS:
        return jsonify({"error": "Invalid request_id"}), 400

    request_data = PENDING_REQUESTS.pop(request_id)

    if decision == "yes":
        standard_df = request_data["updated_template"]
        for col in request_data["unmatched_cols"]:
            if col not in standard_df.columns:
                standard_df[col] = pd.NA

        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        backup_path = request_data["template_path"].replace(".xlsx", f"_backup_{timestamp}.xlsx")
        standard_df.to_excel(backup_path, index=False)
        standard_df.to_excel(request_data["template_path"], index=False)
        build_faiss_index(load_ciq_documents(FOLDERS["standard_ciq"]), "standard_ciq")
        return jsonify({"status": "updated", "message": "✅ Standard CIQ template updated."})
    else:
        return jsonify({"status": "skipped", "message": "❌ Update skipped as per user decision."})

if __name__ == '__main__':
    # Uncomment to rebuild indexes at server start
    #preprocess_all_faiss()
    app.run(debug=True)
