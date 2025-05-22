
"use client";

import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Bot, MoreHorizontal, Pencil, Trash2, Download, Copy, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ChatMessageProps {
  message: Message;
  onEdit: () => void;
  onDelete: () => void;
  onCopyUserMessage: (text: string) => void;
  onCopyAIMessage: (text: string) => void;
  onDownloadAIMessage: () => void;
  onRegenerateAIMessage: () => void;
  onLikeAIMessage: () => void;
  onDislikeAIMessage: () => void;
}

export function ChatMessage({
  message,
  onEdit,
  onDelete,
  onCopyUserMessage,
  onCopyAIMessage,
  onDownloadAIMessage,
  onRegenerateAIMessage,
  onLikeAIMessage,
  onDislikeAIMessage,
}: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const { toast } = useToast(); // Keep toast for potential direct use, though page.tsx might handle some

  const handleGenericCopy = async (textToCopy: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: successMessage,
        description: "The message has been copied.",
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div
      className={cn(
        'group/message flex items-start gap-3 my-2 py-1', // Added py-1 for a bit more vertical space for hover trigger
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Column 1: Avatar */}
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      {isUser && (
         <Avatar className="h-8 w-8 order-first"> {/* Avatar for User, comes first in reading order */}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Column 2: Message Content */}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3 shadow-md break-words',
           isUser ? 'bg-primary text-primary-foreground rounded-br-none order-2' : 'bg-card text-card-foreground rounded-bl-none' // user message bubble is order-2
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

      {/* Column 3: Actions Menu Trigger */}
      <div className={cn(
        "self-center ml-1 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100",
        isUser ? "order-last" : "" // User actions are order-last
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"> {/* Slightly larger trigger */}
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isUser ? "left" : "right"} align="center">
            {isUser && (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil size={14} className="mr-2" /> Edit & Resend
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCopyUserMessage(message.text)}>
                  <Copy size={14} className="mr-2" /> Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive hover:!text-destructive focus:!text-destructive focus-visible:!text-destructive">
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
            {!isUser && (
              <>
                <DropdownMenuItem onClick={() => onCopyAIMessage(message.text)}>
                  <Copy size={14} className="mr-2" /> Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadAIMessage}>
                  <Download size={14} className="mr-2" /> Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRegenerateAIMessage}>
                  <RefreshCw size={14} className="mr-2" /> Regenerate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLikeAIMessage}>
                  <ThumbsUp size={14} className="mr-2" /> Like
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDislikeAIMessage}>
                  <ThumbsDown size={14} className="mr-2" /> Dislike
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
