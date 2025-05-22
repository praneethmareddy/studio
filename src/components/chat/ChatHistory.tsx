
"use client";

import type { Message } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useEffect, useRef } from 'react';

interface ChatHistoryProps {
  messages: Message[];
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  activeConversationId: string | null;
}

export function ChatHistory({ messages, onEditMessage, onDeleteMessage, activeConversationId }: ChatHistoryProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
    // Fallback for initial load or when smooth scroll isn't enough
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);


  if (!activeConversationId && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a conversation or start a new one.</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
      <div className="p-4 space-y-1"> {/* Reduced space-y for tighter packing */}
        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg}
            onEdit={() => onEditMessage(msg)}
            onDelete={() => onDeleteMessage(msg.id)}
          />
        ))}
        <div ref={messagesEndRef} />
        {messages.length === 0 && activeConversationId && (
          <div className="text-center text-muted-foreground py-10">
            Send a message to start this conversation!
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
