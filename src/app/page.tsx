'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message } from '@/lib/types';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatLogo } from '@/components/icons/ChatLogo';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import { generateResponse } from '@/ai/flows/generate-response';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

const LOCAL_STORAGE_KEY = 'deepReactChatHistory';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load chat history from localStorage on initial render
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (error) {
      console.error("Failed to load messages from localStorage", error);
      toast({
        title: "Error",
        description: "Could not load previous chat history.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to localStorage", error);
       toast({
        title: "Error",
        description: "Could not save chat history.",
        variant: "destructive",
      });
    }
  }, [messages, toast]);

  const handleSendMessage = async (text: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      // Prepare chat history for summarization
      const historyToSummarize = messages
        .map((msg) => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
        .join('\n');
      
      let contextSummary = "No previous conversation.";
      if (historyToSummarize) {
        const summaryResult = await summarizeChatHistory({ chatHistory: historyToSummarize });
        contextSummary = summaryResult.summary;
      }

      // Generate AI response
      const aiResponseResult = await generateResponse({
        prompt: text,
        contextSummary,
      });

      const newAiMessage: Message = {
        id: (Date.now() + 1).toString(), // Ensure unique ID
        text: aiResponseResult.response,
        sender: 'ai',
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, newAiMessage]);
    } catch (error) {
      console.error('Error interacting with AI:', error);
      toast({
        title: "AI Error",
        description: "Sorry, I couldn't generate a response. Please try again.",
        variant: "destructive",
      });
      // Optionally, remove the user's message if AI fails or add an error message from AI
       const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I encountered an error. Please try sending your message again.",
        sender: 'ai',
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center p-4 shadow-md">
        <ChatLogo className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-xl font-semibold">DeepReact Chat</h1>
      </header>
      <Separator />
      <main className="flex-1 overflow-hidden">
        <ChatHistory messages={messages} />
      </main>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
