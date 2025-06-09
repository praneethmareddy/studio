
"use client";

import type { Message } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Cpu, Brain } from 'lucide-react'; 
import { cn } from '@/lib/utils';

interface ChatHistoryProps {
  messages: Message[];
  onEditMessage: (message: Message) => void;
  onDeleteMessage: (messageId: string) => void;
  onCopyUserMessage: (text: string) => void;
  onCopyAIMessage: (text: string) => void;
  onDownloadAIMessage: (messageId: string) => void;
  onRegenerateAIMessage: (messageId: string) => void;
  onLikeAIMessage: (messageId: string) => void;
  onDislikeAIMessage: (messageId: string) => void;
  activeConversationId: string | null;
  isLoading?: boolean;
  selectedModel: string;
}

export function ChatHistory({ 
  messages, 
  onEditMessage, 
  onDeleteMessage,
  onCopyUserMessage,
  onCopyAIMessage,
  onDownloadAIMessage,
  onRegenerateAIMessage,
  onLikeAIMessage,
  onDislikeAIMessage,
  activeConversationId, 
  isLoading,
  selectedModel
}: ChatHistoryProps) {
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
  }, [messages, isLoading]);


  if (!activeConversationId && messages.length === 0 && !isLoading) {
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
            onCopyUserMessage={onCopyUserMessage}
            onCopyAIMessage={(text) => onCopyAIMessage(text)} 
            onDownloadAIMessage={() => onDownloadAIMessage(msg.id)}
            onRegenerateAIMessage={() => onRegenerateAIMessage(msg.id)}
            onLikeAIMessage={() => onLikeAIMessage(msg.id)}
            onDislikeAIMessage={() => onDislikeAIMessage(msg.id)}
          />
        ))}
        <div ref={messagesEndRef} />
        {messages.length === 0 && activeConversationId && !isLoading && (
          <div className="text-center text-muted-foreground py-10">
            Send a message to start this conversation!
          </div>
        )}
        {isLoading && messages.length > 0 && messages[messages.length-1].sender === 'user' && (
          <div className={cn('group/message flex items-start gap-3 my-2 justify-start pl-2 py-1')}>
             <Avatar className="h-8 w-8 flex-shrink-0 self-center">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {selectedModel === 'llama3' && <Cpu size={20} />}
                {selectedModel === 'deepseek-r1' && <Brain size={20} />}
                {(!selectedModel || (selectedModel !== 'llama3' && selectedModel !== 'deepseek-r1')) && <Bot size={20} />}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center space-x-1 bg-card text-card-foreground p-3 rounded-lg shadow-md rounded-bl-none">
              <span className="h-2 w-2 bg-current rounded-full animate-dot-pulse [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 bg-current rounded-full animate-dot-pulse [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 bg-current rounded-full animate-dot-pulse"></span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

