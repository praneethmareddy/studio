
"use client";

import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Bot, Pencil, Trash2, Download, Copy, RefreshCw, ThumbsUp, ThumbsDown, FileText, Cpu, Brain } from 'lucide-react';
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
  pre: ({node, ...props}: any) => <pre className="bg-black/20 dark:bg-white/10 p-3 my-2 rounded-md overflow-x-auto text-sm leading-relaxed" {...props} />,
  code({node, inline, className, children, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = Array.isArray(children) ? children.join('') : String(children);
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
  p: ({node, ...props}: any) => <p className="text-inherit mb-2 last:mb-0" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 text-inherit" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 text-inherit" {...props} />,
  li: ({node, ...props}: any) => <li className="mb-1 text-inherit" {...props} />,
  a: ({node, ...props}: any) => <a className="text-primary underline hover:text-primary/80" {...props} />,
  h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-2 text-inherit" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-2 text-inherit" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-semibold my-1.5 text-inherit" {...props} />,
};

const modelDisplayNames: { [key: string]: string } = {
  'llama3': 'Llama 3',
  'deepseek-r1': 'Deepseek-R1',
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
  const modelUsedLabel = !isUser && message.modelUsed ? modelDisplayNames[message.modelUsed] || message.modelUsed : '';

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
        'group/message flex items-end gap-2 my-1 py-1', 
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0 self-start mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {message.modelUsed === 'llama3' && <Cpu size={20} />}
            {message.modelUsed === 'deepseek-r1' && <Brain size={20} />}
            {(!message.modelUsed || (message.modelUsed !== 'llama3' && message.modelUsed !== 'deepseek-r1')) && <Bot size={20} />}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex items-end gap-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            'max-w-[75%] shadow-md flex flex-col transition-shadow duration-300 ease-in-out hover:shadow-xl',
             isUser 
               ? 'bg-primary text-primary-foreground rounded-lg rounded-br-none' 
               : 'bg-card text-card-foreground rounded-lg rounded-bl-none'
          )}
        >
          {message.file && (
             <div className={cn(
                "px-3 pt-2 pb-1", 
                isUser ? "text-primary-foreground/90" : "text-card-foreground/90",
              )}>
              <div className="flex items-center gap-2 text-xs">
                <FileText size={16} className={cn(isUser ? "text-primary-foreground/80" : "text-muted-foreground")} />
                <span className="truncate font-medium">{message.file.name}</span>
                <span className={cn("ml-auto", isUser ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
                  ({(message.file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}
          <div className={cn("p-3 text-sm", isUser ? "text-primary-foreground" : "text-card-foreground" )}>
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.text}</span>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.text}
              </ReactMarkdown>
            )}
          </div>
          <div className="flex items-center self-end px-3 pb-1.5 pt-0 text-xs">
            {!isUser && modelUsedLabel && (
              <span className="mr-2 opacity-75 text-muted-foreground/80">via {modelUsedLabel}</span>
            )}
            <span
              className={cn(
                isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/90'
              )}
            >
              {format(new Date(message.timestamp), 'p')}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-0.5 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100 transition-opacity duration-200 mb-1">
          {isUser && (
            <>
              <ActionButton onClick={() => onCopyUserMessage(message.text)} icon={Copy} tooltipText="Copy Text" />
              <ActionButton onClick={onEdit} icon={Pencil} tooltipText="Edit & Resend" />
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
         <Avatar className="h-8 w-8 flex-shrink-0 self-start mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

