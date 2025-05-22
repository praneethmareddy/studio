
"use client";

import type { FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  value: string; // Now a controlled component prop
  onValueChange: (value: string) => void; // Callback to update value in parent
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({ value, onValueChange, onSendMessage, isLoading }: ChatInputProps) {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    await onSendMessage(value.trim());
    // Parent will clear the value: onValueChange('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Create a synthetic form event or directly call submit logic
      const form = event.currentTarget.closest('form');
      if (form) {
        handleSubmit(new Event('submit', { cancelable: true, bubbles: true }) as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-start gap-2 p-4 border-t border-border bg-background">
      <Textarea
        value={value} // Use controlled value
        onChange={(e) => onValueChange(e.target.value)} // Call parent's handler
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        className="flex-1 resize-none bg-card border-input focus:ring-ring focus:ring-offset-0 pr-12" 
        rows={1}
        disabled={isLoading}
        aria-label="Chat input"
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={isLoading || !value.trim()} 
        className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-primary"
        variant="ghost"
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}

    