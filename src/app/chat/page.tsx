"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { getInitials, formatDateTime } from "@/lib/utils";
import {
  MessageSquare, Plus, Send, Paperclip, Search, Users, ArrowLeft,
  Loader2, FileText, Image as ImageIcon, Download, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { io, Socket } from "socket.io-client";

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  condoRole?: string;
}

interface ChannelMessage {
  id: string;
  channelId: string;
  userId: string;
  type: "text" | "file";
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMime?: string | null;
  createdAt: string;
  user: ChatUser;
}

interface Channel {
  id: string;
  type: "direct" | "group";
  name?: string | null;
  members: ChatUser[];
  lastMessage: { id: string; content: string; type: string; createdAt: string; userId: string } | null;
  unread: number;
  updatedAt: string;
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(mime?: string | null) {
  return !!mime && mime.startsWith("image/");
}

export default function ChatPage() {
  const { user, currentCondominiumId } = useAppStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const loadChannels = useCallback(async () => {
    if (!currentCondominiumId) return;
    setLoadingChannels(true);
    const res = await fetch(`/api/chat/channels?condominiumId=${currentCondominiumId}`);
    if (res.ok) setChannels(await res.json());
    setLoadingChannels(false);
  }, [currentCondominiumId]);

  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/chat/channels/${channelId}/messages`);
    if (res.ok) setMessages(await res.json());
    setLoadingMessages(false);
    // Marca como lido — recarrega channels pra atualizar contador
    loadChannels();
  }, [loadChannels]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  useEffect(() => {
    if (activeChannelId) loadMessages(activeChannelId);
    else setMessages([]);
  }, [activeChannelId, loadMessages]);

  // Socket.IO real-time
  useEffect(() => {
    if (!user) return;
    const s = io("/chat", { path: "/api/socket", transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("message", ({ channelId, message }: { channelId: string; message: ChannelMessage }) => {
      if (channelId === activeChannelId) {
        setMessages((prev) => prev.find((m) => m.id === message.id) ? prev : [...prev, message]);
      }
      // sempre atualiza a lista de canais
      loadChannels();
    });

    return () => { s.disconnect(); socketRef.current = null; };
  }, [user, activeChannelId, loadChannels]);

  // Entra/sai de room ao trocar de canal
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !activeChannelId) return;
    s.emit("join-channel", { channelId: activeChannelId });
    return () => { s.emit("leave-channel", { channelId: activeChannelId }); };
  }, [activeChannelId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUsers = useCallback(async () => {
    if (!currentCondominiumId) return;
    const res = await fetch(`/api/chat/users?condominiumId=${currentCondominiumId}`);
    if (res.ok) setUsers(await res.json());
  }, [currentCondominiumId]);

  const startDmWith = async (otherUser: ChatUser) => {
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        condominiumId: currentCondominiumId,
        type: "direct",
        memberIds: [otherUser.id],
      }),
    });
    if (res.ok) {
      const channel = await res.json();
      setNewDmOpen(false);
      await loadChannels();
      setActiveChannelId(channel.id);
    } else {
      toast.error("Erro ao iniciar conversa");
    }
  };

  const sendMessage = async (payload: Partial<ChannelMessage>) => {
    if (!activeChannelId) return;
    setSending(true);
    const res = await fetch(`/api/chat/channels/${activeChannelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const message = await res.json();
      setMessages((prev) => [...prev, message]);
      socketRef.current?.emit("broadcast", { channelId: activeChannelId, message });
      loadChannels();
    } else {
      toast.error("Erro ao enviar");
    }
    setSending(false);
  };

  const handleSendText = async () => {
    if (!text.trim()) return;
    const t = text.trim();
    setText("");
    await sendMessage({ type: "text", content: t });
  };

