# Gather — Real-Time Chat Application

A room-based chat app with instant messaging, live participant lists, and shareable room invite codes.

## Features

- Create a room with a custom name and unique six-character invite code.
- Join a room by entering its invite code.
- Chat instantly with other room members over Socket.IO.
- See who's currently in the room and copy the invite code to share it.
- Keep the latest 100 messages in each active room.
- Responsive React interface for desktop and mobile.

Rooms and messages are held in server memory, so they reset when the server restarts and are not intended as permanent storage.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

```bash
npm install
npm install --prefix client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Express and Socket.IO server runs on port 3001.

## Let someone join on the same Wi-Fi

This is for a trusted private network, not public internet hosting.

1. On the computer running the app, use `ipconfig` and find the Wi-Fi adapter's IPv4 address (for example, `192.168.1.23`).
2. In the same PowerShell terminal where you start the app, set the allowed browser origin to that address:

   ```powershell
   $env:CLIENT_ORIGIN = "http://192.168.1.23:5173"
   npm run dev
   ```

   Replace the example address with the computer's actual IPv4 address. If Windows Firewall prompts you, allow Node.js on **Private networks**.
3. Share `http://192.168.1.23:5173` and the room code with the other person. They must be on the same Wi-Fi; both people use this same URL.

If the address changes, update `CLIENT_ORIGIN` and share the new URL. For people outside your Wi-Fi, deploy the frontend and Socket.IO server to an internet-accessible host instead.

For a production frontend build, run `npm run build`. Start the Socket.IO server with `npm start`.
