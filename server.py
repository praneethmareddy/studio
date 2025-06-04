from flask import Flask, request, jsonify
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

# === Query Execution ===
def retrieve_and_respond(query, top_k=1):
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
        return response

    try:
        index, docs = load_faiss_index(category)
        query_vec = EMBED_MODEL.encode([query], convert_to_numpy=True)

        # Reshape query_vec if needed
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
        return response

    except Exception as e:
        print(f"❌ Retrieval or LLM failed: {e}")
        return "Sorry, I encountered an error processing your query."

# === Flask Routes ===
@app.route('/')
def home():
    return "Hello, I am the server"

@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    user_query = data.get("query", "")
    response = retrieve_and_respond(user_query)
    return jsonify(response)

if __name__ == '__main__':
    # Uncomment to rebuild indexes at server start
    preprocess_all_faiss()
    app.run(debug=True)
