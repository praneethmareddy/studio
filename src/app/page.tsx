'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Message, Conversation } from '@/lib/types';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatLogo } from '@/components/icons/ChatLogo';
import { summarizeChatHistory } from '@/ai/flows/summarize-chat-history';
import { generateResponse } from '@/ai/flows/generate-response';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare } from 'lucide-react';
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
} from '@/components/ui/sidebar';

const CONVERSATIONS_STORAGE_KEY = 'deepReactConversations';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load conversations from localStorage on initial render
  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (storedConversations) {
        const loadedConversations: Conversation[] = JSON.parse(storedConversations);
        if (loadedConversations.length > 0) {
          // Sort by timestamp to ensure the first one is the most recent for default selection
          const sorted = [...loadedConversations].sort((a, b) => b.timestamp - a.timestamp);
          setConversations(sorted);
          setActiveConversationId(sorted[0].id); // Default to most recent
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
    // Avoid writing empty array if nothing was there, but allow clearing if it was set.
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
    setActiveConversationId(null); // Next message will create a new conversation
  };

  const handleSelectConversation = (conversationId: string) => {
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
      // Create new conversation
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: text.substring(0, 40) + (text.length > 40 ? '...' : ''),
        timestamp: Date.now(),
        messages: [newUserMessage],
      };
      updatedConversations = [newConversation, ...updatedConversations];
      currentConversationId = newConversation.id;
      setActiveConversationId(newConversation.id);
    } else {
      // Add to existing conversation
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
      // Use messages *before* the current user prompt for summary
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

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r">
        <SidebarHeader className="p-2 flex items-center justify-between border-b">
          <div className="flex items-center gap-2 p-2">
            <ChatLogo className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">Chats</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNewChat} 
                  className="text-primary hover:text-primary-foreground hover:bg-primary group-data-[collapsible=icon]:mx-auto"
                  title="New Chat">
            <Plus size={20} />
            <span className="sr-only">New Chat</span>
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
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    isActive={conv.id === activeConversationId}
                    onClick={() => handleSelectConversation(conv.id)}
                    tooltip={{ children: conv.title, side: 'right', align: 'center' }}
                    className="justify-start w-full"
                  >
                    <MessageSquare size={18} className="text-muted-foreground group-data-[collapsible=icon]:text-foreground" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{conv.title || 'New Chat'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        {/* <SidebarFooter>
          Footer content if needed
        </SidebarFooter> */}
      </Sidebar>
      <SidebarInset className="flex flex-col !p-0"> {/* Override default padding of SidebarInset */}
        <div className="flex flex-col h-screen bg-background text-foreground">
          <header className="flex items-center p-4 shadow-md">
            <ChatLogo className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-semibold">DeepReact Chat</h1>
          </header>
          <Separator />
          <main className="flex-1 overflow-hidden">
            <ChatHistory messages={activeConversation?.messages || []} />
          </main>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
