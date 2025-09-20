"use client"

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { ChatMessage, Chat } from "@/lib/types";

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>();
  const { userEmail } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  const fetchChatData = async () => {
    if (!chatId || !userEmail) return;
    
    try {
      // Get chat info and messages
      const [chatResponse, infoResponse] = await Promise.all([
        apiClient.getChatHistory(chatId, userEmail),
        apiClient.getChatInfo(chatId)
      ]);
      
      if (chatResponse.success) {
        setChat(chatResponse.chat);
        setMessages(chatResponse.messages || []);
      } else {
        setError(chatResponse.message || "Failed to load chat");
      }
      
      if (infoResponse.success) {
        setPropertyInfo(infoResponse.property);
      }
      
    } catch (err: any) {
      console.error("Error fetching chat data:", err);
      setError("Failed to load chat data");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !userEmail || sending) return;
    
    setSending(true);
    try {
      const response = await apiClient.sendMessage(chatId, userEmail, newMessage.trim());
      
      if (response.success && response.message) {
        // Add the new message to the local state
        const newMsg: ChatMessage = {
          message_id: response.message.message_id,
          sender_email: response.message.sender_email,
          message_text: response.message.message_text,
          timestamp: response.message.timestamp,
          read: false
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage("");
      } else {
        setError(response.message || "Failed to send message");
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Initial load
  useEffect(() => {
    if (!userEmail) {
      router.push('/'); // Redirect if not authenticated
      return;
    }
    fetchChatData();
  }, [chatId, userEmail]);

  // Set up polling for new messages
  useEffect(() => {
    if (chat && userEmail) {
      const interval = setInterval(() => {
        fetchChatData();
      }, 3000); // Poll every 3 seconds
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [chat, userEmail]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  const getOtherParticipant = () => {
    if (!chat || !userEmail) return "Other User";
    return chat.participants.find(p => p !== userEmail) || "Other User";
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen container mx-auto px-6 py-10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please log in to access chats</p>
          <Button onClick={() => router.push('/')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen container mx-auto px-6 py-10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading chat...</div>
        </div>
      </div>
    );
  }

  if (error && !chat) {
    return (
      <div className="min-h-screen container mx-auto px-6 py-10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2 text-red-500">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-6 py-10">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {propertyInfo && (
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{propertyInfo.title}</h1>
            <p className="text-sm text-muted-foreground">{propertyInfo.location} • {propertyInfo.type}</p>
          </div>
        )}
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Chat with {getOtherParticipant()}
                <Badge variant="outline" className="text-xs">Active</Badge>
              </CardTitle>
              <CardDescription>Property conversation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[50vh] rounded-md border p-3 bg-background/50">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.sender_email === userEmail;
                  const senderInitials = message.sender_email.substring(0, 2).toUpperCase();
                  
                  return (
                    <div 
                      key={message.message_id} 
                      className={`flex items-start gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-chart-2">{senderInitials}</AvatarFallback>
                        </Avatar>
                      )}
                      <div 
                        className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <div className="text-[11px] opacity-70 mb-0.5 flex justify-between items-center">
                          <span>{isCurrentUser ? "You" : message.sender_email}</span>
                          <span>{formatTimestamp(message.timestamp)}</span>
                        </div>
                        <div className="whitespace-pre-wrap">{message.message_text}</div>
                      </div>
                      {isCurrentUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-chart-3">YOU</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>
          
          {error && (
            <div className="mt-2 text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <div className="mt-3 flex gap-2">
            <Input 
              placeholder="Write a message..." 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              {sending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
