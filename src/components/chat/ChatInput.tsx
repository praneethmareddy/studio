
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
    <form onSubmit={handleSubmit} className="relative flex items-start gap-2 p-4 border-t border-border bg-background">
      <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 resize-none bg-card border-input focus:ring-ring focus:ring-offset-0 pr-12" // Added padding for the button
        rows={1}
        disabled={isLoading}
        aria-label="Chat input"
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={isLoading || !inputValue.trim()} 
        className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-primary" // Positioned button
        variant="ghost"
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
