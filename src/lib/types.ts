
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number; // Store as number (Date.now()) for easier serialization
  avatar?: string; // Optional: URL or identifier for avatar
  modelUsed?: string; // Optional: Identifier for the AI model used (e.g., 'llama3', 'deepseek-r1')
  file?: { // For user-uploaded files or files mentioned by AI
    name: string;
    type: string;
    size: number;
  };
  downloadableFile?: { // For files AI provides FOR download
    name: string;
    type: string;
    blobUrl: string; // Object URL created from the blob
  };
  // Fields for CIQ Standardization Workflow
  isStandardizationRequest?: boolean;
  standardizationRequestId?: string;
  unmatchedColumns?: string[];
  similarityMapping?: Record<string, string>;
  isStandardizationConfirmed?: boolean; // To track if user has responded to the confirmation
}

export interface Conversation {
  id: string;
  title: string; // e.g., first user message summary
  timestamp: number; // Last activity timestamp for sorting
  messages: Message[];
}
