export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number; // Store as number (Date.now()) for easier serialization
  avatar?: string; // Optional: URL or identifier for avatar
}
