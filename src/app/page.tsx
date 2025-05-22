
'use client';

import { useState, useEffect, useMemo, useRef, useCallback }
from 'react';
import type { Message, Conversation } from '@/lib/types';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatLogo } from '@/components/icons/ChatLogo';
// import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history'; // Commented out for echo response
// import { generateResponse } from '@/ai/flows/generate-response'; // Commented out for echo response
import { SampleQueries } from '@/components/sample-queries/SampleQueries';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SquarePen, MessageSquare, MoreHorizontal, Pencil, Trash2, Save, X, PanelLeft, ArrowUp } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { isToday, isYesterday, subDays, format, differenceInDays } from 'date-fns';

const CONVERSATIONS_STORAGE_KEY = 'deepReactConversations';

const sampleQueriesList = [
  "What's the weather like today?",
  "Explain quantum computing in simple terms.",
  "Suggest a good recipe for pasta.",
  "Tell me a fun fact about space.",
];

type AlertDialogState = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
};

interface GroupedConversations {
  [groupTitle: string]: Conversation[];
}

const groupConversations = (conversations: Conversation[]): GroupedConversations => {
  const finalGroups: GroupedConversations = {};
  const now = new Date();

  // Sort conversations by timestamp descending before grouping
  const sortedConversations = [...conversations].sort((a, b) => b.timestamp - a.timestamp);

  sortedConversations.forEach(conv => {
    const convDate = new Date(conv.timestamp);
    let groupKey = '';

    if (isToday(convDate)) {
      groupKey = 'Today';
    } else if (isYesterday(convDate)) {
      groupKey = 'Yesterday';
    } else if (differenceInDays(now, convDate) < 7) {
      groupKey = 'Previous 7 Days';
    } else if (differenceInDays(now, convDate) < 30) {
      groupKey = 'Previous 30 Days';
    } else {
      groupKey = format(convDate, 'MMMM yyyy'); // e.g., April 2024
    }
    
    if (!finalGroups[groupKey]) {
      finalGroups[groupKey] = [];
    }
    // Since conversations are already sorted, pushing them maintains order within the group
    finalGroups[groupKey].push(conv); 
  });
  return finalGroups;
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
  
  const [chatInputValue, setChatInputValue] = useState('');

  const [alertDialogState, setAlertDialogState] = useState<AlertDialogState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (storedConversations) {
        const loadedConversations: Conversation[] = JSON.parse(storedConversations);
        if (loadedConversations.length > 0) {
          setConversations(loadedConversations); 
          if (!activeConversationId && loadedConversations.length > 0) {
            const mostRecent = [...loadedConversations].sort((a,b) => b.timestamp - a.timestamp)[0];
             setActiveConversationId(mostRecent.id);
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

  const groupedAndSortedConversations = useMemo(() => {
    const grouped = groupConversations(conversations);
    const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];
    
    const orderedGroups: { title: string; conversations: Conversation[] }[] = [];

    groupOrder.forEach(key => {
      if (grouped[key] && grouped[key].length > 0) {
        orderedGroups.push({ title: key, conversations: grouped[key] });
      }
    });

    const monthlyGroupKeys = Object.keys(grouped)
      .filter(key => !groupOrder.includes(key))
      .sort((a, b) => {
        const dateA = new Date(`01 ${a}`); 
        const dateB = new Date(`01 ${b}`);
        return dateB.getTime() - dateA.getTime();
      });

    monthlyGroupKeys.forEach(key => {
      if (grouped[key] && grouped[key].length > 0) {
        orderedGroups.push({ title: key, conversations: grouped[key] });
      }
    });
    
    return orderedGroups;
  }, [conversations]);


  const handleNewChat = () => {
    setEditingConversation(null); 
    setActiveConversationId(null); 
    setChatInputValue('');
    setEditingMessage(null); 
  };

  const handleSelectConversation = (conversationId: string) => {
    setEditingConversation(null); 
    setActiveConversationId(conversationId);
    setChatInputValue('');
    setEditingMessage(null); 
  };

  const handleSampleQueryClick = (query: string) => {
    setChatInputValue(query);
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

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
        title: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
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
    setConversations(updatedConversations); 
    setChatInputValue('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      // Echo response for testing
      const newAiMessage: Message = {
        id: (Date.now() + 1).toString(), // Ensure unique ID
        text: `Echo: ${text}\n\nThis is a **bold** and *italic* example.\n\`\`\`javascript\nconsole.log("Hello from AI!");\n\`\`\`\n- Item 1\n- Item 2`, // Example markdown
        sender: 'ai',
        timestamp: Date.now(),
      };

      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, newAiMessage], timestamp: Date.now() }
            : conv
        )
      );
    } catch (error) {
      console.error('Error generating echo response:', error);
      toast({
        title: "Echo Error",
        description: "Sorry, I couldn't generate an echo response.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, conversations, toast]);

  const handleStartEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditingMessageText(message.text);
  };

  const handleSaveEditedMessage = async () => {
    if (!editingMessage || !activeConversationId || !editingMessageText.trim()) return;
  
    setConversations(prev => {
      return prev.map(conv => {
        if (conv.id === activeConversationId) {
          const messageIndex = conv.messages.findIndex(msg => msg.id === editingMessage.id);
          if (messageIndex === -1) return conv; 
  
          const messagesUpToEdit = conv.messages.slice(0, messageIndex);
          return {
            ...conv,
            messages: messagesUpToEdit, 
            timestamp: Date.now(), 
          };
        }
        return conv;
      });
    });
  
    await new Promise(resolve => setTimeout(resolve, 0)); 
    await handleSendMessage(editingMessageText.trim()); 
  
    setEditingMessage(null);
    setEditingMessageText('');
    toast({ title: "Message edited and resent" });
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
                 timestamp: Date.now() 
              }
            : conv
        ));
        toast({ title: "Message deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCopyUserMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "User message copied!",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleCopyAIMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "AI response copied!",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleDownloadAIMessage = (messageId: string) => {
    const conversation = conversations.find(c => c.id === activeConversationId);
    const message = conversation?.messages.find(m => m.id === messageId && m.sender === 'ai');
    if (message) {
      const blob = new Blob([message.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai_response_${message.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      toast({ title: "Error", description: "Could not find message to download.", variant: "destructive" });
    }
  };

  const handleRegenerateAIMessage = (messageId: string) => {
    if (!activeConversationId) return;
  
    let userPromptForAIMessage = "";
  
    setConversations(prev => {
      return prev.map(conv => {
        if (conv.id === activeConversationId) {
          const aiMessageIndex = conv.messages.findIndex(msg => msg.id === messageId && msg.sender === 'ai');
          if (aiMessageIndex > 0 && conv.messages[aiMessageIndex - 1].sender === 'user') { 
            userPromptForAIMessage = conv.messages[aiMessageIndex - 1].text;
            const messagesUpToAIMessage = conv.messages.slice(0, aiMessageIndex); 
            return { ...conv, messages: messagesUpToAIMessage, timestamp: Date.now() };
          }
        }
        return conv;
      });
    });
  
    if (userPromptForAIMessage) {
      setTimeout(() => {
        handleSendMessage(userPromptForAIMessage);
        toast({ title: "Regenerating response..." });
      }, 0);
    } else {
      toast({ title: "Error", description: "Could not find user prompt to regenerate.", variant: "destructive" });
    }
  };
  
  const handleLikeAIMessage = (messageId: string) => {
    toast({ title: "Message Liked!", description: `AI Message ID: ${messageId}` });
  };
  
  const handleDislikeAIMessage = (messageId: string) => {
    toast({ title: "Message Disliked.", description: `AI Message ID: ${messageId}` });
  };

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
    ));
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
        const newConversations = conversations.filter(conv => conv.id !== conversationId);
        setConversations(newConversations);
        
        if (activeConversationId === conversationId) {
          const sortedRemaining = [...newConversations].sort((a,b) => b.timestamp - a.timestamp);
          setActiveConversationId(sortedRemaining.length > 0 ? sortedRemaining[0].id : null);
        }
        toast({ title: "Conversation deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const displaySampleQueries = !activeConversation || (activeConversation.messages && activeConversation.messages.length === 0);

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r">
        <SidebarHeader className="p-0 border-b border-sidebar-border">
          <div className="flex items-center h-14 px-3">
            <SidebarTrigger asChild>
              <Button
                variant="ghost"
                className="flex-grow justify-start h-auto py-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              >
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                    DeepReact Chat
                  </span>
                  <PanelLeft className="h-[1.2rem] w-[1.2rem] text-sidebar-foreground" />
                </div>
                <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
                  <PanelLeft className="h-[1.2rem] w-[1.2rem] text-sidebar-foreground" />
                </div>
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </SidebarTrigger>
          </div>
           <div className="p-2">
            <Button
              variant="default"
              onClick={handleNewChat}
              className="w-full flex items-center justify-start text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-start"
              title="New Chat"
            >
              <SquarePen size={18} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
              <span className="ml-2 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:ml-0">
                New Chat
              </span>
              <span className="sr-only group-data-[collapsible=expanded]:hidden">New Chat</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <ScrollArea className="h-full">
            {conversations.length === 0 && (
              <div className="p-4 text-center text-muted-foreground group-data-[collapsible=icon]:hidden">
                No chats yet. Start a new one!
              </div>
            )}
            <SidebarMenu className="p-2 space-y-1">
              {groupedAndSortedConversations.map(group => (
                <div key={group.title}>
                  {group.conversations.length > 0 && (
                     <div className="px-3 py-2 text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">
                       {group.title}
                     </div>
                  )}
                  {group.conversations.map(conv => (
                    <SidebarMenuItem 
                      key={conv.id} 
                      isActive={conv.id === activeConversationId}
                      className="group/conv-item flex items-center justify-between flex-nowrap" 
                    >
                      {editingConversation?.id === conv.id ? (
                        <div className="flex items-center gap-2 px-2 py-1 w-full">
                          <Input 
                            type="text" 
                            value={editingConversationTitleText}
                            onChange={(e) => setEditingConversationTitleText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditedConversationTitle();
                              if (e.key === 'Escape') handleCancelEditConversationTitle();
                            }}
                            className="h-8 flex-grow bg-input text-foreground border-border focus:ring-ring"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" onClick={handleSaveEditedConversationTitle} className="h-8 w-8 text-primary hover:text-primary/80"><Save size={16}/></Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditConversationTitle} className="h-8 w-8 text-destructive hover:text-destructive/80"><X size={16}/></Button>
                        </div>
                      ) : (
                        <>
                          <SidebarMenuButton
                            onClick={() => handleSelectConversation(conv.id)}
                            tooltip={{ children: conv.title, side: 'right', align: 'center' }}
                            className="flex-grow overflow-hidden group-data-[collapsible=icon]:justify-center min-w-0" 
                          >
                            <div className="flex items-center gap-2 overflow-hidden"> 
                              <MessageSquare size={18} className="text-muted-foreground group-data-[[data-active=true]]/conv-item:text-inherit group-data-[collapsible=icon]:text-foreground flex-shrink-0" />
                              <span className="truncate group-data-[collapsible=icon]:hidden">{conv.title || 'New Chat'}</span>
                            </div>
                          </SidebarMenuButton>
                          
                          <div className="flex-shrink-0 group-data-[collapsible=icon]:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover/conv-item:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground group-data-[[data-active=true]]/conv-item:text-inherit group-data-[[data-active=true]]/conv-item:hover:text-inherit/80"
                                  onClick={(e) => e.stopPropagation()} 
                                >
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()} side="right" align="start">
                                <DropdownMenuItem onClick={() => handleStartEditConversationTitle(conv)}>
                                  <Pencil size={14} className="mr-2" /> Edit Title
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteConversation(conv.id)} className="text-destructive hover:!text-destructive focus:!text-destructive focus-visible:!text-destructive">
                                  <Trash2 size={14} className="mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </>
                      )}
                    </SidebarMenuItem>
                  ))}
                </div>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarRail /> 
      <SidebarInset className="flex flex-col !p-0">
        <div className="flex flex-col h-screen bg-background text-foreground">
          <header className="flex items-center justify-between p-4 shadow-sm border-b border-border">
            <div className="flex items-center">
              <ChatLogo className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-semibold text-foreground">DeepReact Chat</h1>
            </div>
            <ThemeToggleButton />
          </header>
          <main className="flex-1 overflow-hidden">
             {editingMessage && activeConversationId ? (
                <div className="p-4 border-t border-border bg-card">
                  <h3 className="text-sm font-semibold mb-2 text-card-foreground">Edit and resend message:</h3>
                  <Textarea
                    value={editingMessageText}
                    onChange={(e) => setEditingMessageText(e.target.value)}
                    className="mb-2 bg-input text-foreground border-border focus:ring-ring"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancelEditMessage} size="sm">Cancel</Button>
                    <Button onClick={handleSaveEditedMessage} size="sm">Save & Resend</Button>
                  </div>
                </div>
              ) : displaySampleQueries && !isLoading ? (
                <SampleQueries 
                  queries={sampleQueriesList} 
                  onQueryClick={handleSampleQueryClick} 
                />
              ) : (
                 <ChatHistory
                    messages={activeConversation?.messages || []}
                    onEditMessage={handleStartEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                    onCopyUserMessage={handleCopyUserMessage}
                    onCopyAIMessage={handleCopyAIMessage}
                    onDownloadAIMessage={handleDownloadAIMessage}
                    onRegenerateAIMessage={handleRegenerateAIMessage}
                    onLikeAIMessage={handleLikeAIMessage}
                    onDislikeAIMessage={handleDislikeAIMessage}
                    activeConversationId={activeConversationId}
                    isLoading={isLoading}
                 />
              )}
          </main>
          {!editingMessage && (
            <ChatInput 
              value={chatInputValue}
              onValueChange={setChatInputValue}
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
            />
          )}
        </div>
      </SidebarInset>

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

