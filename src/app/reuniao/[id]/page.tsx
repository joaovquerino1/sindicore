"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, PhoneOff,
  Users, Shield, Loader2,
  MessageSquare, Send, X, VideoOff as CamOffIcon,
  Bold, Italic, Underline, Code2, Settings,
  Camera, Volume2, FileText, Save, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Peer { id: string; name: string; stream: MediaStream | null; pc: RTCPeerConnection; }
interface ChatMessage { id: string; from: string; name: string; text: string; timestamp: number; }

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── Markdown inline renderer ─────────────────────────────────────────────────

function renderMessage(text: string): React.ReactNode {
  const parseInline = (line: string, keyBase: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Order matters: ** before *
    const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|`(.+?)`/g;
    let last = 0;
    let k = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      const key = `${keyBase}-${k++}`;
      if (m[1] !== undefined)
        parts.push(<strong key={key}>{m[1]}</strong>);
      else if (m[2] !== undefined)
        parts.push(<em key={key}>{m[2]}</em>);
      else if (m[3] !== undefined)
        parts.push(<u key={key}>{m[3]}</u>);
      else if (m[4] !== undefined)
        parts.push(<code key={key} className="bg-black/25 px-1 py-0.5 rounded text-[11px] font-mono">{m[4]}</code>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };

  const nodes: React.ReactNode[] = [];
  text.split("\n").forEach((line, i) => {
    if (i > 0) nodes.push(<br key={`br-${i}`} />);
    nodes.push(...parseInline(line, `l${i}`));
  });
  return <>{nodes}</>;
}

// ─── Device enumeration ───────────────────────────────────────────────────────

async function listDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return {
      video: all.filter((d) => d.kind === "videoinput"),
      audio: all.filter((d) => d.kind === "audioinput"),
    };
  } catch {
    return { video: [], audio: [] };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useMeeting(
  roomId: string,
  myName: string,
  active: boolean,
  initVideoDeviceId: string,
  initAudioDeviceId: string,
) {
  const [myId, setMyId]             = useState<string | null>(null);
  const [peers, setPeers]           = useState<Map<string, Peer>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn]           = useState(true);
  const [camOn, setCamOn]           = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connected, setConnected]   = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [unread, setUnread]         = useState(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [assemblyMode, setAssemblyMode] = useState(false);

  const socketRef      = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef       = useRef<Map<string, Peer>>(new Map());
  const chatOpenRef    = useRef(false);
  const initVideoRef   = useRef(initVideoDeviceId);
  const initAudioRef   = useRef(initAudioDeviceId);
  const micOnRef       = useRef(true);

  peersRef.current = peers;
  micOnRef.current = micOn;

  // ── 1. Get local media (once, on join) ────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let acquired: MediaStream | null = null;

    (async () => {
      const vId = initVideoRef.current;
      const aId = initAudioRef.current;
      const video: MediaTrackConstraints | boolean = vId ? { deviceId: { exact: vId } } : true;
      const audio: MediaTrackConstraints | boolean = aId ? { deviceId: { exact: aId } } : true;

      try {
        acquired = await navigator.mediaDevices.getUserMedia({ video, audio });
      } catch {
        try {
          acquired = await navigator.mediaDevices.getUserMedia({ video: false, audio });
          setCamOn(false);
        } catch {
          setMediaError(true);
        }
      }
      if (acquired) {
        localStreamRef.current = acquired;
        setLocalStream(acquired);
      }

      // Enumerate devices (labels available only after permission granted)
      const devs = await listDevices();
      setVideoDevices(devs.video);
      setAudioDevices(devs.audio);
    })();

    return () => { acquired?.getTracks().forEach((t) => t.stop()); };
  }, [active]);

  // ── 2. Late track injection ───────────────────────────────────────────────
  useEffect(() => {
    if (!localStream) return;
    peersRef.current.forEach((peer) => {
      localStream.getTracks().forEach((track) => {
        const already = peer.pc.getSenders().some((s) => s.track?.kind === track.kind);
        if (!already) peer.pc.addTrack(track, localStream);
      });
    });
  }, [localStream]);

  // ── 3. Signaling ──────────────────────────────────────────────────────────
  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localStreamRef.current?.getTracks().forEach((t) =>
      pc.addTrack(t, localStreamRef.current!)
    );
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit("ice-candidate", { to: peerId, candidate });
    };
    pc.ontrack = ({ streams }) => {
      const stream = streams[0];
      setPeers((prev) => {
        const next = new Map(prev);
        const ex = next.get(peerId);
        if (ex) next.set(peerId, { ...ex, stream });
        return next;
      });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
    };
    return pc;
  }, []);

  useEffect(() => {
    if (!active || !myName || !roomId) return;

    const socket = io({ path: "/api/socket", transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", { roomId, name: myName });
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("room-info", async ({ myId: id, peers: existing }: { myId: string; peers: { id: string; name: string }[] }) => {
      setMyId(id);
      for (const { id: peerId, name } of existing) {
        const pc = createPC(peerId);
        setPeers((prev) => { const n = new Map(prev); n.set(peerId, { id: peerId, name, stream: null, pc }); return n; });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: peerId, sdp: offer });
      }
    });

    socket.on("peer-joined", ({ id: peerId, name }: { id: string; name: string }) => {
      const pc = createPC(peerId);
      setPeers((prev) => { const n = new Map(prev); n.set(peerId, { id: peerId, name, stream: null, pc }); return n; });
    });

    socket.on("offer", async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      let peer = peersRef.current.get(from);
      if (!peer) {
        const pc = createPC(from);
        peer = { id: from, name: "Participante", stream: null, pc };
        setPeers((prev) => { const n = new Map(prev); n.set(from, peer!); return n; });
      }
      await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, sdp: answer });
    });

    socket.on("answer", async ({ from, sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current.get(from);
      if (peer) await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.get(from);
      if (peer && candidate) try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    socket.on("peer-left", ({ id: peerId }: { id: string }) => {
      peersRef.current.get(peerId)?.pc.close();
      setPeers((prev) => { const n = new Map(prev); n.delete(peerId); return n; });
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpenRef.current) setUnread((c) => c + 1);
    });

    socket.on("assembly-mode", ({ enabled }: { enabled: boolean }) => {
      setAssemblyMode(enabled);
      if (enabled) {
        localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = false; });
        setCamOn(false);
      }
    });

    return () => {
      socket.disconnect();
      peersRef.current.forEach((p) => p.pc.close());
    };
  }, [active, myName, roomId, createPC]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setMicOn((v) => !v);
  }, []);

  const toggleCam = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setCamOn((v) => !v);
  }, []);

  const toggleScreen = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    if (screenSharing) {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = cam.getVideoTracks()[0];
        peersRef.current.forEach((p) => {
          p.pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track);
        });
        stream.getVideoTracks()[0]?.stop();
        stream.removeTrack(stream.getVideoTracks()[0]);
        stream.addTrack(track);
        setLocalStream(new MediaStream(stream.getTracks()));
        setScreenSharing(false); setCamOn(true);
      } catch {}
    } else {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = display.getVideoTracks()[0];
        peersRef.current.forEach((p) => {
          p.pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track);
        });
        stream.getVideoTracks()[0]?.stop();
        stream.removeTrack(stream.getVideoTracks()[0]);
        stream.addTrack(track);
        setLocalStream(new MediaStream(stream.getTracks()));
        setScreenSharing(true);
        track.onended = () => toggleScreen();
      } catch {}
    }
  }, [screenSharing]);

  // ── Switch camera device ──────────────────────────────────────────────────
  const changeCamera = useCallback(async (deviceId: string) => {
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
      const track = ns.getVideoTracks()[0];
      if (!track) return;
      peersRef.current.forEach((p) =>
        p.pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track)
      );
      const cur = localStreamRef.current;
      if (cur) {
        cur.getVideoTracks()[0]?.stop();
        cur.getVideoTracks().forEach((t) => cur.removeTrack(t));
        cur.addTrack(track);
        const updated = new MediaStream(cur.getTracks());
        localStreamRef.current = updated;
        setLocalStream(updated);
      }
    } catch {}
  }, []);

  // ── Switch microphone device ──────────────────────────────────────────────
  const changeMic = useCallback(async (deviceId: string) => {
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
      const track = ns.getAudioTracks()[0];
      if (!track) return;
      track.enabled = micOnRef.current;
      peersRef.current.forEach((p) =>
        p.pc.getSenders().find((s) => s.track?.kind === "audio")?.replaceTrack(track)
      );
      const cur = localStreamRef.current;
      if (cur) {
        cur.getAudioTracks()[0]?.stop();
        cur.getAudioTracks().forEach((t) => cur.removeTrack(t));
        cur.addTrack(track);
        const updated = new MediaStream(cur.getTracks());
        localStreamRef.current = updated;
        setLocalStream(updated);
      }
    } catch {}
  }, []);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.emit("chat-message", { text });
  }, []);

  const openChat = useCallback((open: boolean) => {
    chatOpenRef.current = open;
    if (open) setUnread(0);
  }, []);

  const toggleAssemblyMode = useCallback((enabled: boolean) => {
    socketRef.current?.emit("set-assembly-mode", { enabled });
  }, []);

  const leave = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((p) => p.pc.close());
    socketRef.current?.disconnect();
    window.location.href = "/assembleias";
  }, []);

  return {
    myId, peers, localStream, mediaError,
    micOn, camOn, screenSharing, connected,
    messages, unread, assemblyMode,
    videoDevices, audioDevices,
    toggleMic, toggleCam, toggleScreen,
    changeCamera, changeMic,
    sendMessage, openChat, toggleAssemblyMode, leave,
  };
}

