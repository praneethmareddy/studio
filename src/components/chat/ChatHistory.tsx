
"use client";

import type { Message } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react'; // For loading indicator
import { cn } from '@/lib/utils'; // Added missing import

interface ChatHistoryProps {
  messages: Message[];
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  activeConversationId: string | null;
  isLoading?: boolean; // Optional: to show loading state for AI response
}

export function ChatHistory({ messages, onEditMessage, onDeleteMessage, activeConversationId, isLoading }: ChatHistoryProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]); // Also scroll when loading changes


  if (!activeConversationId && messages.length === 0 && !isLoading) {
    // This state is usually handled by SampleQueries now, but kept as a fallback.
    // Or if SampleQueries are explicitly not shown.
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4">
        <p>Select a conversation or start a new one to begin chatting.</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
      <div className="p-4 space-y-1">
        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg}
            onEdit={() => onEditMessage(msg)}
            onDelete={() => onDeleteMessage(msg.id)}
          />
        ))}
        <div ref={messagesEndRef} />
        {messages.length === 0 && activeConversationId && !isLoading && (
          <div className="text-center text-muted-foreground py-10">
            Send a message to start this conversation!
          </div>
        )}
        {isLoading && messages.length > 0 && messages[messages.length-1].sender === 'user' && (
          <div className="flex justify-start items-center p-2">
             {/* Basic AI thinking indicator, similar to ChatMessage for AI */}
            <div className={cn('group/message flex items-start gap-3 my-2 justify-start')}>
              <div className="max-w-[70%] rounded-lg p-3 shadow-md bg-card text-card-foreground rounded-bl-none animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

    
