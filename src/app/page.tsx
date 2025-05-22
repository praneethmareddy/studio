
'use client';

import { useState, useEffect, useMemo, useRef, useCallback }
from 'react';
import type { Message, Conversation } from '@/lib/types';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatLogo } from '@/components/icons/ChatLogo';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import { generateResponse } from '@/ai/flows/generate-response';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, Save, X, PanelLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail, 
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const CONVERSATIONS_STORAGE_KEY = 'deepReactConversations';

type AlertDialogState = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');

  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [editingConversationTitleText, setEditingConversationTitleText] = useState<string>('');
  
  const [alertDialogState, setAlertDialogState] = useState<AlertDialogState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Load conversations from localStorage on initial render
  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (storedConversations) {
        const loadedConversations: Conversation[] = JSON.parse(storedConversations);
        if (loadedConversations.length > 0) {
          const sorted = [...loadedConversations].sort((a, b) => b.timestamp - a.timestamp);
          setConversations(sorted);
          if (sorted.length > 0 && !activeConversationId) {
            setActiveConversationId(sorted[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load conversations from localStorage", error);
      toast({
        title: "Error",
        description: "Could not load chat history.",
        variant: "destructive",
      });
    }
  }, [toast]); 

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0 || localStorage.getItem(CONVERSATIONS_STORAGE_KEY)) {
      try {
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error("Failed to save conversations to localStorage", error);
        toast({
          title: "Error",
          description: "Could not save chat history.",
          variant: "destructive",
        });
      }
    }
  }, [conversations, toast]);

  const activeConversation = useMemo(() => {
    return conversations.find(conv => conv.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => b.timestamp - a.timestamp);
  }, [conversations]);

  const handleNewChat = () => {
    setEditingConversation(null); // Cancel any title edit
    setActiveConversationId(null); 
  };

  const handleSelectConversation = (conversationId: string) => {
    setEditingConversation(null); // Cancel any title edit
    setActiveConversationId(conversationId);
  };

  const handleSendMessage = async (text: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: Date.now(),
    };

    setIsLoading(true);
    let currentConversationId = activeConversationId;
    let updatedConversations = [...conversations];

    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
        timestamp: Date.now(),
        messages: [newUserMessage],
      };
      updatedConversations = [newConversation, ...updatedConversations];
      currentConversationId = newConversation.id;
      setActiveConversationId(newConversation.id);
    } else {
      updatedConversations = updatedConversations.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, newUserMessage], timestamp: Date.now() }
          : conv
      );
    }
    setConversations(updatedConversations.sort((a, b) => b.timestamp - a.timestamp));

    try {
      const conversationForAI = updatedConversations.find(c => c.id === currentConversationId);
      if (!conversationForAI) throw new Error("Active conversation not found");

      let contextSummary = "No previous conversation.";
      const messagesForSummary = conversationForAI.messages.slice(0, -1); 
      if (messagesForSummary.length > 0) {
        const historyToSummarize = messagesForSummary
          .map((msg) => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
          .join('\n');
        if (historyToSummarize) {
          const summaryResult = await summarizeChatHistory({ chatHistory: historyToSummarize });
          contextSummary = summaryResult.summary;
        }
      }

      const aiResponseResult = await generateResponse({
        prompt: text,
        contextSummary,
      });

      const newAiMessage: Message = {
        id: (Date.now() + 1).toString(), 
        text: aiResponseResult.response,
        sender: 'ai',
        timestamp: Date.now(),
      };

      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, newAiMessage], timestamp: Date.now() }
            : conv
        ).sort((a, b) => b.timestamp - a.timestamp)
      );

    } catch (error) {
      console.error('Error interacting with AI:', error);
      toast({
        title: "AI Error",
        description: "Sorry, I couldn't generate a response. Please try again.",
        variant: "destructive",
      });
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I encountered an error. Please try sending your message again.",
        sender: 'ai',
        timestamp: Date.now(),
      };
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorAiMessage], timestamp: Date.now() }
            : conv
        ).sort((a, b) => b.timestamp - a.timestamp)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Message CRUD ---
  const handleStartEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditingMessageText(message.text);
  };

  const handleSaveEditedMessage = () => {
    if (!editingMessage || !activeConversationId) return;
    setConversations(prev => prev.map(conv => 
      conv.id === activeConversationId 
        ? {
            ...conv,
            messages: conv.messages.map(msg => 
              msg.id === editingMessage.id 
                ? { ...msg, text: editingMessageText, timestamp: Date.now() } 
                : msg
            ),
          }
        : conv
    ));
    setEditingMessage(null);
    setEditingMessageText('');
    toast({ title: "Message updated" });
  };

  const handleCancelEditMessage = () => {
    setEditingMessage(null);
    setEditingMessageText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeConversationId) return;
    setAlertDialogState({
      isOpen: true,
      title: "Delete Message?",
      description: "Are you sure you want to delete this message? This action cannot be undone.",
      onConfirm: () => {
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: conv.messages.filter(msg => msg.id !== messageId),
              }
            : conv
        ));
        toast({ title: "Message deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- Conversation CRUD ---
  const handleStartEditConversationTitle = (conversation: Conversation) => {
    setEditingConversation(conversation);
    setEditingConversationTitleText(conversation.title);
    if (activeConversationId !== conversation.id) {
       setActiveConversationId(conversation.id);
    }
  };
  
  const handleSaveEditedConversationTitle = () => {
    if (!editingConversation) return;
    setConversations(prev => prev.map(conv => 
      conv.id === editingConversation.id 
        ? { ...conv, title: editingConversationTitleText, timestamp: Date.now() } 
        : conv
    ).sort((a, b) => b.timestamp - a.timestamp));
    setEditingConversation(null);
    setEditingConversationTitleText('');
    toast({ title: "Conversation title updated" });
  };

  const handleCancelEditConversationTitle = () => {
    setEditingConversation(null);
    setEditingConversationTitleText('');
  };

  const handleDeleteConversation = (conversationId: string) => {
     setAlertDialogState({
      isOpen: true,
      title: "Delete Conversation?",
      description: "Are you sure you want to delete this entire conversation? This action cannot be undone.",
      onConfirm: () => {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (activeConversationId === conversationId) {
          const remainingConversations = conversations.filter(c => c.id !== conversationId).sort((a,b) => b.timestamp - a.timestamp);
          setActiveConversationId(remainingConversations.length > 0 ? remainingConversations[0].id : null);
        }
        toast({ title: "Conversation deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const currentEditingMessage = useMemo(() => {
    if (!editingMessage || !activeConversation) return null;
    return activeConversation.messages.find(m => m.id === editingMessage.id) || null;
  }, [editingMessage, activeConversation]);


  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between border-b">
          <div className="flex items-center gap-2 p-2">
            <ChatLogo className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">Chats</h2>
          </div>
          <Button
            variant="ghost"
            onClick={handleNewChat}
            className="flex items-center text-primary hover:text-primary-foreground hover:bg-primary px-2 py-1.5 rounded-md group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
            title="New Chat"
          >
            <Plus size={20} className="flex-shrink-0" />
            <span className="ml-2 group-data-[collapsible=icon]:hidden">New Chat</span>
            <span className="sr-only group-data-[collapsible=expanded]:hidden">New Chat</span>
          </Button>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <ScrollArea className="h-full">
            {sortedConversations.length === 0 && (
              <div className="p-4 text-center text-muted-foreground group-data-[collapsible=icon]:hidden">
                No chats yet. Start a new one!
              </div>
            )}
            <SidebarMenu className="p-2">
              {sortedConversations.map(conv => (
                <SidebarMenuItem key={conv.id} className="group/conv-item">
                  {editingConversation?.id === conv.id ? (
                    <div className="flex items-center gap-2 p-1 w-full">
                      <Input 
                        type="text" 
                        value={editingConversationTitleText}
                        onChange={(e) => setEditingConversationTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditedConversationTitle();
                          if (e.key === 'Escape') handleCancelEditConversationTitle();
                        }}
                        className="h-8 flex-grow"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" onClick={handleSaveEditedConversationTitle} className="h-8 w-8 text-primary hover:text-primary/80"><Save size={16}/></Button>
                      <Button variant="ghost" size="icon" onClick={handleCancelEditConversationTitle} className="h-8 w-8 text-red-500 hover:text-red-400"><X size={16}/></Button>
                    </div>
                  ) : (
                    <SidebarMenuButton
                      isActive={conv.id === activeConversationId}
                      onClick={() => handleSelectConversation(conv.id)}
                      tooltip={{ children: conv.title, side: 'right', align: 'center' }}
                      className="justify-between w-full group-data-[collapsible=icon]:justify-center"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MessageSquare size={18} className="text-muted-foreground group-data-[collapsible=icon]:text-foreground flex-shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">{conv.title || 'New Chat'}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/conv-item:opacity-100 group-data-[collapsible=icon]:hidden focus:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()} side="right" align="start">
                          <DropdownMenuItem onClick={() => handleStartEditConversationTitle(conv)}>
                            <Pencil size={14} className="mr-2" /> Edit Title
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteConversation(conv.id)} className="text-red-500 hover:!text-red-500 focus:!text-red-500">
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarRail /> 
      <SidebarInset className="flex flex-col !p-0">
        <div className="flex flex-col h-screen bg-background text-foreground">
          <header className="flex items-center p-4 shadow-md">
            <SidebarTrigger className="mr-2" /> 
            <ChatLogo className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-semibold">DeepReact Chat</h1>
          </header>
          <Separator />
          <main className="flex-1 overflow-hidden">
             {currentEditingMessage && activeConversationId ? (
                <div className="p-4 border-t border-border bg-card">
                  <h3 className="text-sm font-semibold mb-2">Editing message:</h3>
                  <Textarea
                    value={editingMessageText}
                    onChange={(e) => setEditingMessageText(e.target.value)}
                    className="mb-2"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancelEditMessage} size="sm">Cancel</Button>
                    <Button onClick={handleSaveEditedMessage} size="sm">Save Changes</Button>
                  </div>
                </div>
              ) : (
                 <ChatHistory
                    messages={activeConversation?.messages || []}
                    onEditMessage={handleStartEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    activeConversationId={activeConversationId}
                 />
              )}
          </main>
          {!editingMessage && <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />}
        </div>
      </SidebarInset>

      {/* Alert Dialog for confirmations */}
      <AlertDialog open={alertDialogState.isOpen} onOpenChange={(isOpen) => setAlertDialogState(prev => ({...prev, isOpen}))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialogState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlertDialogState(prev => ({...prev, isOpen: false}))}>
              {alertDialogState.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={alertDialogState.onConfirm}>
              {alertDialogState.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