// ─── VideoTile ────────────────────────────────────────────────────────────────

function VideoTile({ stream, name, muted = false, isMe = false }: {
  stream: MediaStream | null; name: string; muted?: boolean; isMe?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);

  return (
    <div className="relative w-full h-full bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center min-h-0">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{isMe ? "Sua câmera" : name}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-xs px-2 py-0.5 rounded-md text-white">
        {isMe ? <span className="text-green-400 font-medium">Você</span> : name}
      </div>
    </div>
  );
}

function gridCols(n: number) {
  if (n <= 1) return "grid-cols-1";
  if (n <= 2) return "grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-3";
  return "grid-cols-4";
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, myId, onSend, onClose }: {
  messages: ChatMessage[];
  myId: string | null;
  onSend: (t: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, onSend]);

  // Insert formatting markers around selection (or just markers if no selection)
  const applyFormat = useCallback((open: string, close = open) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = input.slice(start, end);
    if (sel) {
      const next = input.slice(0, start) + open + sel + close + input.slice(end);
      setInput(next);
      requestAnimationFrame(() => {
        ta.selectionStart = start + open.length;
        ta.selectionEnd   = end   + open.length;
        ta.focus();
      });
    } else {
      const next = input.slice(0, start) + open + close + input.slice(start);
      setInput(next);
      requestAnimationFrame(() => {
        const pos = start + open.length;
        ta.selectionStart = pos;
        ta.selectionEnd   = pos;
        ta.focus();
      });
    }
  }, [input]);

  const FmtBtn = ({ onMouseDown, title, children }: {
    onMouseDown: (e: React.MouseEvent) => void; title: string; children: React.ReactNode;
  }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(e); }}
      title={title}
      className="w-7 h-7 rounded-md text-slate-400 dark:text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col w-72 min-w-[18rem] bg-slate-900 border-l border-slate-800 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <span className="text-white text-sm font-semibold">Chat</span>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600 dark:text-slate-300">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p className="text-xs">Nenhuma mensagem ainda</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.from === myId;
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{msg.name}</span>}
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                mine ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-700 text-slate-100 rounded-bl-sm"
              }`}>
                {renderMessage(msg.text)}
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 mx-1">
                {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Formatting toolbar + Input */}
      <div className="flex-shrink-0 border-t border-slate-800 p-3 space-y-2">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5">
          <FmtBtn title="Negrito (Ctrl+B)" onMouseDown={() => applyFormat("**")}>
            <Bold className="h-3.5 w-3.5" />
          </FmtBtn>
          <FmtBtn title="Itálico (Ctrl+I)" onMouseDown={() => applyFormat("*")}>
            <Italic className="h-3.5 w-3.5" />
          </FmtBtn>
          <FmtBtn title="Sublinhado" onMouseDown={() => applyFormat("__")}>
            <Underline className="h-3.5 w-3.5" />
          </FmtBtn>
          <FmtBtn title="Código" onMouseDown={() => applyFormat("`")}>
            <Code2 className="h-3.5 w-3.5" />
          </FmtBtn>
          <div className="flex-1" />
          <span className="text-[10px] text-slate-600 dark:text-slate-300 select-none">**B** *I* __U__</span>
        </div>

        {/* Textarea + send */}
        <div className="flex items-end gap-2 bg-slate-800 rounded-xl pl-3 pr-1.5 py-1.5 focus-within:ring-1 focus-within:ring-blue-500">
          <textarea
            ref={textareaRef}
            className="flex-1 appearance-none text-sm text-white placeholder-slate-500 focus:outline-none resize-none leading-snug"
            style={{ minHeight: "36px", maxHeight: "96px", backgroundColor: "transparent", color: "white" }}
            placeholder="Mensagem…"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); applyFormat("**"); }
              if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); applyFormat("*"); }
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ata Panel ────────────────────────────────────────────────────────────────

