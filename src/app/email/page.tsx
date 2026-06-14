"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDateTime, getInitials } from "@/lib/utils";
import {
  Inbox, Send, FileEdit, Trash2, Star, Search, Plus,
  RefreshCw, ChevronLeft, Paperclip, Reply, ArrowLeft, Loader2, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Folder = "inbox" | "sent" | "drafts" | "trash";

interface Attachment {
  id: string; name: string; url: string; size: number; mimeType?: string | null;
}

interface Email {
  id: string;
  fromAddress: string;
  fromName?: string | null;
  toAddress: string;
  cc?: string | null;
  subject: string;
  body: string;
  folder: Folder;
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  attachments: Attachment[];
}

const FOLDERS: { value: Folder; label: string; icon: React.ElementType }[] = [
  { value: "inbox",  label: "Caixa de entrada", icon: Inbox },
  { value: "sent",   label: "Enviados",         icon: Send },
  { value: "drafts", label: "Rascunhos",        icon: FileEdit },
  { value: "trash",  label: "Lixeira",          icon: Trash2 },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function EmailPage() {
  const { user, currentCondominiumId } = useAppStore();
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [counts, setCounts] = useState<Record<Folder, number>>({ inbox: 0, sent: 0, drafts: 0, trash: 0 });
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    toAddress: "", cc: "", subject: "", body: "",
  });
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ folder });
    if (search) params.append("search", search);
    if (currentCondominiumId) params.append("condominiumId", currentCondominiumId);
    const res = await fetch(`/api/emails?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEmails(data.emails);
      const c: Record<Folder, number> = { inbox: 0, sent: 0, drafts: 0, trash: 0 };
      for (const item of data.counts) {
        c[item.folder as Folder] = item._count;
      }
      setCounts(c);
      setUnread(data.unread);
    }
    setLoading(false);
  }, [folder, search, currentCondominiumId]);

  useEffect(() => { load(); }, [load]);

  // Auto-mark as read quando o usuário abre um e-mail da inbox
  useEffect(() => {
    if (!selected) return;
    if (selected.isRead) return;
    fetch(`/api/emails/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    }).then(() => load());
  }, [selected]);

  const handleSend = async () => {
    if (!composeForm.toAddress || !composeForm.subject) return;
    setSending(true);
    const res = await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...composeForm,
        condominiumId: currentCondominiumId,
      }),
    });
    if (res.ok) {
      toast.success("E-mail enviado!");
      setComposeOpen(false);
      setComposeForm({ toAddress: "", cc: "", subject: "", body: "" });
      load();
    } else {
      toast.error("Erro ao enviar");
    }
    setSending(false);
  };

  const handleSaveDraft = async () => {
    if (!composeForm.toAddress && !composeForm.subject) {
      setComposeOpen(false);
      return;
    }
    await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...composeForm,
        condominiumId: currentCondominiumId,
        saveAsDraft: true,
      }),
    });
    toast.success("Rascunho salvo");
    setComposeOpen(false);
    setComposeForm({ toAddress: "", cc: "", subject: "", body: "" });
    load();
  };

  const handleDelete = async (e: Email) => {
    const res = await fetch(`/api/emails/${e.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(e.folder === "trash" ? "E-mail excluído" : "Movido para lixeira");
      setSelected(null);
      load();
    }
  };

  const toggleStar = async (e: Email) => {
    await fetch(`/api/emails/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !e.isStarred }),
    });
    load();
    if (selected?.id === e.id) setSelected({ ...selected, isStarred: !selected.isStarred });
  };

  const handleReply = (orig: Email) => {
    setComposeForm({
      toAddress: orig.fromAddress,
      cc: "",
      subject: orig.subject.startsWith("Re: ") ? orig.subject : `Re: ${orig.subject}`,
      body: `\n\n---\nEm ${formatDateTime(orig.createdAt)}, ${orig.fromName || orig.fromAddress} escreveu:\n${orig.body.split("\n").map((l) => "> " + l).join("\n")}`,
    });
    setComposeOpen(true);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col gap-4 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">E-mail</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Caixa profissional · {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setComposeOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Novo e-mail
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[200px_360px_1fr] gap-3 min-h-0">
          {/* Folder rail */}
          <Card className="p-2 h-fit">
            <nav className="space-y-0.5">
              {FOLDERS.map((f) => {
                const Icon = f.icon;
                const active = folder === f.value;
                const count = f.value === "inbox" ? unread : counts[f.value] || 0;
                return (
                  <button
                    key={f.value}
                    onClick={() => { setFolder(f.value); setSelected(null); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                      active
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{f.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{count}</Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </Card>

          {/* Message list */}
          <Card className={cn(
            "flex flex-col min-h-0",
            selected && "hidden lg:flex"
          )}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Buscar em e-mails..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Mail className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum e-mail encontrado</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {emails.map((e) => {
                    const isSent = folder === "sent" || folder === "drafts";
                    const display = isSent ? e.toAddress : (e.fromName || e.fromAddress);
                    return (
                      <li
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className={cn(
                          "p-3 cursor-pointer transition-colors hover:bg-muted",
                          selected?.id === e.id && "bg-blue-50 dark:bg-blue-500/15",
                          !e.isRead && folder === "inbox" && "bg-card"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            className={cn(
                              "mt-0.5 transition-colors",
                              e.isStarred ? "text-yellow-500 dark:text-yellow-300" : "text-slate-300 dark:text-slate-600 hover:text-yellow-500"
                            )}
                            onClick={(ev) => { ev.stopPropagation(); toggleStar(e); }}
                          >
                            <Star className="h-4 w-4" fill={e.isStarred ? "currentColor" : "none"} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn(
                                "text-sm truncate",
                                !e.isRead && folder === "inbox" ? "font-bold text-slate-900 dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-200"
                              )}>
                                {display}
                              </p>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {new Date(e.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              </span>
                            </div>
                            <p className={cn(
                              "text-sm truncate mt-0.5",
                              !e.isRead && folder === "inbox" ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"
                            )}>
                              {e.subject || "(sem assunto)"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {e.body.replace(/\n/g, " ").slice(0, 80)}
                            </p>
                            {e.attachments.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                {e.attachments.length} anexo{e.attachments.length > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          {/* Preview */}
          <Card className={cn(
            "flex flex-col min-h-0",
            !selected && "hidden lg:flex"
          )}>
            {selected ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 lg:hidden"
                    onClick={() => setSelected(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-base font-semibold flex-1 truncate">{selected.subject || "(sem assunto)"}</h2>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => handleReply(selected)}>
                    <Reply className="h-3.5 w-3.5" /> Responder
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-300 hover:text-red-700"
                    onClick={() => handleDelete(selected)}
                    title={selected.folder === "trash" ? "Excluir definitivamente" : "Mover para lixeira"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 border-b border-border flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                      {getInitials(selected.fromName || selected.fromAddress)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {selected.fromName || selected.fromAddress}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.fromAddress} · para {selected.toAddress}
                    </p>
                    {selected.cc && (
                      <p className="text-xs text-muted-foreground">cc: {selected.cc}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(selected.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {selected.body}
                  </div>
                  {selected.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Anexos ({selected.attachments.length})
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {selected.attachments.map((a) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
                          >
                            <div className="w-9 h-9 rounded bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                              <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <p className="text-xs text-muted-foreground">{formatSize(a.size)}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
                <Mail className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Selecione um e-mail</p>
                <p className="text-xs text-muted-foreground mt-1">para visualizar o conteúdo</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Compose */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Novo e-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Para *</Label>
              <Input
                placeholder="destinatario@exemplo.com"
                value={composeForm.toAddress}
                onChange={(e) => setComposeForm({ ...composeForm, toAddress: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cc</Label>
              <Input
                placeholder="copia@exemplo.com"
                value={composeForm.cc}
                onChange={(e) => setComposeForm({ ...composeForm, cc: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assunto *</Label>
              <Input
                placeholder="Assunto"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                rows={10}
                placeholder="Escreva sua mensagem..."
                value={composeForm.body}
                onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSaveDraft} disabled={sending}>
              Salvar rascunho
            </Button>
            <Button
              onClick={handleSend}
              disabled={!composeForm.toAddress || !composeForm.subject || sending}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Send className="h-3.5 w-3.5" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
