import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, HostPlaybackState, ScanProgressEvent, RemoteCommand, ServerLogEntry } from '../../shared/types';

function getOrCreateDeviceId(): { deviceId: string; deviceName: string; deviceType: 'browser' | 'mobile' | 'host' | 'tablet'; isHost: boolean } {
  let id = localStorage.getItem('localstream_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('localstream_device_id', id);
  }

  const isElectron = !!(window as any).electronAPI?.isElectron;
  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);

  let deviceType: 'browser' | 'mobile' | 'host' | 'tablet' = 'browser';
  if (isElectron) deviceType = 'host';
  else if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  let name = localStorage.getItem('localstream_device_name');
  if (!name) {
    if (isElectron) name = 'Host PC (Desktop)';
    else if (isMobile) name = 'Mobile Device (' + (userAgent.includes('iPhone') ? 'iPhone' : 'Android') + ')';
    else if (isTablet) name = 'Tablet Browser';
    else name = 'Web Browser (' + (navigator.platform || 'PC') + ')';
    localStorage.setItem('localstream_device_name', name);
  }

  return { deviceId: id, deviceName: name, deviceType, isHost: isElectron };
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isHost: boolean;
  hostState: HostPlaybackState | null;
  scanProgress: ScanProgressEvent | null;
  recentLogs: ServerLogEntry[];
  sendCommandToHost: (cmd: Omit<RemoteCommand, 'senderDeviceId' | 'senderDeviceName'>) => Promise<any>;
  reportHostPlaybackState: (state: Partial<HostPlaybackState>) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hostState, setHostState] = useState<HostPlaybackState | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgressEvent | null>(null);
  const [recentLogs, setRecentLogs] = useState<ServerLogEntry[]>([]);

  const deviceRef = useRef(getOrCreateDeviceId());

  useEffect(() => {
    // Connect to same origin
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Register device
      newSocket.emit(SOCKET_EVENTS.DEVICE_REGISTER, {
        deviceId: deviceRef.current.deviceId,
        name: deviceRef.current.deviceName,
        deviceType: deviceRef.current.deviceType,
        isHost: deviceRef.current.isHost,
      });

      // Request host state
      newSocket.emit(SOCKET_EVENTS.GET_HOST_STATE);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on(SOCKET_EVENTS.HOST_STATE_CHANGED, (state: HostPlaybackState) => {
      setHostState(state);
    });

    newSocket.on(SOCKET_EVENTS.SCAN_PROGRESS, (progress: ScanProgressEvent) => {
      setScanProgress(progress);
      if (progress.status === 'completed') {
        setTimeout(() => setScanProgress(null), 4000);
      }
    });

    newSocket.on(SOCKET_EVENTS.LOG_ENTRY, (log: ServerLogEntry) => {
      setRecentLogs((prev) => [log, ...prev].slice(0, 100));
    });

    // Heartbeat loop
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit(SOCKET_EVENTS.DEVICE_HEARTBEAT, {
          deviceId: deviceRef.current.deviceId,
        });
      }
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      newSocket.disconnect();
    };
  }, []);

  const sendCommandToHost = async (cmd: Omit<RemoteCommand, 'senderDeviceId' | 'senderDeviceName'>) => {
    if (!socket || !isConnected) throw new Error('Socket not connected');

    const fullCmd: RemoteCommand = {
      ...cmd,
      senderDeviceId: deviceRef.current.deviceId,
      senderDeviceName: deviceRef.current.deviceName,
    };

    return new Promise((resolve) => {
      socket.emit(SOCKET_EVENTS.REMOTE_COMMAND, fullCmd, (ack: any) => {
        resolve(ack);
      });
    });
  };

  const reportHostPlaybackState = (partialState: Partial<HostPlaybackState>) => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.REPORT_HOST_STATE, partialState);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        deviceId: deviceRef.current.deviceId,
        deviceName: deviceRef.current.deviceName,
        deviceType: deviceRef.current.deviceType,
        isHost: deviceRef.current.isHost,
        hostState,
        scanProgress,
        recentLogs,
        sendCommandToHost,
        reportHostPlaybackState,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
