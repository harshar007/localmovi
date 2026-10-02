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
  TrendingUp
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem } from '../../shared/types';
import { MediaCard } from '../components/MediaCard';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from '../components/QRCodeModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { deviceId, sendCommandToHost } = useSocket();

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

  return (
    <div className="space-y-10 pb-16 animate-fade-in">
      {/* Hero Featured Video Banner */}
      {heroItem && (
        <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-border/50 min-h-[360px] sm:min-h-[420px] flex flex-col justify-end p-6 sm:p-10 shadow-2xl group">
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
            <div className="flex items-center gap-3 pt-2">
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
                <span>Play on Host PC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAN Quick Connect Bar */}
      {lanInfo.lanUrl && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                LAN Media Broadcast Active
                <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                  ONLINE
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Any phone or TV on your Wi-Fi can stream directly: <span className="font-mono text-slate-200">{lanInfo.lanUrl}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowQrModal(true)}
            className="px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary-light text-xs font-semibold flex items-center gap-2 transition-all shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Show QR Code</span>
          </button>
        </div>
      )}

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Continue Watching
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {continueWatching.map((media) => (
              <MediaCard key={media.id} media={media} onFavoriteChange={loadMedia} />
            ))}
          </div>
        </section>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-accent fill-accent" />
              Favorites
            </h2>
            <Link to="/library?favorite=true" className="text-xs text-primary-light hover:underline flex items-center gap-1 font-medium">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.slice(0, 8).map((media) => (
              <MediaCard key={media.id} media={media} onFavoriteChange={loadMedia} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added Videos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-primary-light" />
            Recently Added Media
          </h2>
          <Link to="/library" className="text-xs text-primary-light hover:underline flex items-center gap-1 font-medium">
            <span>Explore Library</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-video rounded-2xl glass-card animate-pulse" />
            ))}
          </div>
        ) : mediaList.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center space-y-4 border border-border/50">
            <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-slate-500">
              <FolderPlus className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Videos Indexed Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Add folders containing your movies or videos to start self-hosting on your local network.
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Library Folders</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaList.slice(0, 12).map((media) => (
              <MediaCard key={media.id} media={media} onFavoriteChange={loadMedia} />
            ))}
          </div>
        )}
      </section>

      {/* QR Modal */}
      {showQrModal && (
        <QRCodeModal
          lanUrl={lanInfo.lanUrl}
          qrCode={lanInfo.qrCode}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