function AtaPanel({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [ata, setAta]         = useState("");
  const [saving, setSaving]   = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load existing minutes on open
  useEffect(() => {
    fetch(`/api/assemblies/${roomId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.minutesText) setAta(d.minutesText); });
  }, [roomId]);

  const save = useCallback(async (text: string) => {
    setSaving(true);
    try {
      await fetch(`/api/assemblies/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutesText: text }),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [roomId]);

  const handleChange = (text: string) => {
    setAta(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 3000);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="flex flex-col w-80 min-w-[20rem] bg-slate-900 border-l border-slate-800 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <span className="flex items-center gap-2 text-white text-sm font-semibold">
          <FileText className="h-4 w-4 text-blue-400 dark:text-blue-300" /> Ata da Reunião
        </span>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Textarea */}
      <div className="flex-1 p-3 min-h-0">
        <textarea
          className="w-full h-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500 leading-relaxed"
          style={{ backgroundColor: "rgb(30 41 59)", color: "white", minHeight: "100%" }}
          placeholder={"Registre aqui os pontos discutidos, decisões tomadas e encaminhamentos da assembleia…\n\nEx:\n- Aprovação do orçamento\n- Eleição do conselho\n- Encaminhamentos"}
          value={ata}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 pb-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
          {saving ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</>
          ) : savedAt ? (
            <><CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-300" /> Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
          ) : (
            "Auto-salva em 3s"
          )}
        </span>
        <button
          onClick={() => save(ata)}
          disabled={saving || !ata.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Save className="h-3.5 w-3.5" /> Salvar ata
        </button>
      </div>
    </div>
  );
}

