import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Monitor, 
  Sparkles, 
  Clock, 
  Heart, 
  Film, 
  FolderPlus, 
  Radio, 
  QrCode, 
  ChevronRight,
  TrendingUp,
  Smartphone,
  Eye,
  Sliders,
  Volume2
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem } from '../../shared/types';
import { MediaCard } from '../components/MediaCard';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from '../components/QRCodeModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { deviceId, sendCommandToHost, hostState } = useSocket();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [favorites, setFavorites] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [lanInfo, setLanInfo] = useState<{ lanUrl: string; qrCode: string }>({ lanUrl: '', qrCode: '' });

  const loadMedia = async () => {
    try {
      setLoading(true);
      const items = await api.getMedia({ deviceId });
      setMediaList(items);

      // Filter Continue Watching (has progress, not completed)
      const inProgress = items.filter(
        (i) => i.progress && i.progress.position > 15 && !i.progress.completed
      );
      setContinueWatching(inProgress);

      // Filter Favorites
      const favs = items.filter((i) => i.favorite);
      setFavorites(favs);
    } catch (err) {
      console.error('Failed to load home media', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
    api.getQrCode().then(setLanInfo).catch(() => {});
  }, [deviceId]);

  const heroItem = continueWatching[0] || mediaList[0];

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* 🔴 LIVE ON HOST SCREEN BROADCAST BANNER */}
      {hostState && hostState.media && (
        <div className="relative rounded-3xl p-5 bg-gradient-to-r from-primary/30 via-accent/20 to-secondary border-2 border-primary/50 shadow-glow-primary overflow-hidden animate-slide-up flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/20">
              {hostState.media.thumbnailPath ? (
                <img src={hostState.media.thumbnailPath} alt="" className="w-full h-full object-cover" />
              ) : (
                <Film className="w-8 h-8 text-primary-light m-auto" />
              )}
              <span className="absolute top-1 left-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/40 uppercase tracking-wider animate-pulse flex items-center gap-1">
                  <Radio className="w-3 h-3 text-rose-400" />
                  Live on Host Screen
                </span>
                <span className="text-xs text-slate-300 capitalize font-medium">
                  • {hostState.state === 'playing' ? 'Playing' : 'Paused'} ({formatTime(hostState.position)} / {formatTime(hostState.duration)})
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                {hostState.media.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Watch Live with Host */}
            <button
              onClick={() => navigate(`/watch/${hostState.media!.id}?sync=true`)}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary transition-all flex items-center gap-1.5 hover:scale-105"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch Live with Host</span>
            </button>

            {/* Remote Control Host */}
            <Link
              to="/remote"
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-card border border-border text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary-light" />
              <span>Host Remote</span>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Featured Video Banner */}
      {heroItem && (
        <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-border/50 min-h-[340px] sm:min-h-[400px] flex flex-col justify-end p-6 sm:p-10 shadow-2xl group">
          {/* Hero Background Backdrop */}
          {heroItem.thumbnailPath ? (
            <img
              src={heroItem.thumbnailPath}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-40 blur-xs"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary via-background to-card" />
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary-light text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              {continueWatching.length > 0 && heroItem === continueWatching[0] ? 'Continue Watching' : 'Featured Video'}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {heroItem.title}
            </h1>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-medium">
              {heroItem.duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatDuration(heroItem.duration)}
                </span>
              )}
              {heroItem.resolution && (
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-xs font-bold">
                  {heroItem.resolution}
                </span>
              )}
              <span className="uppercase font-mono text-xs text-primary-light font-bold">
                {heroItem.codec}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => navigate(`/watch/${heroItem.id}`)}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-glow-primary transition-all flex items-center gap-2 hover:scale-105"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {heroItem.progress && heroItem.progress.position > 0 ? 'Resume Playback' : 'Watch Now'}
                </span>
              </button>

              <button
                onClick={async () => {
                  await sendCommandToHost({
                    command: 'loadMedia',
                    mediaId: heroItem.id,
                    position: heroItem.progress?.position || 0,
                  });
                  navigate('/remote');
                }}
                className="px-5 py-3 rounded-2xl bg-card/80 hover:bg-card border border-border/80 text-white text-sm font-semibold backdrop-blur-md transition-all flex items-center gap-2"
              >
                <Monitor className="w-4 h-4 text-primary-light" />
                <span>Host on Big Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Continue Watching
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {continueWatching.map((item) => (
              <MediaCard key={item.id} media={item} onFavoriteChange={loadMedia} />
            ))}
          </div>
        </section>
      )}

      {/* All Movies / Media Vault */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-primary-light" />
              Movie Library & Media Vault
            </h2>
            <p className="text-xs text-slate-400">
              {mediaList.length} indexed videos available for instant LAN streaming
            </p>
          </div>
          <Link
            to="/library"
            className="text-xs font-semibold text-primary-light hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : mediaList.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-border">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-slate-500">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Movies Indexed Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your video folder in the Admin Dashboard to start streaming.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-glow-primary"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Configure Video Folders</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaList.map((item) => (
              <MediaCard key={item.id} media={item} onFavoriteChange={loadMedia} />
            ))}
          </div>
        )}
      </section>

      {/* Dual QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          lanUrl={lanInfo.lanUrl}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
