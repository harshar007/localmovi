import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Monitor, 
  Sparkles, 
  Clock, 
  Heart, 
  Film, 
  Radio, 
  QrCode, 
  ChevronRight,
  TrendingUp,
  Smartphone,
  Users,
  Compass
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem, RoomItem } from '../../shared/types';
import { MediaCard } from '../components/MediaCard';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from '../components/QRCodeModal';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { deviceId, sendCommandToHost, hostState, socket } = useSocket();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const [favorites, setFavorites] = useState<MediaItem[]>([]);
  const [activeRooms, setActiveRooms] = useState<RoomItem[]>([]);
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

  const loadRooms = async () => {
    try {
      const rooms = await api.getRooms();
      setActiveRooms(rooms);
    } catch {}
  };

  useEffect(() => {
    loadMedia();
    loadRooms();
    api.getQrCode().then(setLanInfo).catch(() => {});
  }, [deviceId]);

  // Listen to room updates
  useEffect(() => {
    if (!socket) return;
    socket.on('room:state_updated', loadRooms);
    return () => {
      socket.off('room:state_updated', loadRooms);
    };
  }, [socket]);

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

  const handleCastHeroToHost = async (item: MediaItem) => {
    try {
      await sendCommandToHost({
        command: 'loadMedia',
        mediaId: item.id,
        position: item.progress?.position || 0,
      });
      navigate('/remote');
    } catch {
      alert('Could not cast to host screen');
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-fade-in max-w-7xl mx-auto">
      {/* Top Welcome Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back.
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-0.5">
            Your personal cinema on your private local network.
          </p>
        </div>

        {lanInfo.lanUrl && (
          <button
            onClick={() => setShowQrModal(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#C2E7FF] text-xs font-medium border border-[#3C4043]/50 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-[#A8C7FA]" />
            <span>Connect Phone</span>
          </button>
        )}
      </div>

      {/* 🎉 LIVE JOIN PARTY BANNERS */}
      {activeRooms.map((room) => (
        <div key={room.id} className="relative rounded-3xl p-5 bg-gradient-to-r from-[#004A77] to-[#1E1F20] border border-[#A8C7FA]/40 shadow-elevation-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/10 flex items-center justify-center">
              {room.media?.thumbnailPath ? (
                <img src={room.media.thumbnailPath} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-8 h-8 text-[#A8C7FA] m-auto" />
              )}
              <span className="absolute top-1 left-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Watch Party
                </span>
                <span className="text-xs text-[#A0A0A0] font-medium">
                  • {room.members.length} watching together
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                {room.name} {room.media && <span className="text-[#C2E7FF] font-normal text-sm">({room.media.title})</span>}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate(`/rooms?join=${room.code}`)}
              className="m3-btn-primary shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Join Party & Watch</span>
            </button>
          </div>
        </div>
      ))}

      {/* 🔴 LIVE ON HOST SCREEN BROADCAST BANNER */}
      {hostState && hostState.media && (
        <div className="relative rounded-3xl p-5 bg-gradient-to-r from-[#28292A] via-[#1E1F20] to-[#1E1F20] border border-[#A8C7FA]/30 shadow-elevation-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/10">
              {hostState.media.thumbnailPath ? (
                <img src={hostState.media.thumbnailPath} alt="" className="w-full h-full object-cover" />
              ) : (
                <Film className="w-8 h-8 text-[#A8C7FA] m-auto" />
              )}
              <span className="absolute top-1 left-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                  Playing on PC
                </span>
                <span className="text-xs text-[#A0A0A0] capitalize font-mono">
                  • {formatTime(hostState.position)} / {formatTime(hostState.duration)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                {hostState.media.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => navigate(`/watch/${hostState.media!.id}?sync=true`)}
              className="m3-btn-primary"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Live with Host</span>
            </button>

            <Link
              to="/remote"
              className="m3-btn-secondary"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#A8C7FA]" />
              <span>Remote Control</span>
            </Link>
          </div>
        </div>
      )}

      {/* Featured Hero Media Card (Google TV Style) */}
      {heroItem && (
        <div className="relative w-full rounded-3xl overflow-hidden bg-[#1E1F20] border border-[#3C4043]/40 min-h-[360px] sm:min-h-[440px] flex flex-col justify-end p-6 sm:p-12 shadow-elevation-2 group">
          {/* Hero Backdrop Artwork */}
          {heroItem.thumbnailPath ? (
            <img
              src={heroItem.thumbnailPath}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 opacity-50"
            />
          ) : (
            <div className="absolute inset-0 bg-[#28292A]" />
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-[#131314]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#131314] via-[#131314]/50 to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004A77] text-[#C2E7FF] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#A8C7FA]" />
              {continueWatching.length > 0 && heroItem === continueWatching[0] ? 'Resume Watching' : 'Featured Movie'}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {heroItem.title}
            </h2>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-[#A0A0A0] font-medium">
              {heroItem.duration > 0 && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(heroItem.duration)}
                </span>
              )}
              {heroItem.resolution && (
                <span className="px-2 py-0.5 rounded bg-[#28292A] text-[#C2E7FF] font-bold font-mono text-[11px] border border-[#3C4043]">
                  {heroItem.resolution}
                </span>
              )}
              <span className="uppercase font-mono text-xs">{heroItem.codec}</span>
            </div>

            {/* Direct Dual Action Buttons */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => navigate(`/watch/${heroItem.id}`)}
                className="m3-btn-primary px-7 py-3 text-sm font-bold shadow-glow-primary"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>WATCH HERE</span>
              </button>

              <button
                onClick={() => handleCastHeroToHost(heroItem)}
                className="m3-btn-secondary px-6 py-3 text-sm font-semibold"
                title="Cast to Host Screen & Open Remote Control"
              >
                <Monitor className="w-4 h-4 text-[#A8C7FA]" />
                <span>PLAY ON PC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Continue Watching */}
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#A8C7FA]" />
              Continue Watching
            </h3>
            <span className="text-xs text-[#A0A0A0] font-mono">{continueWatching.length} in progress</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {continueWatching.slice(0, 4).map((item) => (
              <MediaCard key={item.id} media={item} onFavoriteChange={loadMedia} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION: Recently Added */}
      {mediaList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#A8C7FA]" />
              Recently Added
            </h3>
            <Link to="/library" className="text-xs font-semibold text-[#A8C7FA] hover:text-[#C2E7FF] flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mediaList.slice(0, 10).map((item) => (
              <MediaCard key={item.id} media={item} onFavoriteChange={loadMedia} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION: Favorites (if any) */}
      {favorites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
              Favorites
            </h3>
            <span className="text-xs text-[#A0A0A0] font-mono">{favorites.length} saved</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((item) => (
              <MediaCard key={item.id} media={item} onFavoriteChange={loadMedia} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State if No Videos */}
      {!loading && mediaList.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-[#1E1F20] border border-[#3C4043]/50 space-y-4 max-w-md mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-[#28292A] text-[#A8C7FA] flex items-center justify-center mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Your Library is Empty</h3>
          <p className="text-xs text-[#A0A0A0]">
            Add a folder containing movies to start streaming across your home network.
          </p>
          <Link
            to="/settings"
            className="m3-btn-primary inline-flex mt-2"
          >
            <span>Add Movies Folder</span>
          </Link>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          initialTab="viewer"
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
