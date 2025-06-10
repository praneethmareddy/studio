
'use client';

import { useState, useEffect, useMemo, useRef, useCallback }
from 'react';
import type { Message, Conversation } from '@/lib/types';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';
import { SampleQueries } from '@/components/sample-queries/SampleQueries';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SquarePen, MessageSquare, MoreHorizontal, Pencil, Trash2, Save, X, PanelLeft, ArrowUp, User, Cpu, Brain, Search, Paperclip, FileText, RefreshCw, ThumbsUp, ThumbsDown, Copy, Download } from 'lucide-react';
import Image from 'next/image';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { isToday, isYesterday, differenceInDays, format } from 'date-fns';

const CONVERSATIONS_STORAGE_KEY = 'genAiConfigGeneratorConversations';
const STREAM_DELAY_MS = 15;

const sampleQueriesList = [
  "give me telus ciq",
  "give me no of sections in master template",
  "give telus ne template",
  "result of 2+2 = ?",
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
      groupKey = format(convDate, 'MMMM yyyy');
    }

    if (!finalGroups[groupKey]) {
      finalGroups[groupKey] = [];
    }
    finalGroups[groupKey].push(conv);
  });
  return finalGroups;
};

// Helper function to convert base64 to Blob
const base64ToBlob = (base64: string, type = 'application/octet-stream'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
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
  const [selectedModel, setSelectedModel] = useState<string>('llama3');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');


  const [alertDialogState, setAlertDialogState] = useState<AlertDialogState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const streamTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (storedConversations) {
        const loadedConversations: Conversation[] = JSON.parse(storedConversations);
        if (loadedConversations.length > 0) {
          setConversations(loadedConversations);
          const currentActiveIdFromStorage = localStorage.getItem('activeConversationId');
          const isValidId = loadedConversations.find(c => c.id === currentActiveIdFromStorage);

          if (currentActiveIdFromStorage && isValidId) {
            setActiveConversationId(currentActiveIdFromStorage);
          } else if (loadedConversations.length > 0) {
            // Do not auto-select if activeConversationId is explicitly null (e.g. New Chat)
            // This was previously auto-selecting, which prevented "New Chat" from working correctly.
            // const mostRecent = [...loadedConversations].sort((a,b) => b.timestamp - a.timestamp)[0];
            // setActiveConversationId(mostRecent.id);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 useEffect(() => {
    if (activeConversationId) {
        localStorage.setItem('activeConversationId', activeConversationId);
    } else {
        localStorage.removeItem('activeConversationId');
    }
  }, [activeConversationId]);

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
    } else if (conversations.length === 0 && localStorage.getItem(CONVERSATIONS_STORAGE_KEY)) {
        localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
    }
  }, [conversations, toast]);

  useEffect(() => {
    if (activeConversationId && !conversations.find(c => c.id === activeConversationId)) {
        const mostRecentAfterDeletion = conversations.length > 0
            ? [...conversations].sort((a, b) => b.timestamp - a.timestamp)[0]
            : null;
        setActiveConversationId(mostRecentAfterDeletion ? mostRecentAfterDeletion.id : null);
    } else if (conversations.length === 0 && activeConversationId !== null) {
        setActiveConversationId(null);
    }
  // This useEffect intentionally does not automatically select a conversation
  // if activeConversationId is null and conversations exist, to allow the "New Chat"
  // state (activeConversationId === null) to persist.
  }, [conversations, activeConversationId]);


  useEffect(() => {
    return () => {
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      conversations.forEach(conv => {
        conv.messages.forEach(msg => {
          if (msg.downloadableFile?.blobUrl) {
            URL.revokeObjectURL(msg.downloadableFile.blobUrl);
          }
        });
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find(conv => conv.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const filteredConversations = useMemo(() => {
    if (!sidebarSearchTerm) {
      return conversations;
    }
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(sidebarSearchTerm.toLowerCase())
    );
  }, [conversations, sidebarSearchTerm]);

  const groupedAndSortedConversations = useMemo(() => {
    const grouped = groupConversations(filteredConversations);
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
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            return 0;
        }
        return dateB.getTime() - dateA.getTime();
      });

    monthlyGroupKeys.forEach(key => {
      if (grouped[key] && grouped[key].length > 0) {
        orderedGroups.push({ title: key, conversations: grouped[key] });
      }
    });

    return orderedGroups;
  }, [filteredConversations]);


  const handleNewChat = () => {
    setEditingConversation(null);
    setActiveConversationId(null);
    setChatInputValue('');
    setEditingMessage(null);
    setAttachedFile(null);
    setSidebarSearchTerm('');
  };

  const handleSelectConversation = (conversationId: string) => {
    setEditingConversation(null);
    setActiveConversationId(conversationId);
    setChatInputValue('');
    setEditingMessage(null);
    setAttachedFile(null);
  };

  const handleSampleQueryClick = (query: string) => {
    setChatInputValue(query);
    setAttachedFile(null);
  };

  const handleFileAttach = (file: File) => {
    setAttachedFile(file);
  };

  const handleFileRemove = () => {
    setAttachedFile(null);
  };

  const streamResponseText = useCallback((fullText: string, messageId: string, conversationId: string) => {
    let currentDisplayedText = '';
    let charIndex = 0;

    const appendNextCharacter = () => {
      if (charIndex < fullText.length) {
        currentDisplayedText += fullText[charIndex];
        setConversations(prevConvs =>
          prevConvs.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === messageId ? { ...msg, text: currentDisplayedText } : msg
                ),
                timestamp: Date.now(), // Ensure conversation with streaming text bubbles up
              };
            }
            return conv;
          }).sort((a,b) => b.timestamp - a.timestamp)
        );
        charIndex++;
        streamTimeoutRef.current = setTimeout(appendNextCharacter, STREAM_DELAY_MS);
      } else {
        setIsLoading(false);
        // Final update to ensure timestamp is set and list is sorted correctly after streaming
        setConversations(prevConvs =>
            [...prevConvs].map(conv =>
                conv.id === conversationId ? {...conv, timestamp: Date.now()} : conv
            ).sort((a,b) => b.timestamp - a.timestamp)
        );
      }
    };
    appendNextCharacter();
  }, []);

 const handleSendMessage = useCallback(async (
    text: string,
    file?: File // This is the newly attached file from ChatInput
  ) => {
    const trimmedText = text.trim();
    if (!trimmedText && !file) return;

    let displayMessageText = trimmedText;
    let fileInfoForUserMessage: Message['file'] | undefined = undefined;
    let messageTextForBackend = trimmedText;

    if (file) {
        fileInfoForUserMessage = { name: file.name, type: file.type, size: file.size };
        if (trimmedText.toLowerCase().includes("standardize this ciq") || trimmedText.toLowerCase().includes("standardize ciq")) {
            messageTextForBackend = "standardize this CIQ"; // Standard query for backend
            displayMessageText = `Standardizing: ${file.name}`;
        } else {
            messageTextForBackend = `[File Attached: ${file.name}] ${trimmedText}`.trim();
        }
    }

    if (!trimmedText && fileInfoForUserMessage && !messageTextForBackend.toLowerCase().includes("standardize this ciq")) {
      displayMessageText = `File: ${fileInfoForUserMessage.name}`;
      messageTextForBackend = `File: ${fileInfoForUserMessage.name}`;
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: displayMessageText,
      sender: 'user',
      timestamp: Date.now(),
      file: fileInfoForUserMessage,
    };

    setIsLoading(true);
    let currentConversationId = activeConversationId;
    let updatedConversations = [...conversations];

    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: (displayMessageText || fileInfoForUserMessage?.name || "New Chat").substring(0, 20) + ((displayMessageText || fileInfoForUserMessage?.name || "New Chat").length > 20 ? '...' : ''),
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
    updatedConversations.sort((a, b) => b.timestamp - a.timestamp);
    setConversations(updatedConversations);
    setChatInputValue('');
    setAttachedFile(null);

    try {
      let backendResponse;
      const requestOptions: RequestInit = { method: 'POST' };

      if (file) {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('query', messageTextForBackend); // Ensure query is also sent with file
        requestOptions.body = formData;
        // For FormData, Content-Type is set by the browser
      } else {
        requestOptions.headers = { 'Content-Type': 'application/json' };
        requestOptions.body = JSON.stringify({ query: messageTextForBackend, model: selectedModel });
      }

      backendResponse = await fetch('http://localhost:5000/query', requestOptions);

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        throw new Error(`HTTP error! status: ${backendResponse.status}, message: ${errorText}`);
      }

      const contentType = backendResponse.headers.get("content-type");
      let aiResponseText = "";
      let downloadableFileLocal: Message['downloadableFile'] | undefined = undefined;
      let isStandardizationReqLocal = false;
      let standardizationReqIdLocal: string | undefined = undefined;
      let unmatchedColsLocal: string[] | undefined = undefined;
      let simMappingLocal: Record<string, string> | undefined = undefined;
      let filenameForDownload = "downloaded_file";


      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await backendResponse.json();
        if (jsonResponse.error) {
            throw new Error(jsonResponse.error);
        }

        if (jsonResponse.standardized_file_base64 && jsonResponse.request_id) {
            isStandardizationReqLocal = true;
            standardizationReqIdLocal = jsonResponse.request_id;
            unmatchedColsLocal = jsonResponse.unmatched_columns;
            simMappingLocal = jsonResponse.similarity_mapping;
            filenameForDownload = jsonResponse.filename || "standardized_ciq.xlsx";

            const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const blobUrl = URL.createObjectURL(blob);
            downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };

            aiResponseText = `Standardized CIQ '${filenameForDownload}' is ready for download.`;
            if (unmatchedColsLocal && unmatchedColsLocal.length > 0) {
                aiResponseText += `\n\nSome columns were not found in the standard template. You'll be asked if you want to update the template.`;
            } else {
                aiResponseText += `\n\nAll columns matched the standard template.`;
            }
            toast({ title: "Standardization Complete", description: `'${filenameForDownload}' is ready.` });
        } else if (jsonResponse.request_id || jsonResponse.unmatched_columns || jsonResponse.standardized_file_base64) {
            let debugMessage = "Standardization response from backend is incomplete. ";
            if (!jsonResponse.standardized_file_base64) debugMessage += "Missing 'standardized_file_base64'. ";
            if (!jsonResponse.request_id) debugMessage += "Missing 'request_id'. ";
            if (!jsonResponse.response && !jsonResponse.standardized_file_base64) debugMessage += "Also missing 'response' field for a fallback message.";
            console.warn("Incomplete standardization JSON from backend:", jsonResponse);
            aiResponseText = jsonResponse.response || debugMessage.trim();
            if (jsonResponse.request_id) { // Still try to process if some standardization info is present
              isStandardizationReqLocal = true;
              standardizationReqIdLocal = jsonResponse.request_id;
              unmatchedColsLocal = jsonResponse.unmatched_columns;
              simMappingLocal = jsonResponse.similarity_mapping;
              filenameForDownload = jsonResponse.filename || "standardized_ciq.xlsx"; // Use filename if provided
               if (jsonResponse.standardized_file_base64) { // Still create downloadable if base64 is there
                    const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    const blobUrl = URL.createObjectURL(blob);
                    downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };
                }
            }
        }
        else { // Standard text response
            aiResponseText = jsonResponse.response || "Received an empty response from the server.";
        }
      } else if (contentType && (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || contentType.includes("application/octet-stream"))) {
        // This case handles direct file download if backend ever sends it (not the base64 JSON way)
        const blob = await backendResponse.blob();
        const contentDisposition = backendResponse.headers.get('Content-Disposition');
        if (contentType.includes("spreadsheetml.sheet") && !filenameForDownload.endsWith(".xlsx")) filenameForDownload += ".xlsx";

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length > 1) {
                filenameForDownload = filenameMatch[1];
            }
        }

        const blobUrl = URL.createObjectURL(blob);
        downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };
        aiResponseText = `Successfully downloaded '${filenameForDownload}'.`; // This text will be shown in chat
        toast({ title: "File Ready", description: `'${filenameForDownload}' can now be downloaded from the chat.` });
      } else {
        aiResponseText = await backendResponse.text();
        if (!aiResponseText) aiResponseText = "Received an unexpected response type from the server.";
      }

      let processedResponseText = aiResponseText;
      if (selectedModel === 'deepseek-r1' && !downloadableFileLocal && !isStandardizationReqLocal) {
        processedResponseText = processedResponseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }

      const newAiMessageId = (Date.now() + 1).toString();
      const aiMessagePlaceholder: Message = {
        id: newAiMessageId,
        text: '', // Will be filled by streamResponseText
        sender: 'ai',
        timestamp: Date.now(),
        modelUsed: selectedModel,
        downloadableFile: downloadableFileLocal,
        isStandardizationRequest: isStandardizationReqLocal,
        standardizationRequestId: standardizationReqIdLocal,
        unmatchedColumns: unmatchedColsLocal,
        similarityMapping: simMappingLocal,
        isStandardizationConfirmed: false, // Default to false
      };

      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, aiMessagePlaceholder], timestamp: Date.now() }
            : conv
        ).sort((a, b) => b.timestamp - a.timestamp)
      );

      if (currentConversationId) {
         streamResponseText(processedResponseText, newAiMessageId, currentConversationId);
      } else {
        // This case should ideally not happen if a new conversation is created above
        console.error("Error: No active conversation ID to stream response to.");
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error('Error sending message to backend:', error);
      toast({
        title: "API Error",
        description: `Sorry, I couldn't get a response. ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
       const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, an error occurred: ${error.message || 'Could not connect to the AI.'}. Please check if the backend server is running or try again later.`,
        sender: 'ai',
        timestamp: Date.now(),
        modelUsed: selectedModel,
      };
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorAiMessage], timestamp: Date.now() }
            : conv
        ).sort((a, b) => b.timestamp - a.timestamp)
      );
      setIsLoading(false);
    }
  }, [activeConversationId, conversations, toast, selectedModel, streamResponseText]);

  const handleStartEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditingMessageText(message.text);
    setAttachedFile(null); // Clear any globally attached file when starting an edit
  };

 const handleSaveEditedMessage = async () => {
    if (!editingMessage || !activeConversationId) return;

    const trimmedEditingText = editingMessageText.trim();
    if (!trimmedEditingText) {
      toast({ title: "Cannot resend empty message", description: "Please provide some text for the edited message.", variant: "destructive" });
      return;
    }

    const currentConvId = activeConversationId;

    let textForBackend = trimmedEditingText;
    let displayUserText = trimmedEditingText;

    // If the original message being edited had a file, include a reference.
    // The backend is expected to handle this as a text query, not re-process file bytes.
    if (editingMessage.file) {
        if (trimmedEditingText.toLowerCase().includes("standardize this ciq") || trimmedEditingText.toLowerCase().includes("standardize ciq")) {
            textForBackend = "standardize this CIQ"; // Keep it standard for backend
            displayUserText = `Standardizing (edited): ${editingMessage.file.name} - ${trimmedEditingText}`; // For UI display
        } else {
            textForBackend = `[File Referenced: ${editingMessage.file.name}] ${trimmedEditingText}`.trim();
            displayUserText = textForBackend;
        }
    }

    let updatedUserMessage: Message | null = null;
    let baseMessagesForNewAIResponse: Message[] = [];

    // Update conversation state: replace user message, remove subsequent messages
    setConversations(prevConvs => {
      const convIndex = prevConvs.findIndex(conv => conv.id === currentConvId);
      if (convIndex === -1) return prevConvs; // Should not happen

      const targetConversation = prevConvs[convIndex];
      const messageIndex = targetConversation.messages.findIndex(msg => msg.id === editingMessage.id);
      if (messageIndex === -1) return prevConvs; // Should not happen

      // Revoke blob URLs for messages being removed
      for (let i = messageIndex + 1; i < targetConversation.messages.length; i++) {
        if (targetConversation.messages[i].downloadableFile?.blobUrl) {
          URL.revokeObjectURL(targetConversation.messages[i].downloadableFile.blobUrl);
        }
      }

      updatedUserMessage = {
        ...targetConversation.messages[messageIndex],
        text: displayUserText, // Use the display text for the user message
        timestamp: Date.now(),
        file: editingMessage.file // Retain original file info if any
      };

      // Messages up to and including the edited user message
      baseMessagesForNewAIResponse = [
        ...targetConversation.messages.slice(0, messageIndex),
        updatedUserMessage,
      ];

      const updatedConv = {
        ...targetConversation,
        messages: baseMessagesForNewAIResponse,
        timestamp: Date.now(),
      };

      const newConvs = [...prevConvs];
      newConvs[convIndex] = updatedConv;
      return newConvs.sort((a, b) => b.timestamp - a.timestamp);
    });

    // Ensure state update completes before proceeding
    await new Promise(resolve => setTimeout(resolve, 0));

    setEditingMessage(null);
    setEditingMessageText('');
    setIsLoading(true);
    toast({ title: "Resending edited message..." });

    try {
      // For edited messages, always send as JSON, even if original had a file.
      // The backend should use textForBackend (which includes file reference if needed)
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textForBackend, model: selectedModel }), // Use textForBackend
      };
      console.log("Resending edited message with options:", requestOptions);

      const backendResponse = await fetch('http://localhost:5000/query', requestOptions);

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        throw new Error(`HTTP error! status: ${backendResponse.status}, message: ${errorText}`);
      }

      const contentType = backendResponse.headers.get("content-type");
      let aiResponseText = "";
      let downloadableFileLocal: Message['downloadableFile'] | undefined = undefined;
      let isStandardizationReqLocal = false;
      let standardizationReqIdLocal: string | undefined = undefined;
      let unmatchedColsLocal: string[] | undefined = undefined;
      let simMappingLocal: Record<string, string> | undefined = undefined;
      let filenameForDownload = "downloaded_file";


      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await backendResponse.json();
        if (jsonResponse.error) throw new Error(jsonResponse.error);

        if (jsonResponse.standardized_file_base64 && jsonResponse.request_id) {
            // This block handles the new CIQ standardization flow
            isStandardizationReqLocal = true;
            standardizationReqIdLocal = jsonResponse.request_id;
            unmatchedColsLocal = jsonResponse.unmatched_columns;
            simMappingLocal = jsonResponse.similarity_mapping;
            filenameForDownload = jsonResponse.filename || "standardized_ciq.xlsx";

            const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const blobUrl = URL.createObjectURL(blob);
            downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };

            aiResponseText = `Standardized CIQ '${filenameForDownload}' is ready for download.`;
            if (unmatchedColsLocal && unmatchedColsLocal.length > 0) {
                aiResponseText += `\n\nSome columns were not found in the standard template. You'll be asked if you want to update.`;
            } else {
                 aiResponseText += `\n\nAll columns matched the standard template.`;
            }
            toast({ title: "Standardization Complete", description: "File is ready."});
        } else if (jsonResponse.request_id || jsonResponse.unmatched_columns || jsonResponse.standardized_file_base64) {
            let debugMessage = "Standardization response from backend is incomplete. ";
            if (!jsonResponse.standardized_file_base64) debugMessage += "Missing 'standardized_file_base64'. ";
            if (!jsonResponse.request_id) debugMessage += "Missing 'request_id'. ";
            if (!jsonResponse.response && !jsonResponse.standardized_file_base64) debugMessage += "Also missing 'response' field for fallback.";
            console.warn("Incomplete standardization JSON from backend (on edit):", jsonResponse);
            aiResponseText = jsonResponse.response || debugMessage.trim();
            if (jsonResponse.request_id) {
              isStandardizationReqLocal = true;
              standardizationReqIdLocal = jsonResponse.request_id;
              unmatchedColsLocal = jsonResponse.unmatched_columns;
              simMappingLocal = jsonResponse.similarity_mapping;
              filenameForDownload = jsonResponse.filename || "standardized_ciq.xlsx";
               if (jsonResponse.standardized_file_base64) {
                    const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    const blobUrl = URL.createObjectURL(blob);
                    downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };
                }
            }
        }
         else { // Standard text response
            aiResponseText = jsonResponse.response || "Received an empty response from the server.";
        }
      } else if (contentType && (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || contentType.includes("application/octet-stream"))) {
        // Direct file download (not base64 in JSON)
        const blob = await backendResponse.blob();
        const contentDisposition = backendResponse.headers.get('Content-Disposition');
        if (contentType.includes("spreadsheetml.sheet") && !filenameForDownload.endsWith(".xlsx")) filenameForDownload += ".xlsx";

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
          if (filenameMatch && filenameMatch.length > 1) filenameForDownload = filenameMatch[1];
        }
        const blobUrl = URL.createObjectURL(blob);
        downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };
        aiResponseText = `Successfully downloaded '${filenameForDownload}'.`;
        toast({ title: "File Ready", description: `'${filenameForDownload}' can now be downloaded from the chat.`});
      } else {
        aiResponseText = await backendResponse.text() || "Received an unexpected response type.";
      }

      let processedResponseText = aiResponseText;
      if (selectedModel === 'deepseek-r1' && !downloadableFileLocal && !isStandardizationReqLocal) {
        processedResponseText = processedResponseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      }

      const newAiMessageId = (Date.now() + 1).toString();
      const newAiMessage: Message = {
        id: newAiMessageId,
        text: '', // Will be filled by streamResponseText
        sender: 'ai',
        timestamp: Date.now(),
        modelUsed: selectedModel,
        downloadableFile: downloadableFileLocal,
        isStandardizationRequest: isStandardizationReqLocal,
        standardizationRequestId: standardizationReqIdLocal,
        unmatchedColumns: unmatchedColsLocal,
        similarityMapping: simMappingLocal,
        isStandardizationConfirmed: false,
      };

      // Append new AI message to the (already truncated) conversation
      setConversations(prevConvs =>
        prevConvs.map(conv => {
            if (conv.id === currentConvId) {
                // baseMessagesForNewAIResponse already contains the edited user message
                return { ...conv, messages: [...baseMessagesForNewAIResponse, newAiMessage], timestamp: Date.now() };
            }
            return conv;
        }).sort((a, b) => b.timestamp - a.timestamp)
      );

      if (currentConvId) {
        streamResponseText(processedResponseText, newAiMessageId, currentConvId);
      } else {
         // This should not happen due to the logic above
         setIsLoading(false);
      }

    } catch (error: any) {
      console.error('Error resending edited message:', error);
      toast({
        title: "API Error",
        description: `Sorry, I couldn't get a new response. ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error getting new response: ${error.message || 'Please try again.'}`,
        sender: 'ai',
        timestamp: Date.now(),
        modelUsed: selectedModel,
      };
      setConversations(prevConvs =>
        prevConvs.map(conv => {
             if (conv.id === currentConvId) {
                return { ...conv, messages: [...baseMessagesForNewAIResponse, errorAiMessage], timestamp: Date.now() };
            }
            return conv;
        }).sort((a, b) => b.timestamp - a.timestamp)
      );
      setIsLoading(false);
    }
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
      description: "Are you sure you want to delete this message and all subsequent messages in this chat? This action cannot be undone.",
      onConfirm: () => {
        setConversations(prev => prev.map(conv => {
          if (conv.id === activeConversationId) {
            const messageIndex = conv.messages.findIndex(msg => msg.id === messageId);
            if (messageIndex !== -1) {
              // Revoke blob URLs for deleted messages and subsequent ones
              const messagesToClean = conv.messages.slice(messageIndex);
              messagesToClean.forEach(msgToClean => {
                  if (msgToClean.downloadableFile?.blobUrl) {
                      URL.revokeObjectURL(msgToClean.downloadableFile.blobUrl);
                  }
              });
              const updatedMessages = conv.messages.slice(0, messageIndex);
              // If deleting the only messages, consider if the conversation itself should be deleted or kept empty.
              // For now, it keeps the conversation, potentially empty.
              return {
                ...conv,
                messages: updatedMessages,
                timestamp: updatedMessages.length > 0 ? Date.now() : conv.timestamp // Update timestamp if messages remain
              };
            }
          }
          return conv;
        }).filter(conv => {
            // Optionally remove conversation if it becomes empty
            // if (conv.id === activeConversationId && conv.messages.length === 0) return false;
            return true;
         })
         .sort((a,b) => b.timestamp - a.timestamp)
        );
        toast({ title: "Message and subsequent messages deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCopyUserMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "User message copied!", duration: 3000 });
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive", duration: 3000 });
    }
  };

  const handleCopyAIMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "AI response copied!", duration: 3000 });
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive", duration: 3000 });
    }
  };

  const handleDownloadAIMessage = (messageId: string) => {
    const conversation = conversations.find(c => c.id === activeConversationId);
    const message = conversation?.messages.find(m => m.id === messageId && m.sender === 'ai');

    // If there's a specific downloadable file, users should use its dedicated button
    if (message?.downloadableFile?.blobUrl && message.text.includes(message.downloadableFile.name)) {
        toast({title: "Info", description: `Use the download button for '${message.downloadableFile.name}' on the message itself.`});
    } else if (message?.text) {
      // Otherwise, download the AI's text content as a .txt file
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
      toast({ title: "Error", description: "Could not find message text to download.", variant: "destructive" });
    }
  };

