"use client";

import type { Message } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useEffect, useRef } from 'react';

interface ChatHistoryProps {
  messages: Message[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
      <div className="p-4 space-y-2">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            Start a conversation with DeepReact Chat!
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
