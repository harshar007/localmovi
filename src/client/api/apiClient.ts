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
  deleteMedia: (id: string, deleteFile = true) =>
    request<{ success: boolean; message: string }>(`/media/${id}?deleteFile=${deleteFile}`, { method: 'DELETE' }),
  toggleFavorite: (id: string) =>
    request<{ id: string; favorite: boolean }>(`/media/${id}/favorite`, { method: 'PATCH' }),
  updateProgress: (id: string, data: { deviceId: string; position: number; duration: number; completed?: boolean }) =>
    request(`/media/${id}/progress`, { method: 'POST', body: JSON.stringify(data) }),
  uploadMedia: (file: File, onProgress?: (percent: number, loadedBytes?: number, totalBytes?: number, speedMBps?: number) => void): Promise<MediaItem> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/media/upload`, true);
      xhr.timeout = 0; // No client timeout for large movies
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name || 'video.mp4'));

      const token = getAuthToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      let lastTime = Date.now();
      let lastLoaded = 0;

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            let speedMBps = 0;
            if (timeDiff >= 0.3) {
              const bytesDiff = e.loaded - lastLoaded;
              speedMBps = Number((bytesDiff / (1024 * 1024) / timeDiff).toFixed(1));
              lastTime = now;
              lastLoaded = e.loaded;
            }
            const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
            onProgress(percent, e.loaded, e.total, speedMBps);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            if (onProgress) onProgress(100, file.size, file.size);
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch (err) {
            reject(err);
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error || `Upload failed: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Upload failed with HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload. Ensure phone is on the same Wi-Fi network.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.onabort = () => reject(new Error('Upload cancelled'));
      xhr.send(file);
    });
  },

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
