
"use client";

import type { FormEvent, ChangeEvent } from 'react';
import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowUp, Loader2, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onSendMessage: (message: string, file?: File) => Promise<void>;
  isLoading: boolean;
  attachedFile: File | null;
  onFileAttach: (file: File) => void;
  onFileRemove: () => void;
}

export function ChatInput({
  value,
  onValueChange,
  onSendMessage,
  isLoading,
  attachedFile,
  onFileAttach,
  onFileRemove
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!value.trim() && !attachedFile) || isLoading) return;
    await onSendMessage(value.trim(), attachedFile || undefined);
    // Parent will clear the value and file
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.closest('form');
      if (form) {
        handleSubmit(new Event('submit', { cancelable: true, bubbles: true }) as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileAttach(file);
    }
    // Reset file input to allow selecting the same file again if removed and re-added
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col p-4 border-t border-border bg-background">
      {attachedFile && (
        <div className="mb-2 flex items-center justify-between p-2 border border-input rounded-md bg-card text-sm">
          <div className="flex items-center gap-2 truncate">
            <Paperclip size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-card-foreground truncate" title={attachedFile.name}>{attachedFile.name}</span>
            <span className="text-muted-foreground text-xs whitespace-nowrap">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onFileRemove}
            disabled={isLoading}
            aria-label="Remove attached file"
          >
            <X size={16} />
          </Button>
        </div>
      )}
      <div className="relative flex items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 p-0 text-muted-foreground hover:text-primary flex-shrink-0 mt-0.5"
          onClick={handleFileButtonClick}
          disabled={isLoading}
          aria-label="Attach file"
        >
          <Paperclip size={20} />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        <Textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachedFile ? "Add an optional message..." : "Type your message or attach a file..."}
          className="flex-1 resize-none bg-card border-input focus:ring-ring focus:ring-offset-0 pr-12"
          rows={1}
          disabled={isLoading}
          aria-label="Chat input"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || (!value.trim() && !attachedFile)}
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-primary",
            !isLoading && (value.trim() || attachedFile) && "hover:animate-shadow-pulse"
            )}
          variant="ghost"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp size={18} />}
        </Button>
      </div>
    </form>
  );
}
