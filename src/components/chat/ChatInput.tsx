"use client";

import { useState, type FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    await onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2 p-4 border-t border-border bg-background">
      <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 resize-none bg-card border-input focus:ring-ring focus:ring-offset-0"
        rows={1}
        disabled={isLoading}
        aria-label="Chat input"
      />
      <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} className="h-auto aspect-square p-2.5">
        {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
