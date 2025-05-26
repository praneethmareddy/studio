
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number; // Store as number (Date.now()) for easier serialization
  avatar?: string; // Optional: URL or identifier for avatar
  modelUsed?: string; // Optional: Identifier for the AI model used (e.g., 'llama3', 'deepseek-r1')
  file?: { // To store basic info about an attached file
    name: string;
    type: string;
    size: number;
  };
}

export interface Conversation {
  id: string;
  title: string; // e.g., first user message summary
  timestamp: number; // Last activity timestamp for sorting
  messages: Message[];
}
