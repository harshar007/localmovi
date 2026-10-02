import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Sparkles,
  QrCode,
  Share2,
  Radio,
  Send,
  Cast
} from 'lucide-react';
import { api } from '../api/apiClient';
import { RoomItem, MediaItem, SOCKET_EVENTS } from '../../shared/types';
import { useSocket } from '../context/SocketContext';
import { VideoPlayer } from '../components/VideoPlayer';
import { QRCodeModal } from '../components/QRCodeModal';

export const RoomsPage: React.FC = () => {
  const { socket, deviceId, deviceName, sendPartyInvite } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomItem | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [roomName, setRoomName] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPartyQrModal, setShowPartyQrModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deliveredToast, setDeliveredToast] = useState(false);

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

  // Check for ?join=CODE in URL and join automatically
  const autoJoinCode = searchParams.get('join');
  const createMediaParam = searchParams.get('createMedia');

  useEffect(() => {
    if (autoJoinCode && socket && !activeRoom) {
      handleJoinRoom(autoJoinCode);
    }
  }, [autoJoinCode, socket]);

  useEffect(() => {
    if (createMediaParam) {
      setSelectedMediaId(createMediaParam);
      const found = mediaList.find((m) => m.id === createMediaParam);
      if (found) {
        setRoomName(`${deviceName}'s Party - ${found.title}`);
      }
      setShowCreateModal(true);
    }
  }, [createMediaParam, mediaList, deviceName]);

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
      const partyTitle = roomName.trim() || `${deviceName}'s Watch Party`;
      const room = await api.createRoom({
        name: partyTitle,
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
      setRoomName('');
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
      setSearchParams({});
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

  // Deliver party to all devices on LAN
  const handleDeliverToAllDevices = () => {
    if (!activeRoom) return;
    sendPartyInvite({
      roomId: activeRoom.id,
      roomCode: activeRoom.code,
      roomName: activeRoom.name,
      mediaTitle: activeRoom.media?.title || 'Synchronized Stream',
    });
    setDeliveredToast(true);
    setTimeout(() => setDeliveredToast(false), 3500);
  };

  const hostOrigin = window.location.origin.includes('localhost')
    ? window.location.origin.replace('localhost', '192.168.1.37')
    : window.location.origin;
  const partyDirectUrl = activeRoom ? `${hostOrigin}/rooms?join=${activeRoom.code}` : '';

  const handleCopyCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (partyDirectUrl) {
      navigator.clipboard.writeText(partyDirectUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-accent" />
            Join Party & Synchronized Stream
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Name your party, deliver to other devices via QR or instant LAN broadcast, and watch together in exact sync.
          </p>
        </div>

        {!activeRoom && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-2 transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Host New Join Party</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Room View */}
      {activeRoom ? (
        <div className="space-y-6">
          {/* Active Room Header & Deliver Tools */}
          <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>PARTY LIVE</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{activeRoom.name}</h2>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-primary-light text-xs font-mono font-bold border border-border hover:bg-card transition-colors"
                    title="Click to copy Room Code"
                  >
                    <span>{activeRoom.code}</span>
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {activeRoom.members.length} member{activeRoom.members.length === 1 ? '' : 's'} connected • Host: {isController ? 'You' : 'Host Device'}
                </p>
              </div>

              {/* Action Buttons: Deliver to Other Devices, QR Code, Leave */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Deliver / Broadcast across LAN */}
                <button
                  onClick={handleDeliverToAllDevices}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent/20 to-primary/20 hover:from-accent/30 hover:to-primary/30 text-white text-xs font-semibold border border-accent/40 flex items-center gap-2 transition-all shadow-sm active:scale-95"
                  title="Deliver instant join invite to all devices on the network"
                >
                  <Send className="w-3.5 h-3.5 text-accent" />
                  <span>Deliver to LAN Screens</span>
                </button>

                {/* Direct Scan QR Code */}
                <button
                  onClick={() => setShowPartyQrModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                  title="Scan QR to join party automatically on mobile"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Party QR Code</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-secondary hover:bg-card text-slate-300 text-xs font-medium border border-border flex items-center gap-1.5 transition-colors"
                  title="Copy direct join link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>

                {/* Leave */}
                <button
                  onClick={handleLeaveRoom}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Party</span>
                </button>
              </div>
            </div>

            {/* Delivered confirmation toast */}
            {deliveredToast && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>🎉 Party delivered! An instant join invite was broadcast to all devices on your Wi-Fi network.</span>
              </div>
            )}
          </div>

          {/* Sync Video Player */}
          {activeRoom.media ? (
            <div className="space-y-4">
              <VideoPlayer
                media={activeRoom.media}
                initialPosition={activeRoom.position}
                autoPlay={activeRoom.state === 'playing'}
              />

              {/* Media Switcher for Participants ("They can access they want") */}
              <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border/50">
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary-light" />
                  <span>Currently Streaming: <strong className="text-white">{activeRoom.media.title}</strong></span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] text-slate-400 shrink-0">Switch Movie:</span>
                  <select
                    value={activeRoom.mediaId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSyncCommand({ mediaId: e.target.value, state: 'playing', position: 0 });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {mediaList.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-border/50">
              <Film className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Video Selected in Party</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose a movie from your library to start streaming for everyone in this party.
              </p>
              <div className="max-w-xs mx-auto pt-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSyncCommand({ mediaId: e.target.value, state: 'playing', position: 0 });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Movie to Stream --</option>
                  {mediaList.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Connected Members */}
          <div className="glass-panel rounded-3xl p-5 border border-border/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Connected Viewers in this Party ({activeRoom.members.length})
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
                    <Crown className="w-3.5 h-3.5 text-amber-400" title="Party Host" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Party QR Code Modal */}
          {showPartyQrModal && (
            <QRCodeModal
              targetUrl={partyDirectUrl}
              videoTitle={`Join Party: ${activeRoom.name}`}
              onClose={() => setShowPartyQrModal(false)}
            />
          )}
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
                Enter the party code or scan a QR code to join automatically.
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
                Join Party
              </button>
            </div>
          </div>

          {/* Active Rooms List */}
          <div className="md:col-span-2 glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Join Parties on LAN
              </h3>
              <span className="text-xs text-slate-400">{rooms.length} active</span>
            </div>

            {rooms.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-slate-500 space-y-3">
                <p>No active join parties right now.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/30 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Host the First Party</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-card hover:bg-card-hover border border-border/50 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                        <span>{r.name}</span>
                        {r.media && (
                          <span className="text-[11px] font-normal text-primary-light px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                            🎬 {r.media.title}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Code: <span className="font-mono text-primary-light font-bold">{r.code}</span> • {r.members.length} viewers
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(r.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Join & Watch</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Name Watch Party Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-border shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-glow-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Name Your Join Party</h3>
                <p className="text-xs text-slate-400">Host a synchronized party and deliver it to other devices.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Party Name</label>
                <input
                  type="text"
                  placeholder={`e.g. ${deviceName}'s Movie Night`}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Choose Movie (Optional)</label>
                <select
                  value={selectedMediaId}
                  onChange={(e) => setSelectedMediaId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs text-white focus:outline-none focus:border-primary"
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
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-xs font-semibold shadow-glow-primary"
                >
                  Create & Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
