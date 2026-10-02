# LocalStream 🎬
### Self-Hosted Private LAN Video Streaming & Host PC Remote Control

**LocalStream** is a complete, self-hosted private media server and desktop application that indexes local video collections on a Windows computer, streams them at maximum quality over the local area network (LAN) with zero cloud dependencies, and enables mobile/tablet remote control of host PC playback.

---

## 🌟 Key Features

### 1. 📁 Direct Windows Media Management
- **Native Folder Picker:** Select local Windows directories (e.g., `D:\Movies`, `E:\Media`, `C:\Users\Videos`) using native Windows Explorer dialogs or the interactive web directory browser.
- **Recursive File Scanning:** Automatically indexes containers including `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.m4v`, `.ts`, `.flv`.
- **Zero Modification:** Original video files are never modified, moved, renamed, or altered.
- **FFprobe Metadata Extraction:** Automatically extracts duration, resolution (4K, 1080p, 720p), video/audio codecs, framerate, and bitrate.
- **High-Quality Thumbnail Generation:** Captures and caches poster frames in AppData without re-encoding.
- **Safe Isolation:** Raw filesystem paths are strictly shielded behind secure UUID media tokens to eliminate path traversal vulnerabilities.

### 2. ⚡ High-Performance LAN Streaming
- **RFC 7233 HTTP 206 Range Requests:** Instant seeking and byte-range delivery with zero unnecessary memory buffering.
- **Direct Play & Adaptive Transcoding:** Direct playback for browser-native codecs (`H.264`, `VP8`, `VP9`, `AV1`, `AAC`) with zero CPU overhead, and on-demand background FFmpeg transcoding fallback for legacy/incompatible formats (e.g. `MKV` with `AC3`/`DTS`).
- **Dynamic LAN Discovery:** Automatically binds to the active local network IPv4 address (e.g. `http://192.168.1.100:3000`) and generates an on-screen QR Code for instant phone camera scanning.

### 3. 📱 Dual Playback Targets & Real-Time Host Remote Control
- **Target A: "This Device"** — Stream directly inside the browser on your smartphone, tablet, laptop, or smart TV.
- **Target B: "Host PC"** — Play on the dedicated Host PC screen with real-time remote commands via Socket.IO:
  - Play / Pause / Toggle
  - Real-time seek bar scrubber
  - Volume slider and Mute toggle
  - Speed presets (0.75x, 1x, 1.25x, 1.5x, 2x)
  - Fullscreen toggle & Stop
  - Video queue switcher

### 4. 👥 Synchronized Viewing Rooms (Watch Party)
- Create or join rooms using 8-character codes (`ROOM-XXXX`).
- Server-authoritative playback synchronization with drift correction across all connected LAN devices.
- Dynamic controller role assignment and live member roster.

### 5. 🖥️ Host Admin Dashboard & Telemetry
- Real-time CPU usage, Memory (RAM) utilization, Disk capacity, and active streaming sessions.
- Library folder manager with manual / automatic folder rescans.
- Connected LAN devices list with user-agent and last-seen timestamps.
- Live structured server log stream with level filtering.

---

## 🚀 Quick Start & Development

### Requirements
- **Node.js**: v18+ (tested on Node v24)
- **Windows**: Windows 10 or 11 (64-bit)

### Installation
```bash
# Install dependencies
npm install

# Initialize Prisma SQLite database
npm run prisma:generate
npm run prisma:push
```

### Running in Development
```bash
# Run backend server and Vite client concurrently
npm run dev
```

### Running Electron Desktop App
```bash
npm run dev:electron
```

### Production Build & Packaging
```bash
# Build React client, Server, and Electron binaries
npm run build

# Package Windows Installer (.exe) with electron-builder
npm run dist
```

---

## 🛡️ Security Architecture
- **Local Network Default:** Listens strictly on LAN interfaces with no public cloud relay required.
- **Authentication:** Admin account protection for library configuration and server settings with bcrypt password hashing and JWT sessions.
- **Electron Security:** `contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer process, explicit IPC contextBridge.

---

## 📂 Project Architecture
```
moivehoster/
├── prisma/
│   └── schema.prisma         # SQLite database schema (Media, Folder, Session, Room, Device)
├── src/
│   ├── client/               # React + TypeScript + Vite + Tailwind UI
│   │   ├── api/              # Typed REST client
│   │   ├── components/       # VideoPlayer, RemoteController, MediaCard, Navbar, Sidebar
│   │   ├── context/          # AuthContext, SocketContext
│   │   └── pages/            # HomePage, LibraryPage, WatchPage, RemotePage, RoomsPage, AdminPage
│   ├── server/               # Node.js + Express + Socket.IO Backend
│   │   ├── controllers/      # Media, Folder, Remote, Room, System, Auth controllers
│   │   ├── services/         # FFmpeg, Scanner, Streaming, Session, Room, System, Logger
│   │   ├── socket/           # Socket.IO event manager
│   │   └── index.ts          # Server entrypoint
│   ├── electron/             # Electron Main Process & Preload IPC
│   └── shared/               # Shared TypeScript interfaces & Socket event constants
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```