// ─── Device Settings Modal ────────────────────────────────────────────────────

function DeviceModal({
  videoDevices, audioDevices,
  currentVideoId, currentAudioId,
  onChangeCamera, onChangeMic,
  onClose,
}: {
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  currentVideoId: string;
  currentAudioId: string;
  onChangeCamera: (id: string) => void;
  onChangeMic: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 dark:border-slate-700 rounded-2xl p-6 w-80 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Dispositivos de áudio/vídeo</h3>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <Camera className="h-3.5 w-3.5" /> Câmera
          </label>
          {videoDevices.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">Nenhuma câmera detectada</p>
          ) : (
            <select
              value={currentVideoId}
              onChange={(e) => onChangeCamera(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Câmera ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Microphone */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <Volume2 className="h-3.5 w-3.5" /> Microfone
          </label>
          {audioDevices.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">Nenhum microfone detectado</p>
          ) : (
            <select
              value={currentAudioId}
              onChange={(e) => onChangeMic(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfone ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ─── Control Button ───────────────────────────────────────────────────────────

function CtrlBtn({ onClick, on, onColor = "bg-slate-700 hover:bg-slate-600", offColor = "bg-red-600 hover:bg-red-700", icon, offIcon, label, badge }: {
  onClick: () => void; on: boolean;
  onColor?: string; offColor?: string;
  icon: React.ReactNode; offIcon?: React.ReactNode;
  label: string; badge?: number;
}) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <button onClick={onClick} title={label}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors text-white ${on ? onColor : offColor}`}>
        {on ? icon : (offIcon ?? icon)}
      </button>
      {badge ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      <span className="text-[11px] text-slate-400 dark:text-slate-500">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const title  = searchParams.get("title") ?? "Reunião";

  const [nameInput, setNameInput] = useState("");
  const [myName, setMyName]       = useState("");
  const [joined, setJoined]       = useState(false);
  const [chatOpen, setChatOpenState] = useState(false);
  const [ataOpen, setAtaOpen]         = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);

  // Device selection (lobby)
  const [lobbyVideoDevices, setLobbyVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [lobbyAudioDevices, setLobbyAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId]     = useState("");
  const [selectedAudioId, setSelectedAudioId]     = useState("");
  // Track currently-active device IDs to show in the in-call modal
  const [activeVideoId, setActiveVideoId] = useState("");
  const [activeAudioId, setActiveAudioId] = useState("");

  // Pre-fill name + enumerate devices in lobby
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.name) { setMyName(d.name); setNameInput(d.name); } });

    // Request permission briefly to get device labels, then enumerate
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .catch(() => navigator.mediaDevices.enumerateDevices())
      .then((devices) => {
        const videos = devices.filter((d) => d.kind === "videoinput");
        const audios  = devices.filter((d) => d.kind === "audioinput");
        setLobbyVideoDevices(videos);
        setLobbyAudioDevices(audios);
        if (videos[0]) setSelectedVideoId(videos[0].deviceId);
        if (audios[0])  setSelectedAudioId(audios[0].deviceId);
      });
  }, []);

  const {
    myId, peers, localStream, mediaError,
    micOn, camOn, screenSharing, connected,
    messages, unread, assemblyMode,
    videoDevices, audioDevices,
    toggleMic, toggleCam, toggleScreen,
    changeCamera, changeMic,
    sendMessage, openChat, toggleAssemblyMode, leave,
  } = useMeeting(roomId, myName, joined, selectedVideoId, selectedAudioId);

  // Sync active device IDs from the hook's enumerated lists
  useEffect(() => {
    if (videoDevices[0] && !activeVideoId) setActiveVideoId(selectedVideoId || videoDevices[0].deviceId);
    if (audioDevices[0] && !activeAudioId) setActiveAudioId(selectedAudioId || audioDevices[0].deviceId);
  }, [videoDevices, audioDevices]); // eslint-disable-line

  const handleToggleChat = () => {
    const next = !chatOpen;
    setChatOpenState(next);
    if (next) setAtaOpen(false);
    openChat(next);
  };

  const handleToggleAta = () => {
    const next = !ataOpen;
    setAtaOpen(next);
    if (next) { setChatOpenState(false); openChat(false); }
  };

  const handleAssemblyMode = () => {
    toggleAssemblyMode(!assemblyMode);
  };

  const handleChangeCamera = (id: string) => {
    setActiveVideoId(id);
    changeCamera(id);
  };

  const handleChangeMic = (id: string) => {
    setActiveAudioId(id);
    changeMic(id);
  };

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold leading-tight">SindiCORE</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Reunião online</p>
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold truncate">{title}</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">Configure seus dispositivos antes de entrar</p>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-slate-300 dark:text-slate-600 text-sm">Seu nome</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) { setMyName(nameInput.trim()); setJoined(true); } }}
              placeholder="Digite seu nome"
              autoFocus
            />
          </div>

          {/* Camera select */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-slate-300 dark:text-slate-600 text-sm">
              <Camera className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> Câmera
            </label>
            {lobbyVideoDevices.length > 0 ? (
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {lobbyVideoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Câmera ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300 px-1">Nenhuma câmera detectada (você entrará apenas com chat)</p>
            )}
          </div>

          {/* Microphone select */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-slate-300 dark:text-slate-600 text-sm">
              <Volume2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> Microfone
            </label>
            {lobbyAudioDevices.length > 0 ? (
              <select
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {lobbyAudioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microfone ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300 px-1">Nenhum microfone detectado</p>
            )}
          </div>

          <button
            disabled={!nameInput.trim()}
            onClick={() => { setMyName(nameInput.trim()); setJoined(true); }}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Video className="h-4 w-4" />
            Entrar na reunião
          </button>
        </div>
      </div>
    );
  }

  // ── In-meeting ─────────────────────────────────────────────────────────────
  const peerList = Array.from(peers.values());
  const total    = peerList.length + 1;

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{title}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">SindiCORE · Reunião segura</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {!connected && (
            <span className="flex items-center gap-1 text-amber-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Conectando…
            </span>
          )}
          {assemblyMode && (
            <span className="flex items-center gap-1 text-amber-400 text-xs font-medium px-2 py-0.5 bg-amber-400/10 rounded-full">
              <Users className="h-3 w-3" /> Modo Assembleia
            </span>
          )}
          {mediaError && (
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
              <CamOffIcon className="h-3 w-3" /> Sem câmera
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-sm">
            <Users className="h-4 w-4" />{total}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Video grid */}
        <div className="flex-1 p-3 overflow-hidden min-w-0">
          {peerList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-2xl aspect-video">
                <VideoTile stream={localStream} name={myName} muted isMe />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Aguardando outros participantes…</p>
            </div>
          ) : (
            <div className={`grid ${gridCols(total)} gap-2 h-full`}>
              {peerList.map((p) => <VideoTile key={p.id} stream={p.stream} name={p.name} />)}
              <VideoTile stream={localStream} name={myName} muted isMe />
            </div>
          )}
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <ChatPanel messages={messages} myId={myId} onSend={sendMessage} onClose={handleToggleChat} />
        )}

        {/* Ata panel */}
        {ataOpen && (
          <AtaPanel roomId={roomId} onClose={handleToggleAta} />
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 py-3 px-4">
        <div className="flex items-center justify-center gap-3 flex-wrap">

          <CtrlBtn
            onClick={toggleMic} on={micOn}
            icon={<Mic className="h-5 w-5" />}
            offIcon={<MicOff className="h-5 w-5" />}
            label={micOn ? "Silenciar" : "Microfone"}
          />

          <CtrlBtn
            onClick={toggleCam} on={camOn}
            icon={<Video className="h-5 w-5" />}
            offIcon={<VideoOff className="h-5 w-5" />}
            label="Câmera"
          />

          <CtrlBtn
            onClick={toggleScreen} on={!screenSharing}
            onColor={screenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-600"}
            offColor="bg-slate-700 hover:bg-slate-600"
            icon={<Monitor className="h-5 w-5" />}
            offIcon={<MonitorOff className="h-5 w-5" />}
            label={screenSharing ? "Parar" : "Tela"}
          />

          <CtrlBtn
            onClick={handleToggleChat} on={!chatOpen}
            onColor={chatOpen ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-600"}
            offColor="bg-slate-700 hover:bg-slate-600"
            icon={<MessageSquare className="h-5 w-5" />}
            label="Chat"
            badge={!chatOpen ? unread : undefined}
          />

          {/* Ata */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleToggleAta}
              title="Ata da Reunião"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors text-white ${ataOpen ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <FileText className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Ata</span>
          </div>

          {/* Assembly mode */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleAssemblyMode}
              title="Modo Assembleia"
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors text-white ${assemblyMode ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <Users className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{assemblyMode ? "Assembleia" : "Assembleia"}</span>
          </div>

          {/* Devices */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setDevicesOpen(true)}
              title="Dispositivos"
              className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors text-white"
            >
              <Settings className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Devices</span>
          </div>

          <div className="w-px h-10 bg-slate-700 mx-1" />

          {/* Leave */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={leave}
              className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 flex items-center justify-center transition-colors text-white"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            <span className="text-[11px] text-red-400 dark:text-red-300">Sair</span>
          </div>
        </div>
      </div>

      {/* Device settings modal */}
      {devicesOpen && (
        <DeviceModal
          videoDevices={videoDevices.length ? videoDevices : lobbyVideoDevices}
          audioDevices={audioDevices.length ? audioDevices : lobbyAudioDevices}
          currentVideoId={activeVideoId}
          currentAudioId={activeAudioId}
          onChangeCamera={handleChangeCamera}
          onChangeMic={handleChangeMic}
          onClose={() => setDevicesOpen(false)}
        />
      )}
    </div>
  );
}