const handleRegenerateAIMessage = async (aiMessageIdToRegenerate: string) => {
    if (!activeConversationId) return;

    const currentConvId = activeConversationId;
    let promptingUserMessage: Message | undefined;
    let baseMessagesForRegen: Message[] = [];

    // Update conversation state: remove the AI message to be regenerated and any subsequent messages
    setConversations(prevConvs => {
        const convIndex = prevConvs.findIndex(c => c.id === currentConvId);
        if (convIndex === -1) return prevConvs;

        const currentConversationForRegen = prevConvs[convIndex];
        const aiMessageIndex = currentConversationForRegen.messages.findIndex(msg => msg.id === aiMessageIdToRegenerate && msg.sender === 'ai');

        if (aiMessageIndex <= 0) { // AI message must exist and have a preceding user message
            toast({ title: "Error", description: "Cannot regenerate. No preceding user prompt found.", variant: "destructive" });
            return prevConvs;
        }

        // Revoke blob URL for the AI message being regenerated and any subsequent messages
        for (let i = aiMessageIndex; i < currentConversationForRegen.messages.length; i++) {
             if (currentConversationForRegen.messages[i].downloadableFile?.blobUrl) {
                URL.revokeObjectURL(currentConversationForRegen.messages[i].downloadableFile.blobUrl);
            }
        }

        promptingUserMessage = currentConversationForRegen.messages[aiMessageIndex - 1];
        if (promptingUserMessage.sender !== 'user') {
            toast({ title: "Error", description: "Cannot regenerate. Preceding message is not from user.", variant: "destructive" });
            return prevConvs;
        }

        // Messages up to (and including) the user message that prompted the AI response
        baseMessagesForRegen = currentConversationForRegen.messages.slice(0, aiMessageIndex -1);
        baseMessagesForRegen.push(promptingUserMessage); // include the user prompt


        const updatedConvs = [...prevConvs];
        updatedConvs[convIndex] = {
            ...currentConversationForRegen,
            messages: baseMessagesForRegen, // Truncate here
            timestamp: Date.now(),
        };
        return updatedConvs.sort((a, b) => b.timestamp - a.timestamp);
    });

    // Ensure state update completes before proceeding
    await new Promise(resolve => setTimeout(resolve, 0));

    if (!promptingUserMessage || !currentConvId) {
        // This should not happen if the above logic is correct
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    toast({ title: "Regenerating AI response..." });

    // Prepare the query for the backend using the text from the promptingUserMessage
    let queryTextForBackend = promptingUserMessage.text;
    const requestOptions: RequestInit = { method: 'POST' };

    // For regeneration, if the original user message had a file,
    // the backend will treat this as a text query, it won't re-process the file bytes.
    // The queryTextForBackend (which is promptingUserMessage.text) should already
    // contain necessary textual reference to the file like "Standardizing: file.xlsx"
    // or "[File Attached: file.name] actual_query_text".
    // No need to construct FormData here for regeneration.

    requestOptions.headers = { 'Content-Type': 'application/json' };
    requestOptions.body = JSON.stringify({ query: queryTextForBackend, model: selectedModel });


    try {
        const backendResponse = await fetch('http://localhost:5000/query', requestOptions);

        if (!backendResponse.ok) {
            const errorData = await backendResponse.text(); // or .json() if backend sends structured errors
            throw new Error(`HTTP error! status: ${backendResponse.status}, message: ${errorData}`);
        }

        // Process response (similar to handleSendMessage)
        const contentType = backendResponse.headers.get("content-type");
        let aiResponseText = "";
        let downloadableFileLocal: Message['downloadableFile'] | undefined = undefined;
        let isStandardizationReqLocal = false;
        let standardizationReqIdLocal: string | undefined = undefined;
        let unmatchedColsLocal: string[] | undefined = undefined;
        let simMappingLocal: Record<string, string> | undefined = undefined;
        let filenameForDownload = "downloaded_file";


      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await backendResponse.json();
        if (jsonResponse.error) throw new Error(jsonResponse.error);

        if (jsonResponse.standardized_file_base64 && jsonResponse.request_id) {
            // Handle new CIQ standardization flow
            isStandardizationReqLocal = true;
            standardizationReqIdLocal = jsonResponse.request_id;
            unmatchedColsLocal = jsonResponse.unmatched_columns;
            simMappingLocal = jsonResponse.similarity_mapping;
            filenameForDownload = jsonResponse.filename || "standardized_ciq.xlsx";

            const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const blobUrl = URL.createObjectURL(blob);
            downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };

            aiResponseText = `Standardized CIQ '${filenameForDownload}' is ready for download.`;
             if (unmatchedColsLocal && unmatchedColsLocal.length > 0) {
                aiResponseText += `\n\nSome columns were not found in the standard template. You'll be asked if you want to update.`;
            } else {
                 aiResponseText += `\n\nAll columns matched the standard template.`;
            }
            toast({ title: "Standardization Complete" });
        } else if (jsonResponse.request_id || jsonResponse.unmatched_columns || jsonResponse.standardized_file_base64) {
            let debugMessage = "Standardization response from backend is incomplete. ";
            if (!jsonResponse.standardized_file_base64) debugMessage += "Missing 'standardized_file_base64'. ";
            if (!jsonResponse.request_id) debugMessage += "Missing 'request_id'. ";
            if (!jsonResponse.response && !jsonResponse.standardized_file_base64) debugMessage += "Also missing 'response' field for fallback.";
            console.warn("Incomplete standardization JSON from backend (on regenerate):", jsonResponse);
            aiResponseText = jsonResponse.response || debugMessage.trim();
             if (jsonResponse.request_id) {
              isStandardizationReqLocal = true;
              standardizationReqIdLocal = jsonResponse.request_id;
              unmatchedColsLocal = jsonResponse.unmatched_columns;
              simMappingLocal = jsonResponse.similarity_mapping;
              filenameForDownload = jsonResponse.filename || "standardized_ciq.xlsx";
               if (jsonResponse.standardized_file_base64) {
                    const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    const blobUrl = URL.createObjectURL(blob);
                    downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };
                }
            }
        }
         else { // Standard text response
            aiResponseText = jsonResponse.response || "Received an empty response from the server.";
        }
        } else if (contentType && (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || contentType.includes("application/octet-stream"))) {
            // Direct file download
            const blob = await backendResponse.blob();
            const contentDisposition = backendResponse.headers.get('Content-Disposition');
             if (contentType.includes("spreadsheetml.sheet") && !filenameForDownload.endsWith(".xlsx")) filenameForDownload += ".xlsx";

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch && filenameMatch.length > 1) filenameForDownload = filenameMatch[1];
            }
            const blobUrl = URL.createObjectURL(blob);
            downloadableFileLocal = { name: filenameForDownload, type: blob.type, blobUrl };
            aiResponseText = `Successfully downloaded '${filenameForDownload}'.`;
            toast({ title: "File Ready", description: `'${filenameForDownload}' can now be downloaded from the chat.`});
        } else {
            aiResponseText = await backendResponse.text() || "Received an unexpected response type.";
        }

        let processedResponseText = aiResponseText;
        if (selectedModel === 'deepseek-r1' && !downloadableFileLocal && !isStandardizationReqLocal) {
            processedResponseText = processedResponseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        }

        const newAiMessageId = (Date.now() + 1).toString();
        const newAiMessage: Message = {
            id: newAiMessageId,
            text: '', // Will be filled by streamResponseText
            sender: 'ai',
            timestamp: Date.now(),
            modelUsed: selectedModel,
            downloadableFile: downloadableFileLocal,
            isStandardizationRequest: isStandardizationReqLocal,
            standardizationRequestId: standardizationReqIdLocal,
            unmatchedColumns: unmatchedColsLocal,
            similarityMapping: simMappingLocal,
            isStandardizationConfirmed: false,
        };

        // Append the new AI message to the (already truncated) conversation
        setConversations(prevConvs =>
            prevConvs.map(conv => {
                if (conv.id === currentConvId) {
                    // baseMessagesForRegen already contains the prompting user message
                    return { ...conv, messages: [...baseMessagesForRegen, newAiMessage], timestamp: Date.now() };
                }
                return conv;
            }).sort((a, b) => b.timestamp - a.timestamp)
        );

        if (currentConvId) {
          streamResponseText(processedResponseText, newAiMessageId, currentConvId);
        } else {
             // This should not happen
             console.error("Error: No active conversation ID to stream regenerated response to.");
             setIsLoading(false);
        }

    } catch (error: any) {
        console.error('Error regenerating AI response:', error);
        toast({
            title: "API Error",
            description: `Sorry, I couldn't regenerate the response. ${error.message || 'Unknown error'}`,
            variant: "destructive",
        });
        const errorAiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I couldn't regenerate the response. ${error.message || 'Please try again.'}`,
          sender: 'ai',
          timestamp: Date.now(),
          modelUsed: selectedModel,
        };
        setConversations(prevConvs =>
            prevConvs.map(conv => {
                 if (conv.id === currentConvId) {
                    // Append error message to the already truncated list
                    return { ...conv, messages: [...baseMessagesForRegen, errorAiMessage], timestamp: Date.now() };
                }
                return conv;
            }).sort((a, b) => b.timestamp - a.timestamp)
        );
        setIsLoading(false);
    }
  };

