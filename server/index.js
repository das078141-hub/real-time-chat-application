const crypto = require('node:crypto');
const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  },
});

const PORT = Number(process.env.PORT) || 3001;
const MAX_MESSAGES = 100;
const rooms = new Map();

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function membersFor(room) {
  return Array.from(room.members.values());
}

function publishMembers(room) {
  io.to(room.id).emit('room:members', membersFor(room));
}

function removeFromCurrentRoom(socket) {
  const roomId = socket.data.roomId;
  const room = rooms.get(roomId);

  if (!room) {
    socket.data.roomId = undefined;
    return;
  }

  room.members.delete(socket.id);
  socket.leave(roomId);
  socket.data.roomId = undefined;

  if (room.members.size === 0) {
    rooms.delete(roomId);
    return;
  }

  publishMembers(room);
}

function joinRoom(socket, room, username) {
  removeFromCurrentRoom(socket);
  room.members.set(socket.id, username);
  socket.data.roomId = room.id;
  socket.join(room.id);
  socket.emit('room:state', {
    room: { id: room.id, name: room.name },
    members: membersFor(room),
    messages: room.messages,
  });
  publishMembers(room);
}

function createRoomId() {
  let roomId;
  do {
    roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  } while (rooms.has(roomId));
  return roomId;
}

io.on('connection', (socket) => {
  socket.on('room:create', (payload, acknowledge = () => {}) => {
    const username = cleanText(payload && payload.username, 24);
    const name = cleanText(payload && payload.name, 40);

    if (!username || !name) {
      acknowledge({ ok: false, error: 'Enter your name and a room name.' });
      return;
    }

    const room = {
      id: createRoomId(),
      name,
      members: new Map(),
      messages: [],
    };
    rooms.set(room.id, room);
    joinRoom(socket, room, username);
    acknowledge({ ok: true, room: { id: room.id, name: room.name } });
  });

  socket.on('room:join', (payload, acknowledge = () => {}) => {
    const username = cleanText(payload && payload.username, 24);
    const roomId = cleanText(payload && payload.roomId, 6).toUpperCase();
    const room = rooms.get(roomId);

    if (!username || !/^[A-F0-9]{6}$/.test(roomId)) {
      acknowledge({ ok: false, error: 'Enter your name and a valid room code.' });
      return;
    }

    if (!room) {
      acknowledge({ ok: false, error: 'That room could not be found. Check the code and try again.' });
      return;
    }

    joinRoom(socket, room, username);
    acknowledge({ ok: true, room: { id: room.id, name: room.name } });
  });

  socket.on('chat:send', (payload, acknowledge = () => {}) => {
    const room = rooms.get(socket.data.roomId);
    const text = cleanText(payload && payload.text, 1000);
    const username = room && room.members.get(socket.id);

    if (!room || !username) {
      acknowledge({ ok: false, error: 'Join a room before sending a message.' });
      return;
    }

    if (!text) {
      acknowledge({ ok: false, error: 'Write a message before sending.' });
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      username,
      text,
      timestamp: new Date().toISOString(),
    };

    room.messages.push(message);
    if (room.messages.length > MAX_MESSAGES) room.messages.shift();
    io.to(room.id).emit('room:message', message);
    acknowledge({ ok: true });
  });

  socket.on('room:leave', () => removeFromCurrentRoom(socket));
  socket.on('disconnect', () => removeFromCurrentRoom(socket));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server listening on http://localhost:${PORT}`);
});
