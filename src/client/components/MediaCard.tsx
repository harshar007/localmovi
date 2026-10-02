import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Monitor, 
  Heart, 
  QrCode, 
  Clock, 
  Film, 
  Check, 
  Radio,
  Smartphone,
  Users,
  Sparkles,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { MediaItem } from '../../shared/types';
import { api } from '../api/apiClient';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from './QRCodeModal';

export const MediaCard: React.FC<{
  media: MediaItem;
  onFavoriteChange?: (id: string, isFav: boolean) => void;
  onDelete?: (id: string) => void;
  layout?: 'grid' | 'list';
}> = ({ media, onFavoriteChange, onDelete, layout = 'grid' }) => {
  const navigate = useNavigate();
  const { sendCommandToHost, isConnected } = useSocket();
  const [favorite, setFavorite] = useState(media.favorite);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatRemaining = (totalSec: number, posSec: number) => {
    const remain = Math.max(0, totalSec - posSec);
    const mins = Math.ceil(remain / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m left`;
    }
    return `${mins}m left`;
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
      setToastMessage('Casting to PC...');
      // Automatically navigate to remote on mobile / device
      setTimeout(() => {
        navigate('/remote');
      }, 600);
    } catch {
      setToastMessage('Could not connect to Host');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleWatchHere = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/watch/${media.id}`);
  };

  const handleCardClick = () => {
    navigate(`/watch/${media.id}`);
  };

  const handleOpenQr = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQrModal(true);
  };

  const handleHostParty = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/rooms?createMedia=${media.id}`);
  };

  const progressPercent = media.progress && media.progress.duration > 0
    ? Math.min(100, Math.round((media.progress.position / media.progress.duration) * 100))
    : 0;

  const resBadge = formatResolution(media.resolution);

  const hostOrigin = window.location.origin.includes('localhost')
    ? window.location.origin.replace('localhost', '192.168.1.37')
    : window.location.origin;
  const directWatchUrl = `${hostOrigin}/watch/${media.id}`;

  if (layout === 'list') {
    return (
      <>
        <div
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCardClick();
          }}
          className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-2xl bg-[#1E1F20] hover:bg-[#28292A] focus:bg-[#28292A] border border-[#3C4043]/40 hover:border-[#A8C7FA]/60 focus:border-[#A8C7FA] focus:ring-4 focus:ring-[#A8C7FA]/30 focus:outline-none cursor-pointer transition-all relative"
        >
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Poster thumbnail */}
            <div className="relative w-28 sm:w-36 h-18 sm:h-20 rounded-xl overflow-hidden bg-[#28292A] shrink-0 border border-[#3C4043]/40">
              {media.thumbnailPath ? (
                <img
                  src={media.thumbnailPath}
                  alt={media.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#A0A0A0]">
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
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                  <div className="h-full bg-[#A8C7FA]" style={{ width: `${progressPercent}%` }} />
                </div>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[#E3E3E3] group-hover:text-white transition-colors truncate text-sm sm:text-base">
                {media.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#A0A0A0]">
                {resBadge && (
                  <span className="px-1.5 py-0.5 rounded bg-[#004A77] text-[#C2E7FF] font-bold text-[10px]">
                    {resBadge}
                  </span>
                )}
                {progressPercent > 0 && media.progress && (
                  <span className="text-[#A8C7FA] font-medium text-[11px]">
                    {formatRemaining(media.progress.duration, media.progress.position)}
                  </span>
                )}
                <span className="uppercase font-mono text-[10px] text-[#A0A0A0]">
                  {media.codec}
                </span>
              </div>
            </div>
          </div>

          {/* Actions on List layout */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#3C4043]/30" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleWatchHere}
              className="px-3.5 py-1.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch</span>
            </button>

            <button
              onClick={handleHostParty}
              className="px-3 py-1.5 rounded-full bg-[#004A77] hover:bg-[#0842A0] text-[#C2E7FF] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
              title="Host Watch Party from this device"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Host Party</span>
            </button>

            <button
              onClick={handlePlayOnHost}
              className="px-3 py-1.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-semibold flex items-center gap-1.5 border border-[#3C4043]/50 active:scale-95 transition-transform"
              title="Cast to Host PC"
            >
              <Monitor className="w-3.5 h-3.5 text-[#A8C7FA]" />
              <span className="hidden lg:inline">Play on PC</span>
            </button>

            <button
              onClick={handleFavoriteToggle}
              className={`p-2 rounded-full border border-[#3C4043]/50 transition-colors ${
                favorite ? 'text-rose-400 bg-rose-500/20 border-rose-500/40' : 'text-[#A0A0A0] hover:text-white bg-[#28292A]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-rose-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
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
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCardClick();
          if (e.key === 'p' || e.key === 'P') handleHostParty(e as any);
          if (e.key === 'c' || e.key === 'C') handlePlayOnHost(e as any);
        }}
        className="group relative rounded-2xl bg-[#1E1F20] hover:bg-[#28292A] focus:bg-[#28292A] border border-[#3C4043]/40 hover:border-[#A8C7FA]/60 focus:border-[#A8C7FA] focus:ring-4 focus:ring-[#A8C7FA]/40 focus:scale-[1.02] focus:outline-none overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2 flex flex-col"
      >
        {/* Thumbnail Container (16:9) */}
        <div className="relative aspect-video w-full bg-[#28292A] overflow-hidden">
          {media.thumbnailPath ? (
            <img
              src={media.thumbnailPath}
              alt={media.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#A0A0A0] bg-[#28292A]">
              <Film className="w-10 h-10 opacity-30 mb-1" />
              <span className="text-[11px] text-[#A0A0A0]">Movie</span>
            </div>
          )}

          {/* Desktop Hover Overlay with Primary Dual Actions */}
          <div className="hidden sm:flex absolute inset-0 bg-black/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex-col items-center justify-center gap-2 p-3 z-10">
            <button
              onClick={handleWatchHere}
              className="w-full py-2 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-bold flex items-center justify-center gap-1.5 transition-transform hover:scale-102 shadow-sm"
              title="Watch directly on this device"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>WATCH HERE</span>
            </button>

            <button
              onClick={handleHostParty}
              className="w-full py-2 rounded-full bg-[#004A77] hover:bg-[#0842A0] text-[#C2E7FF] text-xs font-semibold flex items-center justify-center gap-1.5 transition-transform hover:scale-102"
              title="Host Watch Party for this movie"
            >
              <Users className="w-3.5 h-3.5" />
              <span>HOST PARTY</span>
            </button>

            <button
              onClick={handlePlayOnHost}
              className="w-full py-1.5 rounded-full bg-[#28292A]/90 hover:bg-[#303134] text-[#E3E3E3] text-[11px] font-medium flex items-center justify-center gap-1.5 border border-[#3C4043]/50 transition-transform hover:scale-102"
              title="Cast to Host Screen"
            >
              <Monitor className="w-3 h-3 text-[#A8C7FA]" />
              <span>PLAY ON PC</span>
            </button>
          </div>

          {/* Top Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
            {resBadge ? (
              <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[#C2E7FF] font-bold text-[10px] uppercase font-mono">
                {resBadge}
              </span>
            ) : <span />}

            <div className="flex items-center gap-1 pointer-events-auto">
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
                  favorite ? 'bg-rose-500/30 text-rose-400' : 'bg-black/60 text-slate-300 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-rose-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bottom Duration Badge */}
          {media.duration > 0 && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-slate-200 text-[10px] font-mono font-medium z-20">
              {formatDuration(media.duration)}
            </div>
          )}

          {/* Playback Progress Indicator */}
          {progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/80 z-20">
              <div className="h-full bg-[#A8C7FA] transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        {/* Card Info & Mobile Direct Actions */}
        <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2">
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-[#E3E3E3] group-hover:text-white transition-colors line-clamp-1 leading-snug">
              {media.title}
            </h4>
          </div>

          {/* Mobile Direct Action Buttons (Shown on small screens / touch / TV) */}
          <div className="flex sm:hidden items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleWatchHere}
              className="flex-1 py-1.5 px-2 rounded-xl bg-[#A8C7FA] text-[#062E6F] text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 shadow-xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Watch</span>
            </button>

            <button
              onClick={handleHostParty}
              className="flex-1 py-1.5 px-2 rounded-xl bg-[#004A77] text-[#C2E7FF] text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95"
              title="Host Party"
            >
              <Users className="w-3 h-3" />
              <span>Party</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] pt-1.5 border-t border-[#3C4043]/30">
            {progressPercent > 0 && media.progress ? (
              <span className="text-[#A8C7FA] font-medium">
                {formatRemaining(media.progress.duration, media.progress.position)}
              </span>
            ) : (
              <span className="uppercase font-mono text-[10px] text-[#A0A0A0]">
                {media.codec}
              </span>
            )}
            
            <button
              onClick={handleOpenQr}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[10px]"
            >
              <Smartphone className="w-3 h-3" />
              <span>Scan QR</span>
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1.5 animate-fade-in z-30">
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
