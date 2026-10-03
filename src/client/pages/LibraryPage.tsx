import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Film, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  RefreshCw, 
  FolderOpen,
  Check,
  Heart,
  Smartphone,
  UploadCloud
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem, LibraryFolderItem } from '../../shared/types';
import { MediaCard } from '../components/MediaCard';
import { useSocket } from '../context/SocketContext';
import { MobileVideoShareModal } from '../components/MobileVideoShareModal';

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deviceId, scanProgress } = useSocket();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showPhoneShareModal, setShowPhoneShareModal] = useState(false);

  // Filters & Sorting state from URL or defaults
  const search = searchParams.get('search') || '';
  const folderId = searchParams.get('folderId') || '';
  const resolution = searchParams.get('resolution') || '';
  const codec = searchParams.get('codec') || '';
  const favorite = searchParams.get('favorite') === 'true';
  const sort = searchParams.get('sort') || 'date';
  const order = searchParams.get('order') || 'desc';

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const [items, folderList] = await Promise.all([
        api.getMedia({
          search,
          folderId,
          resolution,
          codec,
          favorite,
          sort,
          order,
          deviceId,
        }),
        api.getFolders(),
      ]);
      setMediaList(items);
      setFolders(folderList);
    } catch (err) {
      console.error('Failed to fetch library', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [search, folderId, resolution, codec, favorite, sort, order, deviceId]);

  // Extract distinct subfolders or folder names from media items
  const subfolders = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of mediaList) {
      // Extract subfolder from filePath if available
      const parts = item.filePath.split(/[/\\]/);
      if (parts.length >= 3) {
        const subfolderName = parts[parts.length - 2];
        if (subfolderName && subfolderName !== 'media' && subfolderName !== 'videos') {
          map.set(subfolderName, (map.get(subfolderName) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [mediaList]);

  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('all');

  const displayedMedia = React.useMemo(() => {
    if (selectedSubfolder === 'all') return mediaList;
    return mediaList.filter((m) => {
      const parts = m.filePath.split(/[/\\]/);
      if (parts.length >= 3) {
        return parts[parts.length - 2] === selectedSubfolder;
      }
      return false;
    });
  }, [mediaList, selectedSubfolder]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-[#E3E3E3] max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Film className="w-7 h-7 text-[#A8C7FA]" />
            Movie Library
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#28292A] border border-[#3C4043] text-[#A0A0A0] font-mono font-normal">
              {displayedMedia.length} videos
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-0.5">
            Select a folder or movie from your phone to host, stream, or cast.
          </p>
        </div>

        {/* Actions & Layout Switcher */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPhoneShareModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Upload and share a video from laptop or phone"
          >
            <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Upload Movie</span>
          </button>

          <div className="flex items-center p-1 rounded-full bg-[#28292A] border border-[#3C4043]/50">
            <button
              onClick={() => setLayout('grid')}
              className={`p-1.5 rounded-full transition-colors ${
                layout === 'grid' ? 'bg-[#A8C7FA] text-[#062E6F]' : 'text-[#A0A0A0] hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`p-1.5 rounded-full transition-colors ${
                layout === 'list' ? 'bg-[#A8C7FA] text-[#062E6F]' : 'text-[#A0A0A0] hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 📁 FOLDER SELECTOR ROW (Optimized for Mobile & Tablet Touch Navigation) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#A0A0A0] px-1">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[11px] text-[#A8C7FA]">
            <FolderOpen className="w-3.5 h-3.5" />
            Browse by Folder
          </span>
          <span className="font-mono text-[11px]">
            {subfolders.length > 0 ? `${subfolders.length + 1} Folders` : `${folders.length} Folders`}
          </span>
        </div>

        {/* Horizontal Scrollable Folder Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => {
              setSelectedSubfolder('all');
              updateParam('folderId', null);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all active:scale-95 ${
              selectedSubfolder === 'all' && !folderId
                ? 'bg-[#A8C7FA] text-[#062E6F] shadow-sm font-bold'
                : 'bg-[#1E1F20] text-[#E3E3E3] hover:bg-[#28292A] border border-[#3C4043]/50'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>All Movies</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedSubfolder === 'all' && !folderId ? 'bg-[#004A77] text-[#C2E7FF]' : 'bg-[#28292A] text-[#A0A0A0]'
            }`}>
              {mediaList.length}
            </span>
          </button>

          {/* Subfolders detected in library */}
          {subfolders.map((sf) => (
            <button
              key={sf.name}
              onClick={() => setSelectedSubfolder(sf.name)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all active:scale-95 ${
                selectedSubfolder === sf.name
                  ? 'bg-[#A8C7FA] text-[#062E6F] shadow-sm font-bold'
                  : 'bg-[#1E1F20] text-[#E3E3E3] hover:bg-[#28292A] border border-[#3C4043]/50'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>{sf.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedSubfolder === sf.name ? 'bg-[#004A77] text-[#C2E7FF]' : 'bg-[#28292A] text-[#A0A0A0]'
              }`}>
                {sf.count}
              </span>
            </button>
          ))}

          {/* Base Folders */}
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setSelectedSubfolder('all');
                updateParam('folderId', f.id);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all active:scale-95 ${
                folderId === f.id
                  ? 'bg-[#004A77] text-[#C2E7FF] border border-[#A8C7FA] shadow-sm'
                  : 'bg-[#1E1F20] text-[#E3E3E3] hover:bg-[#28292A] border border-[#3C4043]/50'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-[#A8C7FA]" />
              <span>{f.name || 'Main Folder'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#28292A] text-[#A0A0A0]">
                {f.mediaCount || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 🚀 Active Folder Host Bar */}
      {selectedSubfolder !== 'all' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#004A77]/80 via-[#1E1F20] to-[#1E1F20] border border-[#A8C7FA]/40 shadow-elevation-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Folder: <span className="text-[#A8C7FA]">{selectedSubfolder}</span>
              </h3>
              <p className="text-[11px] text-[#A0A0A0]">
                {displayedMedia.length} movie{displayedMedia.length === 1 ? '' : 's'} available to host or stream.
              </p>
            </div>
          </div>

          {displayedMedia.length > 0 && (
            <button
              onClick={() => {
                navigate(`/rooms?createMedia=${displayedMedia[0].id}`);
              }}
              className="m3-btn-primary py-2 px-4 text-xs font-bold shadow-sm active:scale-95 w-full sm:w-auto"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Host Party from this Folder</span>
            </button>
          )}
        </div>
      )}

      {/* Filter Toolbar (Material 3 Pill Filters) */}
      <div className="bg-[#1E1F20] rounded-3xl p-4 border border-[#3C4043]/50 shadow-elevation-1 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search movie title..."
            value={search}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#28292A] border border-[#3C4043]/60 focus:border-[#A8C7FA] rounded-full text-white placeholder-[#A0A0A0] focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Favorite Toggle */}
          <button
            onClick={() => updateParam('favorite', favorite ? null : 'true')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
              favorite
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-[#28292A] text-[#A0A0A0] hover:text-white border border-[#3C4043]/40'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-rose-400' : ''}`} />
            <span>Favorites</span>
          </button>

          {/* Resolution Filter */}
          <select
            value={resolution}
            onChange={(e) => updateParam('resolution', e.target.value)}
            className="px-3 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043]/40 text-xs text-[#E3E3E3] focus:outline-none shrink-0"
          >
            <option value="">All Resolutions</option>
            <option value="4K">4K UHD</option>
            <option value="1080p">1080p FHD</option>
            <option value="720p">720p HD</option>
          </select>

          {/* Sort By */}
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="px-3 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043]/40 text-xs text-[#E3E3E3] focus:outline-none shrink-0"
          >
            <option value="date">Newest Added</option>
            <option value="title">Title (A-Z)</option>
            <option value="duration">Duration</option>
            <option value="size">File Size</option>
          </select>
        </div>
      </div>

      {/* Media Grid or List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-video rounded-2xl bg-[#1E1F20] animate-pulse" />
          ))}
        </div>
      ) : displayedMedia.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#1E1F20] border border-[#3C4043]/50 space-y-4 max-w-md mx-auto my-12">
          <Film className="w-12 h-12 text-[#A0A0A0] mx-auto opacity-30" />
          <h3 className="text-base font-bold text-white">No Movies Found in this Folder</h3>
          <p className="text-xs text-[#A0A0A0]">
            {search ? 'Try searching for a different title or clearing your filters.' : 'No videos were found in this folder.'}
          </p>
          <button
            onClick={() => {
              setSelectedSubfolder('all');
              setSearchParams({});
            }}
            className="m3-btn-secondary mx-auto text-xs"
          >
            Show All Movies
          </button>
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayedMedia.map((item) => (
            <MediaCard key={item.id} media={item} onFavoriteChange={fetchMedia} onDelete={fetchMedia} layout="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedMedia.map((item) => (
            <MediaCard key={item.id} media={item} onFavoriteChange={fetchMedia} onDelete={fetchMedia} layout="list" />
          ))}
        </div>
      )}

      {/* Share Movie from Phone Modal */}
      {showPhoneShareModal && (
        <MobileVideoShareModal
          onClose={() => setShowPhoneShareModal(false)}
          onUploaded={() => fetchMedia()}
        />
      )}
    </div>
  );
};
