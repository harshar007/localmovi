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
  Plus
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getMediaById(id, deviceId)
      .then((data) => {
        setMedia(data);
        setPartyName(`${deviceName}'s Party - ${data.title}`);
        // Load up next / other videos
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

      // Deliver invite to all LAN screens
      sendPartyInvite({
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        mediaTitle: media.title,
      });

      // Jump to party room automatically
      navigate(`/rooms?join=${room.code}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create watch party');
    }
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
        <div className="w-full aspect-video rounded-3xl glass-card animate-pulse" />
        <div className="h-8 w-1/3 bg-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto my-16 border border-border">
        <h2 className="text-lg font-bold text-white">Media Not Found</h2>
        <p className="text-xs text-slate-400">The requested video could not be loaded.</p>
        <button
          onClick={() => navigate('/library')}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold"
        >
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-fade-in">
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
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-border/50 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              {media.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              {media.resolution && (
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-light font-bold font-mono border border-primary/30">
                  {media.resolution}
                </span>
              )}
              <span className="uppercase font-mono font-semibold text-slate-300">
                {media.codec}
              </span>
              {media.audioCodec && (
                <span>• Audio: <span className="uppercase font-mono text-slate-300">{media.audioCodec}</span></span>
              )}
              {media.folderName && (
                <span className="text-slate-500">• Folder: {media.folderName}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Host Join Party Button */}
            <button
              onClick={() => setShowPartyModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-xs font-bold text-white shadow-glow-primary transition-all active:scale-95"
              title="Host a synchronized Join Party and deliver to phones / other devices"
            >
              <Sparkles className="w-4 h-4" />
              <span>Host Join Party</span>
            </button>

            {/* Play on Phone QR Modal */}
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-all shadow-sm"
              title="Scan QR to open & play on phone instantly (no login)"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Play on Phone</span>
            </button>

            <button
              onClick={async () => {
                await sendCommandToHost({
                  command: 'loadMedia',
                  mediaId: media.id,
                  position: media.progress?.position || 0,
                });
                navigate('/remote');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-card border border-border text-xs font-semibold text-white transition-all shadow-sm"
            >
              <Monitor className="w-4 h-4 text-primary-light" />
              <span>Cast to Host</span>
            </button>
          </div>
        </div>

        {/* Technical Metadata Spec Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-border/40 text-xs">
          <div className="glass-card rounded-xl p-3 space-y-1">
            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-accent" />
              File Size
            </span>
            <p className="font-mono font-bold text-slate-200">
              {formatFileSize(media.fileSize)}
            </p>
          </div>

          <div className="glass-card rounded-xl p-3 space-y-1">
            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary-light" />
              Dimensions
            </span>
            <p className="font-mono font-bold text-slate-200">
              {media.resolution || 'Auto'}
            </p>
          </div>

          <div className="glass-card rounded-xl p-3 space-y-1">
            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Frame Rate
            </span>
            <p className="font-mono font-bold text-slate-200">
              {media.frameRate ? `${media.frameRate} fps` : '24.0 fps'}
            </p>
          </div>

          <div className="glass-card rounded-xl p-3 space-y-1">
            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              Bitrate
            </span>
            <p className="font-mono font-bold text-slate-200">
              {media.bitrate ? `${Math.round(media.bitrate / 1000)} kbps` : 'Variable'}
            </p>
          </div>
        </div>
      </div>

      {/* Up Next / More in this Folder */}
      {upNext.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-primary-light" />
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
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-border shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-glow-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Name Your Join Party</h3>
                <p className="text-xs text-slate-400">Stream "{media.title}" synchronized with other devices.</p>
              </div>
            </div>

            <form onSubmit={handleCreateParty} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Party Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-xs text-white focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-secondary/60 border border-border/50 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-white">📡 Automatic LAN Delivery</div>
                <div className="text-[11px] text-slate-400">
                  When created, an instant join invitation will be delivered to connected devices, and a QR code will be generated for quick phone scanning.
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPartyModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-secondary hover:bg-card text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-xs font-semibold shadow-glow-primary flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Host & Deliver</span>
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
