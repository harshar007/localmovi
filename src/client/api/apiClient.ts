import { MediaItem, LibraryFolderItem, SystemStats, HostPlaybackState, RoomItem, RemoteCommand, ServerLogEntry } from '../../shared/types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('localstream_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('localstream_token', token);
  } else {
    localStorage.removeItem('localstream_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Auth
  getAuthStatus: () => request<{ isSetupCompleted: boolean; requireAuth: boolean }>('/auth/status'),
  setupAdmin: (data: { username: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/setup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<{ user: any }>('/auth/me'),

  // Media
  getMedia: (params: { search?: string; folderId?: string; resolution?: string; codec?: string; favorite?: boolean; sort?: string; order?: string; deviceId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.folderId) query.append('folderId', params.folderId);
    if (params.resolution) query.append('resolution', params.resolution);
    if (params.codec) query.append('codec', params.codec);
    if (params.favorite) query.append('favorite', 'true');
    if (params.sort) query.append('sort', params.sort);
    if (params.order) query.append('order', params.order);
    if (params.deviceId) query.append('deviceId', params.deviceId);
    return request<MediaItem[]>(`/media?${query.toString()}`);
  },
  getMediaById: (id: string, deviceId?: string) =>
    request<MediaItem>(`/media/${id}${deviceId ? `?deviceId=${deviceId}` : ''}`),
  toggleFavorite: (id: string) =>
    request<{ id: string; favorite: boolean }>(`/media/${id}/favorite`, { method: 'PATCH' }),
  updateProgress: (id: string, data: { deviceId: string; position: number; duration: number; completed?: boolean }) =>
    request(`/media/${id}/progress`, { method: 'POST', body: JSON.stringify(data) }),

  // Folders
  getFolders: () => request<LibraryFolderItem[]>('/folders'),
  addFolder: (data: { folderPath: string; name?: string }) =>
    request<LibraryFolderItem>('/folders', { method: 'POST', body: JSON.stringify(data) }),
  removeFolder: (id: string) =>
    request<{ success: boolean }>(`/folders/${id}`, { method: 'DELETE' }),
  toggleFolder: (id: string) =>
    request<LibraryFolderItem>(`/folders/${id}/toggle`, { method: 'PATCH' }),
  scanFolder: (id: string) =>
    request<{ message: string }>(`/folders/${id}/scan`, { method: 'POST' }),
  scanAllFolders: () =>
    request<{ message: string }>('/folders/scan-all', { method: 'POST' }),
  browseDirectories: (dir?: string) =>
    request<{ currentPath: string; parentPath: string | null; directories: { name: string; path: string; isDrive: boolean }[] }>(
      `/folders/browse${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`
    ),

  // Remote Control
  getHostState: () => request<HostPlaybackState>('/remote/host-state'),
  sendRemoteCommand: (cmd: RemoteCommand) =>
    request<{ success: boolean; command: string; resultingState?: HostPlaybackState }>('/remote/command', {
      method: 'POST',
      body: JSON.stringify(cmd),
    }),

  // Rooms
  getRooms: () => request<RoomItem[]>('/rooms'),
  getRoom: (id: string) => request<RoomItem>(`/rooms/${id}`),
  createRoom: (data: { name: string; deviceId: string; deviceName: string; mediaId?: string }) =>
    request<RoomItem>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  syncRoom: (roomId: string, data: { deviceId: string; state?: string; position?: number; mediaId?: string }) =>
    request<RoomItem>(`/rooms/${roomId}/sync`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRoom: (roomId: string, deviceId?: string) =>
    request<{ success: boolean }>(`/rooms/${roomId}`, {
      method: 'DELETE',
      body: JSON.stringify({ deviceId }),
    }),

  // System
  getStats: () => request<SystemStats>('/system/stats'),
  getQrCode: () => request<{ lanUrl: string; qrCode: string }>('/system/qr'),
  getLogs: (limit = 100) => request<ServerLogEntry[]>(`/system/logs?limit=${limit}`),
  getDevices: () => request<any[]>('/system/devices'),
  getSettings: () => request<Record<string, string>>('/system/settings'),
  updateSettings: (settings: Record<string, string>) =>
    request<{ success: boolean }>('/system/settings', { method: 'POST', body: JSON.stringify(settings) }),
  shutdown: () => request<{ success: boolean }>('/system/shutdown', { method: 'POST' }),
};
