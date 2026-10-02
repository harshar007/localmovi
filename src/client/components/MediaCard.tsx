import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Monitor, 
  Heart, 
  QrCode, 
  Clock, 
  Film, 
  Layers, 
  Check, 
  Radio,
  Smartphone
} from 'lucide-react';
import { MediaItem } from '../../shared/types';
import { api } from '../api/apiClient';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from './QRCodeModal';

export const MediaCard: React.FC<{
  media: MediaItem;
  onFavoriteChange?: (id: string, isFav: boolean) => void;
  layout?: 'grid' | 'list';
}> = ({ media, onFavoriteChange, layout = 'grid' }) => {
  const navigate = useNavigate();
  const { sendCommandToHost, isConnected } = useSocket();
  const [favorite, setFavorite] = useState(media.favorite);
  const [showQrModal, setShowQrModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatResolution = (res: string) => {
    if (!res || res === 'Unknown') return null;
    const parts = res.split('x');
    if (parts.length === 2) {
      const height = parseInt(parts[1], 10);
      if (height >= 2160) return '4K';
      if (height >= 1440) return '2K';
      if (height >= 1080) return '1080p';
      if (height >= 720) return '720p';
      if (height >= 480) return '480p';
    }
    return res;
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.toggleFavorite(media.id);
      setFavorite(res.favorite);
      if (onFavoriteChange) onFavoriteChange(media.id, res.favorite);
    } catch {}
  };

  const handlePlayOnHost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await sendCommandToHost({
        command: 'loadMedia',
        mediaId: media.id,
        position: media.progress?.position || 0,
      });
      setToastMessage('Sent to Host PC');
      setTimeout(() => setToastMessage(null), 2500);
    } catch {
      setToastMessage('Could not connect to Host');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleCardClick = () => {
    navigate(`/watch/${media.id}`);
  };

  const handleOpenQr = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQrModal(true);
  };

  const progressPercent = media.progress && media.progress.duration > 0
    ? Math.min(100, Math.round((media.progress.position / media.progress.duration) * 100))
    : 0;

  const resBadge = formatResolution(media.resolution);

  // Direct video URL for phone scanning
  // Replace localhost with network IP if currently on localhost
  const hostOrigin = window.location.origin.includes('localhost')
    ? window.location.origin.replace('localhost', '192.168.1.37')
    : window.location.origin;
  const directWatchUrl = `${hostOrigin}/watch/${media.id}`;

  if (layout === 'list') {
    return (
      <>
        <div
          onClick={handleCardClick}
          className="group flex items-center gap-4 p-3 rounded-2xl glass-card hover:bg-card-hover border border-border/40 hover:border-primary/40 cursor-pointer transition-all relative"
        >
          {/* Poster thumbnail */}
          <div className="relative w-36 h-20 rounded-xl overflow-hidden bg-secondary/80 shrink-0">
            {media.thumbnailPath ? (
              <img
                src={media.thumbnailPath}
                alt={media.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Film className="w-8 h-8 opacity-40" />
              </div>
            )}

            {/* Duration Badge */}
            {media.duration > 0 && (
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-black/80 text-slate-200">
                {formatDuration(media.duration)}
              </span>
            )}

            {/* Progress bar */}
            {progressPercent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                <div className="h-full bg-accent" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-100 group-hover:text-primary-light transition-colors truncate text-sm sm:text-base">
              {media.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-400">
              {resBadge && (
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary-light font-bold text-[10px] border border-primary/30">
                  {resBadge}
                </span>
              )}
              <span className="uppercase font-mono text-[11px] text-slate-400">
                {media.codec}
              </span>
              {media.folderName && (
                <span className="text-slate-500 truncate max-w-[150px]">
                  • {media.folderName}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleOpenQr}
              className="p-2 rounded-xl bg-card hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-border transition-colors flex items-center gap-1 text-xs"
              title="Scan QR to Play on Phone"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline text-emerald-300 font-semibold">QR Play</span>
            </button>

            <button
              onClick={handlePlayOnHost}
              className="p-2 rounded-xl bg-card hover:bg-primary/20 text-slate-400 hover:text-primary-light border border-border transition-colors hidden sm:flex items-center gap-1 text-xs"
              title="Play on Host PC"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden md:inline">Host PC</span>
            </button>

            <button
              onClick={handleFavoriteToggle}
              className={`p-2 rounded-xl border border-border transition-colors ${
                favorite ? 'text-accent bg-accent/10 border-accent/30' : 'text-slate-400 hover:text-white bg-card'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* QR Code Modal for this video */}
        {showQrModal && (
          <QRCodeModal
            targetUrl={directWatchUrl}
            videoTitle={media.title}
            onClose={() => setShowQrModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative rounded-2xl glass-card hover:bg-card-hover border border-border/40 hover:border-primary/50 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-primary flex flex-col"
      >
        {/* Thumbnail Container */}
        <div className="relative aspect-video w-full bg-secondary/80 overflow-hidden">
          {media.thumbnailPath ? (
            <img
              src={media.thumbnailPath}
              alt={media.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-secondary/40">
              <Film className="w-10 h-10 opacity-30 mb-1" />
              <span className="text-[11px] text-slate-500">Video</span>
            </div>
          )}

          {/* Overlay Hover Actions */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/watch/${media.id}`);
              }}
              className="w-11 h-11 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-glow-primary transition-transform hover:scale-110"
              title="Play on this device"
            >
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </button>

            <button
              onClick={handleOpenQr}
              className="w-11 h-11 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
              title="Scan QR to Play directly on Phone (No Login)"
            >
              <QrCode className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayOnHost}
              className="w-11 h-11 rounded-full bg-card/90 hover:bg-primary text-slate-200 hover:text-white flex items-center justify-center border border-white/20 transition-transform hover:scale-110"
              title="Stream / Play on Host PC"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Top Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            {resBadge ? (
              <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-primary-light font-bold text-[10px] border border-primary/30 uppercase tracking-wider">
                {resBadge}
              </span>
            ) : <span />}

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={handleOpenQr}
                className="p-1.5 rounded-full bg-black/60 hover:bg-emerald-500/80 text-slate-300 hover:text-white backdrop-blur-xs transition-colors"
                title="Scan QR to play on phone"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button
                onClick={handleFavoriteToggle}
                className={`p-1.5 rounded-full backdrop-blur-xs transition-colors ${
                  favorite ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-black/60 text-slate-300 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-accent' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bottom Duration Badge */}
          {media.duration > 0 && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-slate-200 text-[10px] font-mono font-medium">
              {formatDuration(media.duration)}
            </div>
          )}

          {/* Playback Progress Indicator */}
          {progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-900/80">
              <div className="h-full bg-accent transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-1.5">
          <div>
            <h4 className="font-semibold text-sm text-slate-100 group-hover:text-primary-light transition-colors line-clamp-2 leading-snug">
              {media.title}
            </h4>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-border/30">
            <span className="uppercase font-mono font-semibold text-slate-400">
              {media.codec}
            </span>
            <button
              onClick={handleOpenQr}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <Smartphone className="w-3 h-3" />
              <span>Scan to Play</span>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1.5 animate-fade-in z-20">
            <Check className="w-3 h-3" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* QR Code Modal for this video */}
      {showQrModal && (
        <QRCodeModal
          targetUrl={directWatchUrl}
          videoTitle={media.title}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </>
  );
};
