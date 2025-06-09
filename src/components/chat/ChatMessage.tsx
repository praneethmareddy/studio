
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

  const handleFileDownload = () => {
    if (message.downloadableFile?.blobUrl && message.downloadableFile?.name) {
      const link = document.createElement('a');
      link.href = message.downloadableFile.blobUrl;
      link.download = message.downloadableFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // URL.revokeObjectURL(message.downloadableFile.blobUrl); // Consider revoking later or on component unmount
    }
  };

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
            'max-w-[75%] rounded-lg flex flex-col transition-shadow duration-300 ease-in-out hover:shadow-xl shadow-md',
             isUser 
               ? 'bg-primary text-primary-foreground rounded-br-none' 
               : 'bg-card text-card-foreground rounded-bl-none'
          )}
        >
          {message.file && (
             <div className={cn(
                "px-3 pt-3 pb-1.5", 
                isUser ? "text-primary-foreground/90" : "text-card-foreground/90",
              )}>
              <div className="flex items-center gap-2 text-xs">
                <FileText size={16} className={cn(isUser ? "text-primary-foreground/80" : "text-muted-foreground")} />
                <span className="truncate font-medium">{message.file.name}</span>
                <span className={cn("ml-auto text-xs", isUser ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
                  ({(message.file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          {((message.file && message.text && message.text.trim() !== '') || (message.file && message.isStandardizationRequest)) && (
            <hr className={cn(
              "mx-3 my-1.5 border-t", 
              isUser ? "border-primary-foreground/30" : "border-card-foreground/20"
            )} />
          )}
          
          {message.text && message.text.trim() !== '' && (
            <div className={cn("px-3 py-2 text-sm", isUser ? "text-primary-foreground" : "text-card-foreground" )}>
              {isUser ? (
                <span className="whitespace-pre-wrap">{message.text}</span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {message.text}
                </ReactMarkdown>
              )}
            </div>
          )}

          {/* Standardization Confirmation UI */}
          {!isUser && message.isStandardizationRequest && !message.isStandardizationConfirmed && (
            <Card className="m-2 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center">
                  <AlertTriangle size={16} className="mr-2 text-primary/80" />
                  Template Update
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs px-3 pb-2 pt-0">
                {message.unmatchedColumns && message.unmatchedColumns.length > 0 && (
                  <div className="mb-2">
                    <p className="font-semibold mb-1">Unmatched columns found:</p>
                    <ul className="list-disc list-inside pl-2 max-h-20 overflow-y-auto bg-background/30 p-1 rounded">
                      {message.unmatchedColumns.map(col => <li key={col}>{col}</li>)}
                    </ul>
                  </div>
                )}
                {message.similarityMapping && Object.keys(message.similarityMapping).length > 0 && (
                  <div className="mb-2">
                    <p className="font-semibold mb-1">Suggested Mappings:</p>
                     <ul className="list-none pl-2 max-h-20 overflow-y-auto bg-background/30 p-1 rounded">
                      {Object.entries(message.similarityMapping).map(([key, value]) => (
                        <li key={key}>{key} → {value || <span className="italic text-muted-foreground">No match</span>}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mb-2">Do you want to update the standard CIQ template with these columns?</p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 px-3 pb-3 pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => message.standardizationRequestId && onConfirmStandardization(message.id, message.standardizationRequestId, 'no')}
                >
                  No
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => message.standardizationRequestId && onConfirmStandardization(message.id, message.standardizationRequestId, 'yes')}
                >
                  Yes, Update
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Downloadable File Button */}
          {message.downloadableFile && !isUser && (
             <div className={cn("px-3 pb-2", message.isStandardizationRequest && !message.isStandardizationConfirmed ? "pt-0" : "pt-1")}>
               { (message.text && message.text.trim() !== '') && !message.isStandardizationRequest && // Only show hr if there's text and it's not part of standardization card
                 <hr className={cn( "my-2 border-t", "border-card-foreground/20")} />
               }
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileDownload}
                className="w-full text-card-foreground hover:bg-accent/80"
              >
                <Download size={14} className="mr-2" />
                Download {message.downloadableFile.name}
              </Button>
            </div>
          )}

          {(message.timestamp || (!isUser && modelUsedLabel)) && (
            <div className="flex items-center self-end px-3 pb-1.5 pt-0 text-[11px] leading-tight opacity-80">
              {!isUser && modelUsedLabel && (
                <span className="mr-2">via {modelUsedLabel}</span>
              )}
              {message.timestamp && (
                <span className={cn(isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/90')}>
                  {format(new Date(message.timestamp), 'p')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-0.5 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100 transition-opacity duration-200 mb-1 self-center">
          {isUser && (
            <>
              <ActionButton onClick={() => onCopyUserMessage(message.text)} icon={Copy} tooltipText="Copy Text" />
              <ActionButton onClick={onEdit} icon={Pencil} tooltipText="Edit & Resend" />
              <ActionButton onClick={onDelete} icon={Trash2} tooltipText="Delete" className="hover:text-destructive text-destructive/80" />
            </>
          )}
          {!isUser && !message.isStandardizationRequest && ( // Standard actions for non-standardization AI messages
            <>
              <ActionButton onClick={() => onCopyAIMessage(message.text)} icon={Copy} tooltipText="Copy" />
              {!message.downloadableFile && <ActionButton onClick={onDownloadAIMessage} icon={Download} tooltipText="Download Text" />}
              <ActionButton onClick={onRegenerateAIMessage} icon={RefreshCw} tooltipText="Regenerate" />
              <ActionButton onClick={onLikeAIMessage} icon={ThumbsUp} tooltipText="Like" />
              <ActionButton onClick={onDislikeAIMessage} icon={ThumbsDown} tooltipText="Dislike" />
            </>
          )}
           {!isUser && message.isStandardizationRequest && ( // Specific actions for standardization AI messages
             <>
                <ActionButton onClick={() => onCopyAIMessage(message.text)} icon={Copy} tooltipText="Copy Info Text" /> 
                {/* Download button is now part of the message body or standardization card */}
                {/* Regenerate might be complex for standardization, consider disabling or specific handling */}
                {/* <ActionButton onClick={onRegenerateAIMessage} icon={RefreshCw} tooltipText="Regenerate" />  */}
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
