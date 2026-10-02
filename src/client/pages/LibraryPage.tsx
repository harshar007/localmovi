import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Heart
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem, LibraryFolderItem } from '../../shared/types';
import { MediaCard } from '../components/MediaCard';
import { useSocket } from '../context/SocketContext';

export const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { deviceId, scanProgress } = useSocket();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<LibraryFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

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

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-[#E3E3E3] max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Film className="w-7 h-7 text-[#A8C7FA]" />
            Library
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#28292A] border border-[#3C4043] text-[#A0A0A0] font-mono font-normal">
              {mediaList.length} movies
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-0.5">
            Browse, search, and stream your entire movie collection.
          </p>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center gap-2">
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

      {/* Filter Toolbar (Material 3 Pill Filters) */}
      <div className="bg-[#1E1F20] rounded-3xl p-4 border border-[#3C4043]/50 shadow-elevation-1 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by title..."
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

          {/* Folder Select */}
          {folders.length > 1 && (
            <select
              value={folderId}
              onChange={(e) => updateParam('folderId', e.target.value)}
              className="px-3 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043]/40 text-xs text-[#E3E3E3] focus:outline-none shrink-0"
            >
              <option value="">All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name || f.folderPath}</option>
              ))}
            </select>
          )}

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
      ) : mediaList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#1E1F20] border border-[#3C4043]/50 space-y-4 max-w-md mx-auto my-12">
          <Film className="w-12 h-12 text-[#A0A0A0] mx-auto opacity-30" />
          <h3 className="text-base font-bold text-white">No Movies Found</h3>
          <p className="text-xs text-[#A0A0A0]">
            {search ? 'Try searching for a different title or clearing your filters.' : 'No videos were found in your indexed folders.'}
          </p>
          {search && (
            <button
              onClick={() => setSearchParams({})}
              className="m3-btn-secondary mx-auto text-xs"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {mediaList.map((item) => (
            <MediaCard key={item.id} media={item} onFavoriteChange={fetchMedia} layout="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {mediaList.map((item) => (
            <MediaCard key={item.id} media={item} onFavoriteChange={fetchMedia} layout="list" />
          ))}
        </div>
      )}
    </div>
  );
};
