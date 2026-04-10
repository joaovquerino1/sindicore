// Custom Next.js server with Socket.IO signaling for WebRTC video meetings
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, webpack: true });
const handle = app.getRequestHandler();

// ── Room state ───────────────────────────────────────────────────────────────
// rooms: Map<roomId, Map<socketId, { id, name, socketId }>>
const rooms = new Map();

function getRoomPeers(roomId) {
  return rooms.get(roomId) ?? new Map();
}

// ── Signaling events ─────────────────────────────────────────────────────────
// join          client → server   { roomId, name }
// room-info     server → client   { myId, peers: [{id, name}] }
// peer-joined   server → others   { id, name }
// offer         client → server   { to, sdp }   relayed with from
// answer        client → server   { to, sdp }   relayed with from
// ice-candidate client → server   { to, candidate } relayed with from
// peer-left     server → others   { id }
// ─────────────────────────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    let currentRoomId = null;
    let currentPeerId = null;

    // ── Join room ──────────────────────────────────────────────────────────
    socket.on("join", ({ roomId, name }) => {
      currentRoomId = roomId;
      currentPeerId = randomUUID();

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId);

      // Tell joiner who is already here
      const existingPeers = [];
      room.forEach((peer) => existingPeers.push({ id: peer.id, name: peer.name }));

      socket.emit("room-info", { myId: currentPeerId, peers: existingPeers });

      // Tell everyone else a new peer joined
      socket.to(roomId).emit("peer-joined", { id: currentPeerId, name });

      // Add to room map and socket.io room
      room.set(currentPeerId, { id: currentPeerId, name, socketId: socket.id });
      socket.join(roomId);
    });

    // ── Relay: offer / answer / ice-candidate ──────────────────────────────
    socket.on("offer", ({ to, sdp }) => {
      const room = getRoomPeers(currentRoomId);
      const target = room.get(to);
      if (target) {
        io.to(target.socketId).emit("offer", { from: currentPeerId, sdp });
      }
    });

    socket.on("answer", ({ to, sdp }) => {
      const room = getRoomPeers(currentRoomId);
      const target = room.get(to);
      if (target) {
        io.to(target.socketId).emit("answer", { from: currentPeerId, sdp });
      }
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      const room = getRoomPeers(currentRoomId);
      const target = room.get(to);
      if (target) {
        io.to(target.socketId).emit("ice-candidate", { from: currentPeerId, candidate });
      }
    });

    // ── Assembly mode: broadcast toggle to everyone in the room ─────────
    socket.on("set-assembly-mode", ({ enabled }) => {
      const room = getRoomPeers(currentRoomId);
      const sender = room.get(currentPeerId);
      if (!sender) return;
      io.to(currentRoomId).emit("assembly-mode", { enabled, by: sender.name });
    });

    // ── Chat: broadcast message to everyone in the room ───────────────────
    socket.on("chat-message", ({ text }) => {
      const room = getRoomPeers(currentRoomId);
      const sender = room.get(currentPeerId);
      if (!sender || !text?.trim()) return;
      const msg = {
        id: randomUUID(),
        from: currentPeerId,
        name: sender.name,
        text: text.trim(),
        timestamp: Date.now(),
      };
      io.to(currentRoomId).emit("chat-message", msg);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (!currentRoomId || !currentPeerId) return;
      const room = getRoomPeers(currentRoomId);
      room.delete(currentPeerId);
      socket.to(currentRoomId).emit("peer-left", { id: currentPeerId });
      if (room.size === 0) rooms.delete(currentRoomId);
    });
  });

  httpServer.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV}`
    );
  });
});
