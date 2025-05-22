
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const markdownComponents = {
  pre: ({node, ...props}) => <pre className="bg-black/20 dark:bg-white/10 p-3 my-2 rounded-md overflow-x-auto text-sm leading-relaxed" {...props} />,
  code({node, inline, className, children, ...props}) {
    const match = /language-(\w+)/.exec(className || '');
    // For code blocks, children will be an array if there are newlines. Join them.
    const codeString = Array.isArray(children) ? children.join('') : children;
    return !inline ? ( 
      <code className={cn(className, "font-mono")} {...props}>
        {codeString}
      </code>
    ) : ( 
      <code className={cn(className, "bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-sm font-mono")} {...props}>
        {children}
      </code>
    );
  },
  p: ({node, ...props}) => <p className="text-inherit mb-2 last:mb-0" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 text-inherit" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 text-inherit" {...props} />,
  li: ({node, ...props}) => <li className="mb-1 text-inherit" {...props} />,
  a: ({node, ...props}) => <a className="text-primary underline hover:text-primary/80" {...props} />,
  h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-2 text-inherit" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-xl font-semibold my-2 text-inherit" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-lg font-semibold my-1.5 text-inherit" {...props} />,
};


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

  return (
    <div
      className={cn(
        'group/message flex items-start gap-3 my-2 py-1', 
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          'max-w-[75%] shadow-md flex flex-col', // Use flex-col to stack message and timestamp
           isUser 
             ? 'bg-primary text-primary-foreground rounded-xl rounded-br-sm order-2' 
             : 'bg-card text-card-foreground rounded-xl rounded-bl-sm'
        )}
      >
        <div className={cn("p-3 text-sm", isUser ? "text-primary-foreground" : "text-card-foreground", {"whitespace-pre-wrap": !isUser} )}> {/* Conditional whitespace for AI */}
          {isUser ? (
            message.text
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.text}
            </ReactMarkdown>
          )}
        </div>
        <span
          className={cn(
            'text-xs self-end px-3 pb-1.5 pt-0', // Position timestamp at bottom-right
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/90'
          )}
        >
          {format(new Date(message.timestamp), 'p')}
        </span>
      </div>

      {isUser && (
         <Avatar className="h-8 w-8 order-1 flex-shrink-0"> 
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "self-center ml-1 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100 flex-shrink-0",
        isUser ? "order-last" : "" 
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"> 
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
