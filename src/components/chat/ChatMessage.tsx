
"use client";

import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Bot, Pencil, Trash2, Download, Copy, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const ActionButton = ({
    onClick,
    icon: Icon,
    tooltipText,
    className,
  }: {
    onClick?: () => void;
    icon: React.ElementType;
    tooltipText: string;
    className?: string;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", className)}
            onClick={onClick}
          >
            <Icon size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div
      className={cn(
        'group/message flex items-end gap-2 my-1 py-1', // items-end to align actions with bottom of multi-line bubbles
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0 self-start mt-1"> {/* self-start for AI avatar */}
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Group bubble and actions for correct ordering */}
      <div className={cn("flex items-end gap-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            'max-w-[75%] shadow-md flex flex-col',
             isUser 
               ? 'bg-primary text-primary-foreground rounded-xl rounded-br-sm' 
               : 'bg-card text-card-foreground rounded-xl rounded-bl-sm'
          )}
        >
          <div className={cn("p-3 text-sm", isUser ? "text-primary-foreground" : "text-card-foreground" )}>
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
              'text-xs self-end px-3 pb-1.5 pt-0',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/90'
            )}
          >
            {format(new Date(message.timestamp), 'p')}
          </span>
        </div>

        {/* Direct Action Icons */}
        <div className="flex flex-col sm:flex-row items-center gap-0.5 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100 transition-opacity duration-200 mb-1">
          {isUser && (
            <>
              <ActionButton onClick={onEdit} icon={Pencil} tooltipText="Edit & Resend" />
              <ActionButton onClick={() => onCopyUserMessage(message.text)} icon={Copy} tooltipText="Copy" />
              <ActionButton onClick={onDelete} icon={Trash2} tooltipText="Delete" className="hover:text-destructive text-destructive/80" />
            </>
          )}
          {!isUser && (
            <>
              <ActionButton onClick={() => onCopyAIMessage(message.text)} icon={Copy} tooltipText="Copy" />
              <ActionButton onClick={onDownloadAIMessage} icon={Download} tooltipText="Download" />
              <ActionButton onClick={onRegenerateAIMessage} icon={RefreshCw} tooltipText="Regenerate" />
              <ActionButton onClick={onLikeAIMessage} icon={ThumbsUp} tooltipText="Like" />
              <ActionButton onClick={onDislikeAIMessage} icon={ThumbsDown} tooltipText="Dislike" />
            </>
          )}
        </div>
      </div>

      {isUser && (
         <Avatar className="h-8 w-8 flex-shrink-0 self-start mt-1"> {/* self-start for User avatar */}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