const handleStandardizationConfirmation = async (messageId: string, requestId: string, decision: 'yes' | 'no') => {
    if (!activeConversationId) return;
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/confirm-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, decision: decision }),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Assuming backend sends JSON error
        throw new Error(errorData.error || `Failed to confirm update: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: "Confirmation Sent",
        description: result.message || (decision === 'yes' ? "Standard template update initiated." : "No changes made to standard template."),
      });

      // Update the message to reflect that confirmation has been handled
      setConversations(prevConvs =>
        prevConvs.map(conv => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === messageId
                  ? { ...msg, isStandardizationConfirmed: true, timestamp: Date.now() } // Update timestamp of message
                  : msg
              ),
              timestamp: Date.now(), // Update timestamp of conversation
            };
          }
          return conv;
        }).sort((a, b) => b.timestamp - a.timestamp)
      );

    } catch (error: any) {
      console.error("Error sending standardization confirmation:", error);
      toast({
        title: "Confirmation Error",
        description: error.message || "Could not send confirmation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleLikeAIMessage = (messageId: string) => {
    // Placeholder for like functionality
    toast({ title: "Message Liked!", description: `AI Message ID: ${messageId}` });
  };

  const handleDislikeAIMessage = (messageId: string) => {
    // Placeholder for dislike functionality
    toast({ title: "Message Disliked.", description: `AI Message ID: ${messageId}` });
  };

  const handleStartEditConversationTitle = (conversation: Conversation) => {
    setEditingConversation(conversation);
    setEditingConversationTitleText(conversation.title);
    if (activeConversationId !== conversation.id) {
       setActiveConversationId(conversation.id); // Switch to the conversation being edited if not active
    }
  };

  const handleSaveEditedConversationTitle = () => {
    if (!editingConversation) return;
    setConversations(prev => prev.map(conv =>
      conv.id === editingConversation.id
        ? { ...conv, title: editingConversationTitleText, timestamp: Date.now() } // Update timestamp
        : conv
    ).sort((a,b) => b.timestamp - a.timestamp)); // Re-sort after update
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
        setConversations(prevConversations => {
            // Revoke blob URLs for all messages in the conversation being deleted
            const convToDelete = prevConversations.find(c => c.id === conversationId);
            convToDelete?.messages.forEach(msg => {
                if (msg.downloadableFile?.blobUrl) {
                    URL.revokeObjectURL(msg.downloadableFile.blobUrl);
                }
            });

            const newConversations = prevConversations.filter(conv => conv.id !== conversationId);
            if (activeConversationId === conversationId) {
                // If the active conversation is deleted, select the most recent remaining one, or null
                if (newConversations.length > 0) {
                    const mostRecent = [...newConversations].sort((a, b) => b.timestamp - a.timestamp)[0];
                    setActiveConversationId(mostRecent.id);
                } else {
                    setActiveConversationId(null); // No conversations left
                }
            }
            return newConversations; // No need to re-sort here as filter preserves order
        });
        toast({ title: "Conversation deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      },
      confirmText: "Delete"
    });
  };

  const handleDeleteAllConversations = () => {
    setAlertDialogState({
      isOpen: true,
      title: "Delete All Chats?",
      description: "Are you sure you want to delete all your conversations? This action cannot be undone and will clear all chat history.",
      onConfirm: () => {
        // Revoke all blob URLs before clearing conversations
        conversations.forEach(conv => {
            conv.messages.forEach(msg => {
                if (msg.downloadableFile?.blobUrl) {
                    URL.revokeObjectURL(msg.downloadableFile.blobUrl);
                }
            });
        });
        setConversations([]);
        setActiveConversationId(null); // No active conversation after deleting all
        toast({ title: "All conversations deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      },
      confirmText: "Delete All",
      cancelText: "Cancel"
    });
  };

  // Determine if sample queries should be shown
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
                    GenAI Config Generator
                  </span>
                  <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
                </div>
                <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
                   <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
                </div>
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </SidebarTrigger>
          </div>
           <div className="p-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleNewChat}
              className="w-full flex items-center justify-start text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-lg group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-start hover:animate-shadow-pulse"
              title="New Chat"
            >
              <SquarePen size={14} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
              <span className="ml-2 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:ml-0">
                New Chat
              </span>
              <span className="sr-only group-data-[collapsible=expanded]:hidden">New Chat</span>
            </Button>
             <div className="mt-2 relative group-data-[collapsible=icon]:hidden">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              />
              <Input
                type="search"
                placeholder="Search chats..."
                className="w-full h-8 pl-10 pr-3 text-sm bg-input border-input focus:ring-ring"
                value={sidebarSearchTerm}
                onChange={(e) => setSidebarSearchTerm(e.target.value)}
              />
               {sidebarSearchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => setSidebarSearchTerm('')}
                >
                  <X size={14} />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 && sidebarSearchTerm && (
              <div className="p-4 text-center text-muted-foreground group-data-[collapsible=icon]:hidden">
                No chats match your search.
              </div>
            )}
            {filteredConversations.length === 0 && !sidebarSearchTerm && (
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
                      className="group/conv-item flex items-center justify-between flex-nowrap rounded-lg"
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
                          <Button variant="ghost" size="icon" onClick={handleSaveEditedConversationTitle} className="h-8 w-8 text-primary hover:text-primary/80"><Save size={14}/></Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditConversationTitle} className="h-8 w-8 text-destructive hover:text-destructive/80"><X size={14}/></Button>
                        </div>
                      ) : (
                        <>
                          <SidebarMenuButton
                            size="sm"
                            onClick={() => handleSelectConversation(conv.id)}
                            tooltip={{ children: conv.title, side: 'right', align: 'center' }}
                            className="flex-grow overflow-hidden group-data-[collapsible=icon]:justify-center min-w-0"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <MessageSquare size={14} className="text-muted-foreground group-data-[[data-active=true]]/conv-item:text-inherit group-data-[collapsible=icon]:text-foreground flex-shrink-0" />
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
                                  <MoreHorizontal size={14} />
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
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenuButton
            onClick={handleDeleteAllConversations}
            tooltip={{ children: "Delete All Chats", side: 'right', align: 'center' }}
            className="w-full group-data-[collapsible=icon]:justify-center text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!text-destructive focus-visible:!text-destructive"
          >
            <Trash2 size={16} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              Delete All Chats
            </span>
          </SidebarMenuButton>
          <SidebarMenuButton
            tooltip={{ children: "User Profile", side: 'right', align: 'center' }}
            className="w-full group-data-[collapsible=icon]:justify-center"
          >
            <User size={16} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              User Profile
            </span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
      <SidebarInset className="flex flex-col !p-0">
        <div className={cn("flex flex-col h-screen bg-background text-foreground", isLoading && "animate-shadow-pulse")}>
          <header className="flex items-center justify-between p-4 shadow-sm border-b border-border">
            <div className="flex items-center">
              <div className="md:hidden mr-2">
                <SidebarTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open sidebar">
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </SidebarTrigger>
              </div>
               {selectedModel === 'llama3' && <Cpu size={18} className="mr-2 text-primary" />}
               {selectedModel === 'deepseek-r1' && <Brain size={18} className="mr-2 text-primary" />}
              <h1 className="text-base md:text-lg font-semibold text-foreground">GenAI Config Generator</h1>
              {selectedModel === 'llama3' && <Image src="/robo1.gif" alt="Llama 3 Robot" width={26} height={26} className="ml-2" unoptimized={true} />}
              {selectedModel === 'deepseek-r1' && <Image src="/robo2.gif" alt="Deepseek Robot" width={26} height={26} className="ml-2" unoptimized={true} />}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[140px] h-8 text-sm hover:shadow-md transition-shadow duration-300 ease-in-out">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llama3">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} /> Llama 3
                    </div>
                  </SelectItem>
                  <SelectItem value="deepseek-r1">
                     <div className="flex items-center gap-2">
                      <Brain size={16} /> Deepseek-R1
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <ThemeToggleButton />
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
             {editingMessage && activeConversationId ? (
                <div className="p-4 border-t border-border bg-card rounded-lg m-2">
                  <h3 className="text-sm font-semibold mb-2 text-card-foreground">Edit and resend message:</h3>
                  <Textarea
                    value={editingMessageText}
                    onChange={(e) => setEditingMessageText(e.target.value)}
                    className="mb-2 bg-input text-foreground border-input focus:ring-ring"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancelEditMessage} size="sm">Cancel</Button>
                    <Button onClick={handleSaveEditedMessage} size="sm">Save & Resend</Button>
                  </div>
                </div>
              ) : displaySampleQueries && !isLoading && !attachedFile ? (
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
                    onConfirmStandardization={handleStandardizationConfirmation}
                    activeConversationId={activeConversationId}
                    isLoading={isLoading}
                    selectedModel={selectedModel}
                 />
              )}
          </main>
          {!editingMessage && (
            <ChatInput
              value={chatInputValue}
              onValueChange={setChatInputValue}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              attachedFile={attachedFile}
              onFileAttach={handleFileAttach}
              onFileRemove={handleFileRemove}
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