  const handleFile = async (file: File) => {
    if (!activeChannelId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const upRes = await fetch("/api/chat/upload", { method: "POST", body: fd });
    if (!upRes.ok) {
      const err = await upRes.json().catch(() => ({}));
      toast.error(err.error || "Erro no upload");
      setUploading(false);
      return;
    }
    const up = await upRes.json();
    await sendMessage({
      type: "file",
      content: up.name,
      fileUrl: up.url,
      fileName: up.name,
      fileSize: up.size,
      fileMime: up.mimeType,
    });
    setUploading(false);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const channelTitle = (c: Channel) => {
    if (c.type === "group") return c.name || "Grupo";
    const other = c.members.find((m) => m.id !== user?.id);
    return other?.name || "Conversa";
  };
  const channelSubtitle = (c: Channel) => {
    if (c.type === "group") return `${c.members.length} membros`;
    const other = c.members.find((m) => m.id !== user?.id);
    return other?.email || "";
  };

  const filteredChannels = search
    ? channels.filter((c) => channelTitle(c).toLowerCase().includes(search.toLowerCase()))
    : channels;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col gap-4 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chat interno</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comunicação entre administradores e síndicos · com troca de arquivos
            </p>
          </div>
          <Button
            onClick={() => { loadUsers(); setNewDmOpen(true); }}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3 min-h-0">
          {/* Channel list */}
          <Card className={cn(
            "flex flex-col min-h-0",
            activeChannelId && "hidden md:flex"
          )}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Buscar conversas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingChannels ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                  <Button
                    size="sm" variant="outline" className="mt-3 gap-1.5 text-xs"
                    onClick={() => { loadUsers(); setNewDmOpen(true); }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Iniciar conversa
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredChannels.map((c) => {
                    const other = c.members.find((m) => m.id !== user?.id);
                    const active = c.id === activeChannelId;
                    return (
                      <li
                        key={c.id}
                        onClick={() => setActiveChannelId(c.id)}
                        className={cn(
                          "p-3 cursor-pointer transition-colors hover:bg-muted",
                          active && "bg-blue-50 dark:bg-blue-500/15"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                              {c.type === "group"
                                ? <Users className="h-4 w-4" />
                                : getInitials(other?.name || "??")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">
                                {channelTitle(c)}
                              </p>
                              {c.lastMessage && (
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                  {new Date(c.lastMessage.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground truncate">
                                {c.lastMessage
                                  ? (c.lastMessage.type === "file" ? "📎 " + c.lastMessage.content : c.lastMessage.content)
                                  : channelSubtitle(c)}
                              </p>
                              {c.unread > 0 && (
                                <Badge className="h-4 min-w-4 px-1 text-[10px] bg-blue-600 text-white flex-shrink-0">
                                  {c.unread}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          {/* Thread */}
          <Card className={cn(
            "flex flex-col min-h-0",
            !activeChannelId && "hidden md:flex"
          )}>
            {!activeChannel ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
                <MessageSquare className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Selecione uma conversa</p>
                <p className="text-xs text-muted-foreground mt-1">para começar a conversar</p>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-border flex items-center gap-3">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 md:hidden"
                    onClick={() => setActiveChannelId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                      {activeChannel.type === "group"
                        ? <Users className="h-4 w-4" />
                        : getInitials(activeChannel.members.find((m) => m.id !== user?.id)?.name || "??")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {channelTitle(activeChannel)}
                    </p>
                    <p className="text-xs text-muted-foreground">{channelSubtitle(activeChannel)}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/20">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-muted-foreground">Sem mensagens ainda. Envie a primeira!</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMine = m.userId === user?.id;
                      const prev = messages[idx - 1];
                      const showAvatar = !prev || prev.userId !== m.userId;
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex gap-2 max-w-[85%]",
                            isMine ? "ml-auto flex-row-reverse" : ""
                          )}
                        >
                          <Avatar className={cn("h-7 w-7 flex-shrink-0", !showAvatar && "invisible")}>
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                              {getInitials(m.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("min-w-0", isMine ? "items-end" : "items-start", "flex flex-col")}>
                            {showAvatar && (
                              <p className={cn("text-[10px] text-muted-foreground mb-0.5 px-2", isMine && "text-right")}>
                                {isMine ? "Você" : m.user.name} · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                            {m.type === "text" ? (
                              <div className={cn(
                                "rounded-2xl px-3.5 py-2 text-sm break-words",
                                isMine
                                  ? "bg-blue-600 text-white rounded-tr-sm"
                                  : "bg-card border border-border text-slate-800 dark:text-slate-100 rounded-tl-sm"
                              )}>
                                {m.content}
                              </div>
                            ) : (
                              <a
                                href={m.fileUrl ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "rounded-2xl overflow-hidden border transition-all hover:shadow-md max-w-xs",
                                  isMine ? "border-blue-500/40 rounded-tr-sm" : "border-border rounded-tl-sm bg-card"
                                )}
                              >
                                {isImage(m.fileMime) ? (
                                  // Imagem inline
                                  <img
                                    src={m.fileUrl ?? ""}
                                    alt={m.fileName ?? "anexo"}
                                    className="block max-w-full max-h-64 object-cover"
                                  />
                                ) : (
                                  <div className={cn("p-3 flex items-center gap-3", isMine ? "bg-blue-600 text-white" : "")}>
                                    <div className={cn(
                                      "w-9 h-9 rounded flex items-center justify-center flex-shrink-0",
                                      isMine ? "bg-white/20" : "bg-blue-100 dark:bg-blue-500/15"
                                    )}>
                                      <FileText className={cn("h-4 w-4", isMine ? "text-white" : "text-blue-600 dark:text-blue-300")} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{m.fileName}</p>
                                      <p className={cn("text-[10px]", isMine ? "text-white/80" : "text-muted-foreground")}>
                                        {fmtSize(m.fileSize)}
                                      </p>
                                    </div>
                                    <Download className={cn("h-3.5 w-3.5 flex-shrink-0", isMine ? "text-white/80" : "text-muted-foreground")} />
                                  </div>
                                )}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  className="p-3 border-t border-border flex items-end gap-2"
                  onSubmit={(e) => { e.preventDefault(); handleSendText(); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button" variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Anexar arquivo"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Input
                    placeholder="Escreva uma mensagem..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={sending}
                  />
                  <Button
                    type="submit" disabled={!text.trim() || sending}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Enviar</span>
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Nova conversa */}
      <Dialog open={newDmOpen} onOpenChange={setNewDmOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum outro usuário neste condomínio. Convide administradores em Configurações.
              </p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDmWith(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email} · {u.condoRole || u.role}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
