
"use client";

import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, Bot, MoreHorizontal, Pencil, Trash2, Download, Copy } from 'lucide-react'; // Added Download, Copy
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast"; // Added useToast

interface ChatMessageProps {
  message: Message;
  onEdit: () => void;
  onDelete: () => void;
}

export function ChatMessage({ message, onEdit, onDelete }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      toast({
        title: "Copied to clipboard!",
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

  const handleDownload = () => {
    const blob = new Blob([message.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai_response_${message.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    // Optional: Toast for download start/success, though browser usually indicates this.
    // toast({
    //   title: "Download started",
    //   description: "Your file is being downloaded.",
    //   duration: 3000,
    // });
  };

  return (
    <div
      className={cn(
        'group/message flex items-start gap-3 my-2', 
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Column 1: Avatar for AI, Actions for User */}
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      
      {isUser && (
        <div className="self-center order-first mr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/message:opacity-100 focus:opacity-100">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left" align="center">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-500 hover:!text-red-500 focus:!text-red-500">
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Column 2: Message Content */}
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3 shadow-md break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card text-card-foreground rounded-bl-none'
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

      {/* Column 3: Avatar for User, Actions for AI */}
      {isUser && (
        <Avatar className="h-8 w-8 order-last ml-0"> {/* Ensure order-last and reset ml if any */}
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}

      {!isUser && (
        <div className="self-center ml-1 opacity-0 group-hover/message:opacity-100 focus-within:opacity-100">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="center">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy size={14} className="mr-2" /> Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download size={14} className="mr-2" /> Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
