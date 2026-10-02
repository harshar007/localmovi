import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/apiClient';
import { RoomItem, MediaItem, SOCKET_EVENTS } from '../../shared/types';
import { useSocket } from '../context/SocketContext';
import { VideoPlayer } from '../components/VideoPlayer';
import { QRCodeModal } from '../components/QRCodeModal';

export const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [endRoomConfirm, setEndRoomConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isOwner = activeRoom?.controllerId === deviceId;

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
    if (autoJoinCode && !activeRoom) {
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

  // Listen to live room updates and room deletion from socket
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (room: RoomItem) => {
      if (activeRoom && activeRoom.id === room.id) {
        setActiveRoom(room);
      }
      loadRooms();
    };

    const handleRoomDeleted = (data: { roomId: string }) => {
      if (activeRoom && activeRoom.id === data.roomId) {
        setActiveRoom(null);
        setSearchParams({});
        setStatusMessage('The host has ended and deleted this Watch Party.');
        setTimeout(() => setStatusMessage(null), 5000);
      }
      loadRooms();
    };

    socket.on(SOCKET_EVENTS.ROOM_STATE_UPDATED, handleRoomUpdate);
    socket.on(SOCKET_EVENTS.ROOM_DELETED, handleRoomDeleted);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE_UPDATED, handleRoomUpdate);
      socket.off(SOCKET_EVENTS.ROOM_DELETED, handleRoomDeleted);
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

      setActiveRoom(room);

      if (socket) {
        socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
          roomId: room.id,
          deviceId,
          deviceName,
        });
      }

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
      if (room) {
        setActiveRoom(room);
        if (socket) {
          socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
            roomId: room.id,
            deviceId,
            deviceName,
          }, (res: any) => {
            if (res?.success && res.room) {
              setActiveRoom(res.room);
            }
          });
        }
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Room not found');
      setTimeout(() => setStatusMessage(null), 4000);
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

  // Owner Delete / End Watch Party
  const handleDeleteRoom = async (roomId: string) => {
    try {
      await api.deleteRoom(roomId, deviceId);
      if (activeRoom && activeRoom.id === roomId) {
        setActiveRoom(null);
        setSearchParams({});
      }
      setEndRoomConfirm(false);
      setStatusMessage('Watch Party was ended and deleted.');
      setTimeout(() => setStatusMessage(null), 4000);
      loadRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to delete watch party');
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
    <div className="space-y-6 pb-20 animate-fade-in max-w-6xl mx-auto px-2 sm:px-4">
      {/* Global Status Notification */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-[#004A77] border border-[#A8C7FA]/50 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-[#C2E7FF] hover:text-white font-bold p-1">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#A8C7FA]" />
            Watch Together
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1">
            Host a synchronized movie party from your phone, tablet, or TV, invite other LAN screens, and stream in lockstep.
          </p>
        </div>

        {!activeRoom && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (mediaList.length > 0 && !selectedMediaId) {
                  setSelectedMediaId(mediaList[0].id);
                  setRoomName(`${deviceName}'s Party - ${mediaList[0].title}`);
                }
                setShowCreateModal(true);
              }}
              className="m3-btn-primary shadow-sm active:scale-95 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Host Watch Party</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Room View */}
      {activeRoom ? (
        <div className="space-y-6">
          {/* Active Room Header & Deliver Tools */}
          <div className="rounded-3xl p-5 bg-[#1E1F20] border border-[#3C4043]/50 shadow-elevation-2 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>PARTY LIVE</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white">{activeRoom.name}</h2>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#28292A] text-[#A8C7FA] text-xs font-mono font-bold border border-[#3C4043]/50 hover:bg-[#303134] transition-colors"
                    title="Click to copy Room Code"
                  >
                    <span>{activeRoom.code}</span>
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-[#A0A0A0]">
                  {activeRoom.members.length} viewer{activeRoom.members.length === 1 ? '' : 's'} connected • {isOwner ? '👑 You are the Host' : 'Joined Party'}
                </p>
              </div>

              {/* Action Buttons: Deliver to Other Devices, QR Code, Delete / Leave */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                {/* Deliver / Broadcast across LAN */}
                <button
                  onClick={handleDeliverToAllDevices}
                  className="flex-1 md:flex-none px-3.5 py-2 rounded-full bg-[#004A77] hover:bg-[#0842A0] text-[#C2E7FF] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Deliver instant join invite to TV, PC and all devices on LAN"
                >
                  <Send className="w-3.5 h-3.5 text-[#A8C7FA]" />
                  <span>Broadcast to TV / LAN</span>
                </button>

                {/* Direct Scan QR Code */}
                <button
                  onClick={() => setShowPartyQrModal(true)}
                  className="px-3.5 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                  title="Scan QR to join party on mobile"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>QR Code</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-medium border border-[#3C4043]/50 flex items-center gap-1.5 transition-colors"
                  title="Copy direct join link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>

                {/* Owner Delete Party Button */}
                {isOwner ? (
                  <button
                    onClick={() => setEndRoomConfirm(true)}
                    className="px-3.5 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/50 flex items-center gap-1.5 transition-all"
                    title="Delete and end this Watch Party for all participants"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>End Party</span>
                  </button>
                ) : (
                  /* Member Leave Button */
                  <button
                    onClick={handleLeaveRoom}
                    className="px-3 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave</span>
                  </button>
                )}
              </div>
            </div>

            {/* Delivered confirmation toast */}
            {deliveredToast && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>🎉 Party delivered! An instant join toast was broadcast to all screens on your local network.</span>
              </div>
            )}
          </div>

          {/* Sync Video Player */}
          {activeRoom.media ? (
            <div className="space-y-4">
              <VideoPlayer
                key={activeRoom.media.id}
                media={activeRoom.media}
                initialPosition={activeRoom.position}
                autoPlay={true}
                roomSync={{
                  roomId: activeRoom.id,
                  state: activeRoom.state,
                  position: activeRoom.position,
                  isController: isOwner,
                  onSyncCommand: handleSyncCommand,
                }}
              />

              {/* Media Switcher for Party Host */}
              <div className="rounded-2xl p-4 bg-[#1E1F20] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-[#3C4043]/40">
                <div className="text-xs text-[#E3E3E3] flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#A8C7FA]" />
                  <span>Now Streaming: <strong className="text-white">{activeRoom.media.title}</strong></span>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[11px] text-[#A0A0A0] shrink-0">Switch Movie:</span>
                    <select
                      value={activeRoom.mediaId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSyncCommand({ mediaId: e.target.value, state: 'playing', position: 0 });
                        }
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043]/60 text-xs text-white focus:outline-none focus:border-[#A8C7FA]"
                    >
                      {mediaList.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-12 text-center bg-[#1E1F20] border border-[#3C4043]/40 space-y-4">
              <Film className="w-12 h-12 text-[#A8C7FA] opacity-50 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Select a Movie to Start Streaming</h3>
                <p className="text-xs text-[#A0A0A0]">Choose a movie to stream in sync with everyone in the room.</p>
              </div>
            </div>
          )}

          {/* Connected Members */}
          <div className="rounded-3xl p-5 bg-[#1E1F20] border border-[#3C4043]/40 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0]">
              Connected Viewers in this Party ({activeRoom.members.length})
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {activeRoom.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043]/50 text-xs text-[#E3E3E3]"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-medium">{m.deviceName}</span>
                  {m.deviceId === activeRoom.controllerId && (
                    <Crown className="w-3.5 h-3.5 text-amber-400" title="Party Host / Owner" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* No Active Room - Join or Create Landing */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Join Card */}
          <div className="rounded-3xl p-6 bg-[#1E1F20] border border-[#3C4043]/40 shadow-elevation-1 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center font-bold">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Join by Code</h3>
                <p className="text-xs text-[#A0A0A0]">Enter room code or scan QR code.</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="e.g. ROOM-8821"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-full bg-[#28292A] border border-[#3C4043]/60 focus:border-[#A8C7FA] font-mono text-xs uppercase text-white focus:outline-none"
              />
              <button
                onClick={() => handleJoinRoom(joinCode)}
                disabled={!joinCode.trim()}
                className="w-full py-2.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] disabled:opacity-40 text-[#062E6F] text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Join Party
              </button>
            </div>
          </div>

          {/* Active Rooms List on LAN */}
          <div className="md:col-span-2 rounded-3xl p-6 bg-[#1E1F20] border border-[#3C4043]/40 shadow-elevation-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Parties on LAN
              </h3>
              <span className="text-xs text-[#A0A0A0]">{rooms.length} active</span>
            </div>

            {rooms.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#3C4043]/60 rounded-2xl text-xs text-[#A0A0A0] space-y-3">
                <p>No active join parties right now.</p>
                <button
                  onClick={() => {
                    if (mediaList.length > 0 && !selectedMediaId) {
                      setSelectedMediaId(mediaList[0].id);
                      setRoomName(`${deviceName}'s Party - ${mediaList[0].title}`);
                    }
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 rounded-full bg-[#004A77] hover:bg-[#0842A0] text-[#C2E7FF] text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Host First Party</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#28292A] hover:bg-[#303134] border border-[#3C4043]/40 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-white flex items-center gap-2 flex-wrap">
                        <span>{r.name}</span>
                        {r.media && (
                          <span className="text-[11px] font-normal text-[#C2E7FF] px-2 py-0.5 rounded-full bg-[#004A77]">
                            🎬 {r.media.title}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#A0A0A0] mt-0.5">
                        Code: <span className="font-mono text-[#A8C7FA] font-bold">{r.code}</span> • {r.members.length} viewers connected
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleJoinRoom(r.id)}
                        className="px-4 py-1.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Join & Watch</span>
                      </button>

                      {(r.controllerId === deviceId || true) && (
                        <button
                          onClick={() => handleDeleteRoom(r.id)}
                          className="p-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Delete Watch Party"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🎬 RICH CREATE / NAME WATCH PARTY MODAL (Optimized for Mobile, Tablet & Fire Stick TV) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl p-5 sm:p-6 bg-[#1E1F20] border border-[#3C4043] shadow-elevation-2 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#A8C7FA] text-[#062E6F] flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Host a Watch Party</h3>
                  <p className="text-xs text-[#A0A0A0]">Stream a movie in lockstep across your local network.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full text-[#A0A0A0] hover:text-white bg-[#28292A]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E3E3E3]">Party Name</label>
                <input
                  type="text"
                  placeholder={`e.g. ${deviceName}'s Movie Night`}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-full bg-[#28292A] border border-[#3C4043]/60 focus:border-[#A8C7FA] text-xs text-white focus:outline-none"
                />
              </div>

              {/* Visual Movie Selector (Mobile & Tablet friendly cards) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#E3E3E3] flex items-center justify-between">
                  <span>Select Movie to Stream</span>
                  <span className="text-[11px] text-[#A0A0A0] font-normal">{mediaList.length} available</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 sm:max-h-60 overflow-y-auto p-1 border border-[#3C4043]/40 rounded-2xl bg-[#28292A]/50">
                  {mediaList.map((m) => {
                    const isSelected = selectedMediaId === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMediaId(m.id);
                          if (!roomName || roomName.includes("'s Party")) {
                            setRoomName(`${deviceName}'s Party - ${m.title}`);
                          }
                        }}
                        className={`p-2 rounded-xl cursor-pointer transition-all flex flex-col gap-1.5 relative border ${
                          isSelected
                            ? 'bg-[#004A77] border-[#A8C7FA] shadow-sm'
                            : 'bg-[#1E1F20] hover:bg-[#303134] border-[#3C4043]/40'
                        }`}
                      >
                        <div className="aspect-video w-full rounded-lg bg-black/40 overflow-hidden relative">
                          {m.thumbnailPath ? (
                            <img src={m.thumbnailPath} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-5 h-5 text-[#A0A0A0] m-auto" />
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#004A77]/60 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-white truncate">
                          {m.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/3 py-2.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  🚀 Start Party & Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Watch Party Confirmation Dialog */}
      {endRoomConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-[#1E1F20] border border-rose-500/50 shadow-elevation-2 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">End & Delete Party?</h3>
            </div>
            <p className="text-xs text-[#A0A0A0]">
              This will close the Watch Party for all connected phones, tablets, and TV screens on your network.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEndRoomConfirm(false)}
                className="w-1/2 py-2.5 rounded-full bg-[#28292A] text-[#E3E3E3] text-xs font-semibold"
              >
                Keep Party
              </button>
              <button
                onClick={() => activeRoom && handleDeleteRoom(activeRoom.id)}
                className="w-1/2 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                End & Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Party Direct QR Code Modal */}
      {showPartyQrModal && activeRoom && (
        <QRCodeModal
          targetUrl={partyDirectUrl}
          videoTitle={`Watch Party: ${activeRoom.name}`}
          onClose={() => setShowPartyQrModal(false)}
        />
      )}
    </div>
  );
};
