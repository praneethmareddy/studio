
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
    // This effect ensures activeConversationId remains valid or sensible
    // if it's null and there are conversations, pick the most recent
    if (activeConversationId === null && conversations.length > 0) {
        const mostRecent = [...conversations].sort((a, b) => b.timestamp - a.timestamp)[0];
        setActiveConversationId(mostRecent.id);
    } 
    // if activeConversationId exists but the conversation itself was deleted
    else if (activeConversationId && !conversations.find(c => c.id === activeConversationId)) {
        const mostRecentAfterDeletion = conversations.length > 0 ? [...conversations].sort((a, b) => b.timestamp - a.timestamp)[0] : null;
        setActiveConversationId(mostRecentAfterDeletion ? mostRecentAfterDeletion.id : null);
    }
    // if conversations are empty, activeId should be null
    else if (conversations.length === 0 && activeConversationId !== null) {
        setActiveConversationId(null);
    }
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
                timestamp: Date.now(), 
              };
            }
            return conv;
          }).sort((a,b) => b.timestamp - a.timestamp)
        );
        charIndex++;
        streamTimeoutRef.current = setTimeout(appendNextCharacter, STREAM_DELAY_MS);
      } else {
        setIsLoading(false);
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
            // For general file uploads, backend might expect textual reference or just use the file with query
            messageTextForBackend = `[File Attached: ${file.name}] ${trimmedText}`.trim();
        }
    }
    
    if (!trimmedText && fileInfoForUserMessage && !messageTextForBackend.toLowerCase().includes("standardize this ciq")) { 
      // If only a file is attached without text (and not for standardization)
      displayMessageText = `File: ${fileInfoForUserMessage.name}`;
      messageTextForBackend = `File: ${fileInfoForUserMessage.name}`;
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: displayMessageText,
      sender: 'user',
      timestamp: Date.now(),
      file: fileInfoForUserMessage, // Store metadata of the *newly uploaded* file
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
    setAttachedFile(null); // Clear the globally attached file from ChatInput

    try {
      let backendResponse;
      const requestOptions: RequestInit = { method: 'POST' };

      if (file) { // If a file was *newly attached* for this message
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('query', messageTextForBackend); // Use the prepared query
        requestOptions.body = formData;
        // No 'Content-Type' header for FormData, browser sets it
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

            const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const blobUrl = URL.createObjectURL(blob);
            const filename = jsonResponse.filename || "standardized_ciq.xlsx"; 
            downloadableFileLocal = { name: filename, type: blob.type, blobUrl };
            
            aiResponseText = `Standardized CIQ '${filename}' is ready for download.`;
            if (unmatchedColsLocal && unmatchedColsLocal.length > 0) {
                aiResponseText += `\n\nSome columns were not found in the standard template. You'll be asked if you want to update the template.`;
            } else {
                aiResponseText += `\n\nAll columns matched the standard template.`;
            }
            toast({ title: "Standardization Complete", description: `'${filename}' is ready.` });
        } else if (jsonResponse.request_id || jsonResponse.unmatched_columns || jsonResponse.standardized_file_base64) {
            let debugMessage = "Standardization response from backend is incomplete. ";
            if (!jsonResponse.standardized_file_base64) debugMessage += "Missing 'standardized_file_base64'. ";
            if (!jsonResponse.request_id) debugMessage += "Missing 'request_id'. ";
            if (!jsonResponse.response && !jsonResponse.standardized_file_base64) debugMessage += "Also missing 'response' field for a fallback message.";
            console.warn("Incomplete standardization JSON from backend:", jsonResponse);
            aiResponseText = jsonResponse.response || debugMessage.trim();
            if (jsonResponse.request_id) {
              isStandardizationReqLocal = true; 
              standardizationReqIdLocal = jsonResponse.request_id;
              unmatchedColsLocal = jsonResponse.unmatched_columns;
              simMappingLocal = jsonResponse.similarity_mapping;
            }
        }
        else { // Regular text response
            aiResponseText = jsonResponse.response || "Received an empty response from the server.";
        }
      } else if (contentType && (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || contentType.includes("application/octet-stream"))) {
        // This case handles direct file downloads not part of standardization JSON (e.g., backend directly sends file)
        const blob = await backendResponse.blob();
        const contentDisposition = backendResponse.headers.get('Content-Disposition');
        let filename = "downloaded_file"; 
        if (contentType.includes("spreadsheetml.sheet")) filename += ".xlsx";

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch && filenameMatch.length > 1) {
                filename = filenameMatch[1];
            }
        }
        
        const blobUrl = URL.createObjectURL(blob);
        downloadableFileLocal = { name: filename, type: blob.type, blobUrl };
        aiResponseText = `File '${filename}' is ready for download. Successfully downloaded '${filename}'.`;
        toast({ title: "File Ready", description: `'${filename}' can now be downloaded from the chat.` });
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
        text: '', 
        sender: 'ai',
        timestamp: Date.now(),
        modelUsed: selectedModel,
        downloadableFile: downloadableFileLocal,
        isStandardizationRequest: isStandardizationReqLocal,
        standardizationRequestId: standardizationReqIdLocal,
        unmatchedColumns: unmatchedColsLocal,
        similarityMapping: simMappingLocal,
        isStandardizationConfirmed: false, // Initially false for new requests
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
    // An edited message must have text, even if the original only had a file.
    // If the original had a file and user clears text, they should probably delete or send new.
    // For simplicity, we'll require some text on edit if the goal is to get a new AI response.
    if (!trimmedEditingText) { 
      toast({ title: "Cannot resend empty message", description: "Please provide some text for the edited message.", variant: "destructive" });
      return;
    }

    const currentConvId = activeConversationId; 

    let textForBackend = trimmedEditingText;
    let displayUserText = trimmedEditingText;

    // If the ORIGINAL message being edited had a file, we include a reference to it in textForBackend
    // The backend will treat this as a text query; it won't re-process the original file bytes unless a new file is attached.
    if (editingMessage.file) {
        if (trimmedEditingText.toLowerCase().includes("standardize this ciq") || trimmedEditingText.toLowerCase().includes("standardize ciq")) {
            textForBackend = "standardize this CIQ"; // Keep it simple for backend
            // This will be a text-only request to backend. If backend requires a file for this query, it might error or ask for one.
            // The current frontend sends this as JSON, so backend's `if 'file' in request.files` will be false.
            // For true re-standardization of the *original* file on edit, user would need to re-attach, or backend needs more complex state.
            displayUserText = `Standardizing (edited): ${editingMessage.file.name} - ${trimmedEditingText}`;
        } else {
            textForBackend = `[File Referenced: ${editingMessage.file.name}] ${trimmedEditingText}`.trim();
            displayUserText = textForBackend; // Display what's sent
        }
    }
    
    let updatedUserMessage: Message | null = null;
    let baseMessagesForNewAIResponse: Message[] = [];

    // Update the user message in place and truncate subsequent messages
    setConversations(prevConvs => {
      const convIndex = prevConvs.findIndex(conv => conv.id === currentConvId);
      if (convIndex === -1) return prevConvs;

      const targetConversation = prevConvs[convIndex];
      const messageIndex = targetConversation.messages.findIndex(msg => msg.id === editingMessage.id);
      if (messageIndex === -1) return prevConvs;

      // Clean up blobUrls for AI messages that will be removed
      for (let i = messageIndex + 1; i < targetConversation.messages.length; i++) {
        if (targetConversation.messages[i].downloadableFile?.blobUrl) {
          URL.revokeObjectURL(targetConversation.messages[i].downloadableFile.blobUrl);
        }
      }

      updatedUserMessage = {
        ...targetConversation.messages[messageIndex],
        text: displayUserText, // Use the display text which might reference the file
        timestamp: Date.now(),
        // Keep original file info IF it existed. It's just metadata now for display.
        file: editingMessage.file 
      };
      
      baseMessagesForNewAIResponse = [
        ...targetConversation.messages.slice(0, messageIndex),
        updatedUserMessage, 
      ];
      
      const updatedConv = {
        ...targetConversation,
        messages: baseMessagesForNewAIResponse, 
        timestamp: Date.now(), // Update conversation timestamp
      };
      
      const newConvs = [...prevConvs];
      newConvs[convIndex] = updatedConv;
      return newConvs.sort((a, b) => b.timestamp - a.timestamp);
    });
    
    // Ensure state update has propagated before proceeding
    await new Promise(resolve => setTimeout(resolve, 0)); 

    setEditingMessage(null); // Clear editing state
    setEditingMessageText('');
    setIsLoading(true);
    toast({ title: "Resending edited message..." });

    try {
      // For edits, we always send a JSON request. The backend will not receive file bytes.
      // If the 'textForBackend' implies a file operation (like "standardize this CIQ"),
      // the backend needs to handle the absence of `request.files` gracefully.
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textForBackend, model: selectedModel }),
      };
      
      console.log("Resending edited message with options:", requestOptions); // Debug log

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

      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await backendResponse.json();
        if (jsonResponse.error) throw new Error(jsonResponse.error);

        if (jsonResponse.standardized_file_base64 && jsonResponse.request_id) {
            isStandardizationReqLocal = true;
            standardizationReqIdLocal = jsonResponse.request_id;
            unmatchedColsLocal = jsonResponse.unmatched_columns;
            simMappingLocal = jsonResponse.similarity_mapping;
            const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const blobUrl = URL.createObjectURL(blob);
            const filename = jsonResponse.filename || "standardized_ciq.xlsx";
            downloadableFileLocal = { name: filename, type: blob.type, blobUrl };
            aiResponseText = `Standardized CIQ '${filename}' is ready for download.`;
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
            }
        }
         else { // Regular text response
            aiResponseText = jsonResponse.response || "Received an empty response from the server.";
        }
      } else if (contentType && (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || contentType.includes("application/octet-stream"))) {
        // This path for edits is less likely if backend sends standardization via JSON, but kept for robustness
        const blob = await backendResponse.blob();
        const contentDisposition = backendResponse.headers.get('Content-Disposition');
        let filename = "downloaded_file";
        if (contentType.includes("spreadsheetml.sheet")) filename += ".xlsx";
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
          if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
        }
        const blobUrl = URL.createObjectURL(blob);
        downloadableFileLocal = { name: filename, type: blob.type, blobUrl };
        aiResponseText = `File '${filename}' is ready for download.`;
        toast({ title: "File Ready", description: `'${filename}' can now be downloaded from the chat.`});
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
        text: '', 
        sender: 'ai',
        timestamp: Date.now(),
        modelUsed: selectedModel,
        downloadableFile: downloadableFileLocal,
        isStandardizationRequest: isStandardizationReqLocal,
        standardizationRequestId: standardizationReqIdLocal,
        unmatchedColumns: unmatchedColsLocal,
        similarityMapping: simMappingLocal,
        isStandardizationConfirmed: false, // New AI response, confirmation reset
      };

      // Append the new AI message to the (already truncated) conversation
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
         setIsLoading(false); // Should not happen if currentConvId was valid before
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
      // Append error AI message to the (already truncated) conversation
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
              // Clean up blobUrls for all messages being removed
              const messagesToClean = conv.messages.slice(messageIndex);
              messagesToClean.forEach(msgToClean => {
                  if (msgToClean.downloadableFile?.blobUrl) {
                      URL.revokeObjectURL(msgToClean.downloadableFile.blobUrl);
                  }
              });
              const updatedMessages = conv.messages.slice(0, messageIndex);
              return {
                ...conv,
                messages: updatedMessages,
                // Update timestamp if messages remain, otherwise keep old (or let deleteConversation handle if it becomes empty)
                timestamp: updatedMessages.length > 0 ? Date.now() : conv.timestamp 
              };
            }
          }
          return conv;
        }).filter(conv => { 
            // This filter might be too aggressive if a convo becomes empty due to message deletion.
            // It's better to let users explicitly delete empty conversations.
            // For now, keep convos even if messages array becomes empty via this action.
            return true; 
         })
         .sort((a,b) => b.timestamp - a.timestamp) // Re-sort after potential timestamp updates
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
    // This generic download is primarily for text content.
    // File downloads from AI (like standardized CIQs) are handled by buttons directly on ChatMessage.
    const conversation = conversations.find(c => c.id === activeConversationId);
    const message = conversation?.messages.find(m => m.id === messageId && m.sender === 'ai');
    
    if (message?.downloadableFile?.blobUrl && message.text.includes(message.downloadableFile.name)) {
        // If it's a file-centric AI message, prompt to use its dedicated download button.
        toast({title: "Info", description: `Use the download button for '${message.downloadableFile.name}' on the message itself.`});
    } else if (message?.text) { // Download plain text if no specific downloadable file or if it's primarily a text message
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

    setConversations(prevConvs => {
        const convIndex = prevConvs.findIndex(c => c.id === currentConvId);
        if (convIndex === -1) return prevConvs;

        const currentConversationForRegen = prevConvs[convIndex];
        const aiMessageIndex = currentConversationForRegen.messages.findIndex(msg => msg.id === aiMessageIdToRegenerate && msg.sender === 'ai');

        if (aiMessageIndex <= 0) { 
            toast({ title: "Error", description: "Cannot regenerate. No preceding user prompt found.", variant: "destructive" });
            return prevConvs;
        }
        
        // Clean up blobUrl for the AI message being regenerated, if any
        if (currentConversationForRegen.messages[aiMessageIndex]?.downloadableFile?.blobUrl) {
            URL.revokeObjectURL(currentConversationForRegen.messages[aiMessageIndex].downloadableFile.blobUrl);
        }

        promptingUserMessage = currentConversationForRegen.messages[aiMessageIndex - 1];
        if (promptingUserMessage.sender !== 'user') {
            toast({ title: "Error", description: "Cannot regenerate. Preceding message is not from user.", variant: "destructive" });
            return prevConvs;
        }
        
        // Truncate messages up to and including the prompting user message
        baseMessagesForRegen = currentConversationForRegen.messages.slice(0, aiMessageIndex -1); 
        baseMessagesForRegen.push(promptingUserMessage);


        const updatedConvs = [...prevConvs];
        updatedConvs[convIndex] = {
            ...currentConversationForRegen,
            messages: baseMessagesForRegen, // Set messages to only those up to the user prompt
            timestamp: Date.now(), // Update conversation timestamp
        };
        return updatedConvs.sort((a, b) => b.timestamp - a.timestamp);
    });
    
    await new Promise(resolve => setTimeout(resolve, 0)); // Ensure state update before proceeding
    
    if (!promptingUserMessage || !currentConvId) {
        // This should not happen if the above logic is correct
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    toast({ title: "Regenerating AI response..." });
    
    let queryTextForBackend = promptingUserMessage.text;
    const requestOptions: RequestInit = { method: 'POST' };

    // For regeneration, if the original user message involved a file,
    // the queryTextForBackend should already reflect that (e.g., "Standardizing: file.xlsx" or "[File Attached: file.xlsx] text").
    // We will send a JSON request. The backend must handle this contextually if it needs file bytes (which it won't receive here).
    if (promptingUserMessage.file) {
        // queryTextForBackend is already prepared from promptingUserMessage.text
        // Example: if original was "standardize this ciq" with a file, promptingUserMessage.text is "Standardizing: file.name"
        // If it was a generic file query, text is "[File Attached: file.name] actual_query"
        // The backend's `if 'file' in request.files` will be false.
    }
    
    requestOptions.headers = { 'Content-Type': 'application/json' };
    requestOptions.body = JSON.stringify({ query: queryTextForBackend, model: selectedModel });


    try {
        const backendResponse = await fetch('http://localhost:5000/query', requestOptions);

        if (!backendResponse.ok) {
            const errorData = await backendResponse.text();
            throw new Error(`HTTP error! status: ${backendResponse.status}, message: ${errorData}`);
        }
        
        const contentType = backendResponse.headers.get("content-type");
        let aiResponseText = "";
        let downloadableFileLocal: Message['downloadableFile'] | undefined = undefined;
        let isStandardizationReqLocal = false;
        let standardizationReqIdLocal: string | undefined = undefined;
        let unmatchedColsLocal: string[] | undefined = undefined;
        let simMappingLocal: Record<string, string> | undefined = undefined;


      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await backendResponse.json();
        if (jsonResponse.error) throw new Error(jsonResponse.error);
        
        if (jsonResponse.standardized_file_base64 && jsonResponse.request_id) {
            // This path might be hit if the regenerated query was for standardization
            isStandardizationReqLocal = true;
            standardizationReqIdLocal = jsonResponse.request_id;
            unmatchedColsLocal = jsonResponse.unmatched_columns;
            simMappingLocal = jsonResponse.similarity_mapping;
            const blob = base64ToBlob(jsonResponse.standardized_file_base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const blobUrl = URL.createObjectURL(blob);
            const filename = jsonResponse.filename || "standardized_ciq.xlsx";
            downloadableFileLocal = { name: filename, type: blob.type, blobUrl };
            aiResponseText = `Standardized CIQ '${filename}' is ready for download.`;
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
            }
        }
         else { // Regular text response
            aiResponseText = jsonResponse.response || "Received an empty response from the server.";
        }
        } else if (contentType && (contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || contentType.includes("application/octet-stream"))) {
            // Direct file download response
            const blob = await backendResponse.blob();
            const contentDisposition = backendResponse.headers.get('Content-Disposition');
            let filename = "downloaded_file";
            if (contentType.includes("spreadsheetml.sheet")) filename += ".xlsx";
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
            }
            const blobUrl = URL.createObjectURL(blob);
            downloadableFileLocal = { name: filename, type: blob.type, blobUrl };
            aiResponseText = `File '${filename}' is ready for download.`;
            toast({ title: "File Ready", description: `'${filename}' can now be downloaded from the chat.`});
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
            text: '', 
            sender: 'ai',
            timestamp: Date.now(),
            modelUsed: selectedModel, 
            downloadableFile: downloadableFileLocal,
            isStandardizationRequest: isStandardizationReqLocal,
            standardizationRequestId: standardizationReqIdLocal,
            unmatchedColumns: unmatchedColsLocal,
            similarityMapping: simMappingLocal,
            isStandardizationConfirmed: false, // Reset for new AI response
        };
        
        // Append the new AI message to baseMessagesForRegen
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
        // Append error AI message to baseMessagesForRegen
        setConversations(prevConvs =>
            prevConvs.map(conv => {
                 if (conv.id === currentConvId) {
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
        const errorData = await response.json(); // Assuming error response is JSON
        throw new Error(errorData.error || `Failed to confirm update: ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: "Confirmation Sent",
        description: result.message || (decision === 'yes' ? "Standard template update initiated." : "No changes made to standard template."),
      });

      // Update the message to reflect confirmation
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
              timestamp: Date.now(), // Update conversation timestamp
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
        ? { ...conv, title: editingConversationTitleText, timestamp: Date.now() } // Update timestamp on title edit
        : conv
    ).sort((a,b) => b.timestamp - a.timestamp)); 
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
            // Clean up blobUrls for the conversation being deleted
            const convToDelete = prevConversations.find(c => c.id === conversationId);
            convToDelete?.messages.forEach(msg => {
                if (msg.downloadableFile?.blobUrl) {
                    URL.revokeObjectURL(msg.downloadableFile.blobUrl);
                }
            });

            const newConversations = prevConversations.filter(conv => conv.id !== conversationId);
            if (activeConversationId === conversationId) { // If deleting active conversation
                if (newConversations.length > 0) {
                    // Select the most recent remaining conversation
                    const mostRecent = [...newConversations].sort((a, b) => b.timestamp - a.timestamp)[0];
                    setActiveConversationId(mostRecent.id);
                } else {
                    setActiveConversationId(null); // No conversations left
                }
            }
            return newConversations; // No need to re-sort here, filter preserves order or sort happens in useEffect
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
        // Clean up all blobUrls
        conversations.forEach(conv => {
            conv.messages.forEach(msg => {
                if (msg.downloadableFile?.blobUrl) {
                    URL.revokeObjectURL(msg.downloadableFile.blobUrl);
                }
            });
        });
        setConversations([]); 
        setActiveConversationId(null); 
        toast({ title: "All conversations deleted" });
        setAlertDialogState(prev => ({ ...prev, isOpen: false }));
      },
      confirmText: "Delete All",
      cancelText: "Cancel"
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
                    GenAI Config Generator
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
              size="sm"
              onClick={handleNewChat}
              className="w-full flex items-center justify-start text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-lg group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-start hover:animate-shadow-pulse"
              title="New Chat"
            >
              <SquarePen size={16} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
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
                className="w-full h-9 pl-10 pr-3 text-sm bg-input border-input focus:ring-ring"
                value={sidebarSearchTerm}
                onChange={(e) => setSidebarSearchTerm(e.target.value)}
              />
               {sidebarSearchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
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
                          <Button variant="ghost" size="icon" onClick={handleSaveEditedConversationTitle} className="h-8 w-8 text-primary hover:text-primary/80"><Save size={16}/></Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditConversationTitle} className="h-8 w-8 text-destructive hover:text-destructive/80"><X size={16}/></Button>
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
                              <MessageSquare size={16} className="text-muted-foreground group-data-[[data-active=true]]/conv-item:text-inherit group-data-[collapsible=icon]:text-foreground flex-shrink-0" />
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
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenuButton
            onClick={handleDeleteAllConversations}
            tooltip={{ children: "Delete All Chats", side: 'right', align: 'center' }}
            className="w-full group-data-[collapsible=icon]:justify-center text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!text-destructive focus-visible:!text-destructive"
          >
            <Trash2 size={18} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              Delete All Chats
            </span>
          </SidebarMenuButton>
          <SidebarMenuButton
            tooltip={{ children: "User Profile", side: 'right', align: 'center' }}
            className="w-full group-data-[collapsible=icon]:justify-center"
          >
            <User size={18} className="flex-shrink-0 group-data-[collapsible=icon]:mx-auto" />
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
                    <PanelLeft className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
              </div>
               {selectedModel === 'llama3' && <Cpu size={20} className="mr-2 text-primary" />}
               {selectedModel === 'deepseek-r1' && <Brain size={20} className="mr-2 text-primary" />}
              <h1 className="text-lg md:text-xl font-semibold text-foreground">GenAI Config Generator</h1>
              {selectedModel === 'llama3' && <Image src="/robo1.gif" alt="Llama 3 Robot" width={30} height={30} className="ml-2" unoptimized={true} />}
              {selectedModel === 'deepseek-r1' && <Image src="/robo2.gif" alt="Deepseek Robot" width={30} height={30} className="ml-2" unoptimized={true} />}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[150px] h-9 text-sm hover:shadow-md transition-shadow duration-300 ease-in-out">
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

