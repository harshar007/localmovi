import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  Monitor, 
  Users, 
  Film, 
  HardDrive, 
  Cpu, 
  Layers, 
  Clock, 
  Share2, 
  ChevronRight,
  Sparkles,
  QrCode,
  Smartphone,
  Play,
  Check
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem } from '../../shared/types';
import { VideoPlayer } from '../components/VideoPlayer';
import { MediaCard } from '../components/MediaCard';
import { QRCodeModal } from '../components/QRCodeModal';
import { useSocket } from '../context/SocketContext';

export const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deviceId, deviceName, sendCommandToHost, sendPartyInvite } = useSocket();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [upNext, setUpNext] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [castToast, setCastToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getMediaById(id, deviceId)
      .then((data) => {
        setMedia(data);
        setFavorite(data.favorite);
        setPartyName(`${deviceName}'s Party - ${data.title}`);
        api.getMedia({ folderId: data.libraryFolderId || undefined })
          .then((items) => {
            setUpNext(items.filter((item) => item.id !== id).slice(0, 6));
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error('Failed to load video', err);
      })
      .finally(() => setLoading(false));
  }, [id, deviceId, deviceName]);

  const handleFavoriteToggle = async () => {
    if (!media) return;
    try {
      const res = await api.toggleFavorite(media.id);
      setFavorite(res.favorite);
    } catch {}
  };

  const handleCastToHost = async () => {
    if (!media) return;
    try {
      await sendCommandToHost({
        command: 'loadMedia',
        mediaId: media.id,
        position: media.progress?.position || 0,
      });
      setCastToast(true);
      setTimeout(() => {
        navigate('/remote');
      }, 600);
    } catch {
      alert('Could not cast to host screen');
    }
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media) return;
    try {
      const room = await api.createRoom({
        name: partyName.trim() || `${deviceName}'s Watch Party`,
        deviceId,
        deviceName,
        mediaId: media.id,
      });

      sendPartyInvite({
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        mediaTitle: media.title,
      });

      navigate(`/rooms?join=${room.code}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create watch party');
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const hostOrigin = window.location.origin.includes('localhost')
    ? window.location.origin.replace('localhost', '192.168.1.37')
    : window.location.origin;
  const directWatchUrl = media ? `${hostOrigin}/watch/${media.id}` : '';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
        <div className="w-full aspect-video rounded-3xl bg-[#1E1F20] animate-pulse" />
        <div className="h-8 w-1/3 bg-[#28292A] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="bg-[#1E1F20] rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-16 border border-[#3C4043]/50">
        <h2 className="text-lg font-bold text-white">Movie Not Found</h2>
        <p className="text-xs text-[#A0A0A0]">The requested video could not be loaded.</p>
        <button
          onClick={() => navigate('/library')}
          className="m3-btn-primary mx-auto"
        >
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-[#E3E3E3]">
      {/* Video Player Section */}
      <VideoPlayer
        media={media}
        initialPosition={media.progress?.position || 0}
        onEnded={() => {
          if (upNext.length > 0) {
            navigate(`/watch/${upNext[0].id}`);
          }
        }}
      />

      {/* Video Title & Actions */}
      <div className="bg-[#1E1F20] rounded-3xl p-6 sm:p-8 border border-[#3C4043]/50 shadow-elevation-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              {media.title}
            </h1>

            <div className="flex items-center gap-3 text-xs text-[#A0A0A0] flex-wrap">
              {media.duration > 0 && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(media.duration)}
                </span>
              )}

              {media.resolution && (
                <span className="px-2 py-0.5 rounded bg-[#004A77] text-[#C2E7FF] font-bold font-mono text-[10px]">
                  {media.resolution}
                </span>
              )}

              <span className="uppercase font-mono font-semibold text-[#A0A0A0]">
                {media.codec}
              </span>

              {media.progress && media.progress.position > 15 && (
                <span className="text-[#A8C7FA] font-medium text-xs">
                  • Resume from {formatTime(media.progress.position)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Play on PC (Cast) */}
            <button
              onClick={handleCastToHost}
              className="m3-btn-secondary"
              title="Cast to Host PC screen & Open Remote"
            >
              <Monitor className="w-4 h-4 text-[#A8C7FA]" />
              <span>Play on PC</span>
            </button>

            {/* Host Watch Party */}
            <button
              onClick={() => setShowPartyModal(true)}
              className="m3-btn-tonal"
              title="Stream together with friends on LAN"
            >
              <Sparkles className="w-4 h-4 text-[#A8C7FA]" />
              <span>Watch Together</span>
            </button>

            {/* Play on Phone QR */}
            <button
              onClick={() => setShowQrModal(true)}
              className="p-2.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-emerald-400 border border-[#3C4043]/50 transition-colors"
              title="Scan QR to play on phone"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Favorite */}
            <button
              onClick={handleFavoriteToggle}
              className={`p-2.5 rounded-full border border-[#3C4043]/50 transition-colors ${
                favorite ? 'text-rose-400 bg-rose-500/20 border-rose-500/40' : 'text-[#A0A0A0] hover:text-white bg-[#28292A]'
              }`}
              title="Add to Favorites"
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Technical Metadata Spec Grid (JetBrains Mono) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#3C4043]/40 text-xs">
          <div className="bg-[#28292A] rounded-2xl p-3.5 space-y-1 border border-[#3C4043]/30">
            <span className="text-[#A0A0A0] text-[11px] font-medium flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-[#A8C7FA]" />
              File Size
            </span>
            <p className="font-mono font-bold text-white">
              {formatFileSize(media.fileSize)}
            </p>
          </div>

          <div className="bg-[#28292A] rounded-2xl p-3.5 space-y-1 border border-[#3C4043]/30">
            <span className="text-[#A0A0A0] text-[11px] font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#C2E7FF]" />
              Resolution
            </span>
            <p className="font-mono font-bold text-white">
              {media.resolution || 'Auto'}
            </p>
          </div>

          <div className="bg-[#28292A] rounded-2xl p-3.5 space-y-1 border border-[#3C4043]/30">
            <span className="text-[#A0A0A0] text-[11px] font-medium flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Frame Rate
            </span>
            <p className="font-mono font-bold text-white">
              {media.frameRate ? `${media.frameRate} fps` : '24.0 fps'}
            </p>
          </div>

          <div className="bg-[#28292A] rounded-2xl p-3.5 space-y-1 border border-[#3C4043]/30">
            <span className="text-[#A0A0A0] text-[11px] font-medium flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              Bitrate
            </span>
            <p className="font-mono font-bold text-white">
              {media.bitrate ? `${Math.round(media.bitrate / 1000)} kbps` : 'Direct Stream'}
            </p>
          </div>
        </div>
      </div>

      {/* Up Next / More in this Folder */}
      {upNext.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-[#A8C7FA]" />
            Up Next
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {upNext.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </div>
        </div>
      )}

      {/* Host Party Modal */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043] shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Watch Together Party</h3>
                <p className="text-xs text-[#A0A0A0]">Stream "{media.title}" in real-time sync across devices.</p>
              </div>
            </div>

            <form onSubmit={handleCreateParty} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#E3E3E3]">Party Room Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#28292A] border border-[#3C4043] focus:border-[#A8C7FA] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  className="w-1/2 py-2.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 m3-btn-primary py-2.5"
                >
                  <span>Launch Party</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Play QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          targetUrl={directWatchUrl}
          videoTitle={media.title}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
