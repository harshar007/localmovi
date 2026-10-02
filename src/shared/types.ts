export interface MediaItem {
  id: string;
  title: string;
  filePath: string;
  fileSize: number;
  duration: number;
  resolution: string;
  width?: number | null;
  height?: number | null;
  codec: string;
  audioCodec?: string | null;
  bitrate?: number | null;
  frameRate?: number | null;
  thumbnailPath?: string | null;
  libraryFolderId?: string | null;
  folderName?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  progress?: {
    position: number;
    duration: number;
    completed: boolean;
  };
}

export interface LibraryFolderItem {
  id: string;
  folderPath: string;
  name?: string | null;
  enabled: boolean;
  lastScannedAt?: string | null;
  mediaCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceItem {
  id: string;
  name: string;
  deviceType: 'browser' | 'mobile' | 'host' | 'tablet';
  ipAddress?: string | null;
  userAgent?: string | null;
  isHost: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface HostPlaybackState {
  target: 'HOST_PC' | 'DEVICE';
  mediaId: string | null;
  media?: MediaItem | null;
  state: 'playing' | 'paused' | 'stopped' | 'buffering';
  position: number;
  duration: number;
  volume: number;
  playbackRate: number;
  controllerDeviceId?: string | null;
  updatedAt: string;
}

export interface RoomItem {
  id: string;
  code: string;
  name: string;
  mediaId?: string | null;
  media?: MediaItem | null;
  state: 'playing' | 'paused';
  position: number;
  controllerId?: string | null;
  members: RoomMemberItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomMemberItem {
  id: string;
  roomId: string;
  deviceId: string;
  deviceName: string;
  joinedAt: string;
  lastPingAt: string;
}

export interface SystemStats {
  cpu: {
    usagePercent: number;
    cores: number;
    model: string;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
  };
  disk: {
    fs: string;
    size: number;
    used: number;
    available: number;
    usePercent: number;
  }[];
  network: {
    activeInterfaces: {
      iface: string;
      ip4: string;
      mac: string;
    }[];
    currentLanUrl: string;
    qrCodeDataUrl: string;
    port: number;
  };
  server: {
    uptime: number;
    activeSessions: number;
    connectedDevices: number;
    ffmpegProcesses: number;
    libraryTotalVideos: number;
    libraryTotalSize: number;
  };
}

export interface RemoteCommand {
  command: 'play' | 'pause' | 'togglePlay' | 'seek' | 'volume' | 'speed' | 'stop' | 'next' | 'previous' | 'loadMedia' | 'toggleFullscreen';
  mediaId?: string;
  position?: number;
  volume?: number;
  speed?: number;
  senderDeviceId: string;
  senderDeviceName?: string;
}

export interface RemoteCommandAck {
  success: boolean;
  command: string;
  resultingState?: HostPlaybackState;
  error?: string;
}

export interface PartyInvite {
  roomId: string;
  roomCode: string;
  roomName: string;
  senderName: string;
  mediaTitle?: string;
  mediaThumbnail?: string;
  timestamp: string;
}

export interface ScanProgressEvent {
  status: 'idle' | 'scanning' | 'extracting_metadata' | 'generating_thumbnails' | 'completed' | 'error';
  folder?: string;
  currentFile?: string;
  processedCount: number;
  totalCount: number;
  percent: number;
  error?: string;
}

export interface ServerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'server' | 'scanner' | 'ffmpeg' | 'auth' | 'socket' | 'stream';
  message: string;
  meta?: any;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'viewer';
  };
}

export const SOCKET_EVENTS = {
  // Remote Controller to Server / Host
  REMOTE_COMMAND: 'remote:command',
  REMOTE_ACK: 'remote:ack',
  
  // Host state broadcasts
  HOST_STATE_CHANGED: 'host:state_changed',
  GET_HOST_STATE: 'host:get_state',
  REPORT_HOST_STATE: 'host:report_state',

  // Device management
  DEVICE_REGISTER: 'device:register',
  DEVICE_HEARTBEAT: 'device:heartbeat',
  DEVICES_UPDATED: 'devices:updated',

  // Synchronized Room & Watch Party events
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_SYNC_COMMAND: 'room:sync_command',
  ROOM_STATE_UPDATED: 'room:state_updated',
  ROOM_MEMBERS_UPDATED: 'room:members_updated',
  PARTY_INVITE: 'party:invite',

  // Library Scanner events
  SCAN_PROGRESS: 'scan:progress',
  MEDIA_UPDATED: 'media:updated',

  // System logs
  LOG_ENTRY: 'log:entry',
} as const;

