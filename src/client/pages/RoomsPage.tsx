import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  LogIn, 
  Crown, 
  Film, 
  Play, 
  Pause, 
  RotateCcw, 
  Copy, 
  Check, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { api } from '../api/apiClient';
import { RoomItem, MediaItem, SOCKET_EVENTS } from '../../shared/types';
import { useSocket } from '../context/SocketContext';
import { VideoPlayer } from '../components/VideoPlayer';

export const RoomsPage: React.FC = () => {
  const { socket, deviceId, deviceName } = useSocket();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomItem | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [roomName, setRoomName] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isController = activeRoom?.controllerId === deviceId;

  const loadRooms = async () => {
    try {
      const list = await api.getRooms();
      setRooms(list);
    } catch {}
  };

  useEffect(() => {
    loadRooms();
    api.getMedia().then(setMediaList).catch(() => {});
  }, []);

  // Listen to live room updates from socket
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (room: RoomItem) => {
      if (activeRoom && activeRoom.id === room.id) {
        setActiveRoom(room);
      }
      loadRooms();
    };

    socket.on(SOCKET_EVENTS.ROOM_STATE_UPDATED, handleRoomUpdate);
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE_UPDATED, handleRoomUpdate);
    };
  }, [socket, activeRoom]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const room = await api.createRoom({
        name: roomName || `${deviceName}'s Watch Party`,
        deviceId,
        deviceName,
        mediaId: selectedMediaId || undefined,
      });

      if (socket) {
        socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
          roomId: room.id,
          deviceId,
          deviceName,
        });
      }

      setActiveRoom(room);
      setShowCreateModal(false);
      loadRooms();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleJoinRoom = async (roomIdOrCode: string) => {
    try {
      const room = await api.getRoom(roomIdOrCode);
      if (room && socket) {
        socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
          roomId: room.id,
          deviceId,
          deviceName,
        }, (res: any) => {
          if (res?.success) {
            setActiveRoom(res.room);
          }
        });
      }
    } catch (err: any) {
      alert(err.message || 'Room not found');
    }
  };

  const handleLeaveRoom = () => {
    if (activeRoom && socket) {
      socket.emit(SOCKET_EVENTS.ROOM_LEAVE, {
        roomId: activeRoom.id,
        deviceId,
      });
      setActiveRoom(null);
      loadRooms();
    }
  };

  const handleSyncCommand = (action: any) => {
    if (!activeRoom || !socket) return;
    socket.emit(SOCKET_EVENTS.ROOM_SYNC_COMMAND, {
      roomId: activeRoom.id,
      deviceId,
      action,
    });
  };

  const handleCopyCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-accent" />
            Synchronized Watch Party
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Watch movies together in synchronized playback across all devices on your local network.
          </p>
        </div>

        {!activeRoom && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Room View */}
      {activeRoom ? (
        <div className="space-y-6">
          {/* Active Room Header Card */}
          <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{activeRoom.name}</h2>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-primary-light text-xs font-mono font-bold border border-border hover:bg-card transition-colors"
                  title="Click to copy Room Code"
                >
                  <span>{activeRoom.code}</span>
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {activeRoom.members.length} members watching together • Controller: {isController ? 'You' : 'Host'}
              </p>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Room</span>
            </button>
          </div>

          {/* Sync Video Player */}
          {activeRoom.media ? (
            <div className="space-y-4">
              <VideoPlayer
                media={activeRoom.media}
                initialPosition={activeRoom.position}
                autoPlay={activeRoom.state === 'playing'}
              />
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-border/50">
              <Film className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Video Selected in Room</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isController ? 'Choose a video from your library to start playback for everyone.' : 'Waiting for controller to select a video...'}
              </p>
              {isController && (
                <div className="max-w-xs mx-auto pt-2">
                  <select
                    onChange={(e) => handleSyncCommand({ mediaId: e.target.value, state: 'playing', position: 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-white"
                  >
                    <option value="">-- Choose Video --</option>
                    {mediaList.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Connected Members */}
          <div className="glass-panel rounded-3xl p-5 border border-border/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Connected Viewers ({activeRoom.members.length})
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {activeRoom.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-medium">{m.deviceName}</span>
                  {m.deviceId === activeRoom.controllerId && (
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Room Discovery / Join Form */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Join Code Card */}
          <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LogIn className="w-5 h-5 text-primary-light" />
                Join via Room Code
              </h3>
              <p className="text-xs text-slate-400">
                Enter the 8-character room code shared by your friend.
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="e.g. ROOM-8821"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary font-mono text-sm uppercase text-white focus:outline-none"
              />
              <button
                onClick={() => handleJoinRoom(joinCode)}
                disabled={!joinCode.trim()}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold shadow-glow-primary transition-all"
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Active Rooms List */}
          <div className="md:col-span-2 glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Active Rooms on LAN</h3>
              <span className="text-xs text-slate-400">{rooms.length} active</span>
            </div>

            {rooms.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-slate-500">
                No active viewing rooms right now. Create one to watch together!
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-card hover:bg-card-hover border border-border/50 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-white">{r.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Code: <span className="font-mono text-primary-light font-bold">{r.code}</span> • {r.members.length} viewers
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(r.id)}
                      className="px-4 py-1.5 rounded-xl bg-secondary hover:bg-primary text-slate-200 hover:text-white text-xs font-semibold transition-colors"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-border shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-white">Create Synchronized Room</h3>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Room Name</label>
                <input
                  type="text"
                  placeholder="Movie Night Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Choose Media (Optional)</label>
                <select
                  value={selectedMediaId}
                  onChange={(e) => setSelectedMediaId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs text-white"
                >
                  <option value="">Select Later</option>
                  {mediaList.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-secondary hover:bg-card text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
