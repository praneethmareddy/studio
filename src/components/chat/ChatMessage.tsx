"use client";

import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  return (
    <div
      className={cn(
        'flex items-start gap-3 my-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3 shadow-md',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground rounded-bl-none'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p
          className={cn(
            'text-xs mt-1',
            isUser ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground text-left'
          )}
        >
          {format(new Date(message.timestamp), 'p')}
        </p>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
