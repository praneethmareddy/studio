
"use client";

import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Bot, Pencil, Trash2, Download, Copy, RefreshCw, ThumbsUp, ThumbsDown, FileText, Cpu, Brain, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

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
  onConfirmStandardization: (messageId: string, requestId: string, decision: 'yes' | 'no') => void;
}

const markdownComponents = {
  pre: ({node, ...props}: any) => <pre className="bg-black/20 dark:bg-white/10 p-2 my-1.5 rounded-md overflow-x-auto text-xs leading-relaxed" {...props} />,
  code({node, inline, className, children, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = Array.isArray(children) ? children.join('') : String(children);
    return !inline ? ( 
      <code className={cn(className, "font-mono")} {...props}>
        {codeString}
      </code>
    ) : ( 
      <code className={cn(className, "bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs font-mono")} {...props}>
        {children}
      </code>
    );
  },
  p: ({node, ...props}: any) => <p className="text-inherit mb-1.5 last:mb-0" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-1.5 text-inherit" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-1.5 text-inherit" {...props} />,
  li: ({node, ...props}: any) => <li className="mb-0.5 text-inherit" {...props} />,
  a: ({node, ...props}: any) => <a className="text-primary underline hover:text-primary/80" {...props} />,
  h1: ({node, ...props}: any) => <h1 className="text-xl font-bold my-1.5 text-inherit" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-lg font-semibold my-1.5 text-inherit" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-base font-semibold my-1 text-inherit" {...props} />,
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
  onConfirmStandardization,
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
            className={cn("h-6 w-6 text-muted-foreground hover:text-foreground", className)}
            onClick={onClick}
          >
            <Icon size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const handleFileDownload = () => {
    if (message.downloadableFile?.blobUrl && message.downloadableFile?.name) {
      const link = document.createElement('a');
      link.href = message.downloadableFile.blobUrl;
      link.download = message.downloadableFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      className={cn(
        'group/message flex items-end gap-1.5 my-1 py-1', 
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-7 w-7 flex-shrink-0 self-start mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {message.modelUsed === 'llama3' && <Cpu size={18} />}
            {message.modelUsed === 'deepseek-r1' && <Brain size={18} />}
            {(!message.modelUsed || (message.modelUsed !== 'llama3' && message.modelUsed !== 'deepseek-r1')) && <Bot size={18} />}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex items-end gap-1", isUser ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            'max-w-[75%] rounded-lg flex flex-col transition-shadow duration-300 ease-in-out hover:shadow-lg shadow-sm', // Reduced shadow
             isUser 
               ? 'bg-primary text-primary-foreground rounded-br-none' 
               : 'bg-card text-card-foreground rounded-bl-none'
          )}
        >
          {message.file && (
             <div className={cn(
                "px-2.5 pt-2 pb-1", 
                isUser ? "text-primary-foreground/90" : "text-card-foreground/90",
              )}>
              <div className="flex items-center gap-1.5 text-xs">
                <FileText size={14} className={cn(isUser ? "text-primary-foreground/80" : "text-muted-foreground")} />
                <span className="truncate font-medium">{message.file.name}</span>
                <span className={cn("ml-auto text-[10px]", isUser ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
                  ({(message.file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          {((message.file && message.text && message.text.trim() !== '') || (message.file && message.isStandardizationRequest)) && (
            <hr className={cn(
              "mx-2.5 my-1 border-t", 
              isUser ? "border-primary-foreground/30" : "border-card-foreground/20"
            )} />
          )}
          
          {message.text && message.text.trim() !== '' && (
            <div className={cn("px-2.5 py-1.5 text-sm", isUser ? "text-primary-foreground" : "text-card-foreground" )}>
              {isUser ? (
                <span className="whitespace-pre-wrap">{message.text}</span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {message.text}
                </ReactMarkdown>
              )}
            </div>
          )}

          {!isUser && message.isStandardizationRequest && !message.isStandardizationConfirmed && message.unmatchedColumns && message.unmatchedColumns.length > 0 && (
            <Card className="m-1.5 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10">
              <CardHeader className="pb-1.5 pt-2 px-2.5">
                <CardTitle className="text-xs flex items-center">
                  <AlertTriangle size={14} className="mr-1.5 text-primary/80" />
                  Template Update
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] px-2.5 pb-1.5 pt-0">
                {message.unmatchedColumns && message.unmatchedColumns.length > 0 && (
                  <div className="mb-1.5">
                    <p className="font-semibold mb-0.5">Unmatched columns found:</p>
                    <ul className="list-disc list-inside pl-1.5 max-h-16 overflow-y-auto bg-background/30 p-1 rounded text-[10px]">
                      {message.unmatchedColumns.map(col => <li key={col}>{col}</li>)}
                    </ul>
                  </div>
                )}
                {message.similarityMapping && Object.keys(message.similarityMapping).length > 0 && (
                  <div className="mb-1.5">
                    <p className="font-semibold mb-0.5">Suggested Mappings:</p>
                     <ul className="list-none pl-1.5 max-h-16 overflow-y-auto bg-background/30 p-1 rounded text-[10px]">
                      {Object.entries(message.similarityMapping).map(([key, value]) => (
                        <li key={key}>{key} → {value || <span className="italic text-muted-foreground">No match</span>}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mb-1.5">Do you want to update the standard CIQ template with these columns?</p>
              </CardContent>
              <CardFooter className="flex justify-end gap-1.5 px-2.5 pb-2 pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => message.standardizationRequestId && onConfirmStandardization(message.id, message.standardizationRequestId, 'no')}
                  className="h-7 px-2 text-xs"
                >
                  No
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => message.standardizationRequestId && onConfirmStandardization(message.id, message.standardizationRequestId, 'yes')}
                  className="h-7 px-2 text-xs"
                >
                  Yes, Update
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {message.downloadableFile && !isUser && (
             <div className={cn("px-2.5 pb-1.5", message.isStandardizationRequest && !message.isStandardizationConfirmed && message.unmatchedColumns && message.unmatchedColumns.length > 0 ? "pt-0" : "pt-1")}>
               { (message.text && message.text.trim() !== '') && !message.isStandardizationRequest && 
                 <hr className={cn( "my-1.5 border-t", "border-card-foreground/20")} />
               }
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileDownload}
                className="w-full text-card-foreground hover:bg-accent/80 h-8 text-xs"
              >
                <Download size={14} className="mr-1.5" />
                Download {message.downloadableFile.name}
              </Button>
            </div>
          )}

          {(message.timestamp || (!isUser && modelUsedLabel)) && (
            <div className="flex items-center self-end px-2.5 pb-1 pt-0 text-[10px] leading-tight opacity-80">
              {!isUser && modelUsedLabel && (
                <span className="mr-1.5">via {modelUsedLabel}</span>
              )}
              {message.timestamp && (
                <span className={cn(isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/90')}>
                  {format(new Date(message.timestamp), 'p')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-0.5 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100 transition-opacity duration-200 mb-0.5 self-center">
          {isUser && (
            <>
              <ActionButton onClick={() => onCopyUserMessage(message.text)} icon={Copy} tooltipText="Copy Text" />
              <ActionButton onClick={onEdit} icon={Pencil} tooltipText="Edit & Resend" />
              <ActionButton onClick={onDelete} icon={Trash2} tooltipText="Delete" className="hover:text-destructive text-destructive/80" />
            </>
          )}
          {!isUser && !message.isStandardizationRequest && ( 
            <>
              <ActionButton onClick={() => onCopyAIMessage(message.text)} icon={Copy} tooltipText="Copy" />
              {!message.downloadableFile && <ActionButton onClick={onDownloadAIMessage} icon={Download} tooltipText="Download Text" />}
              <ActionButton onClick={onRegenerateAIMessage} icon={RefreshCw} tooltipText="Regenerate" />
              <ActionButton onClick={onLikeAIMessage} icon={ThumbsUp} tooltipText="Like" />
              <ActionButton onClick={onDislikeAIMessage} icon={ThumbsDown} tooltipText="Dislike" />
            </>
          )}
           {!isUser && message.isStandardizationRequest && ( 
             <>
                <ActionButton onClick={() => onCopyAIMessage(message.text)} icon={Copy} tooltipText="Copy Info Text" /> 
                <ActionButton onClick={onLikeAIMessage} icon={ThumbsUp} tooltipText="Like" />
                <ActionButton onClick={onDislikeAIMessage} icon={ThumbsDown} tooltipText="Dislike" />
             </>
           )}
        </div>
      </div>

      {isUser && (
         <Avatar className="h-7 w-7 flex-shrink-0 self-start mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
