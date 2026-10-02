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
  FolderPlus, 
  SlidersHorizontal,
  FolderOpen
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

  const handleRescan = async () => {
    try {
      await api.scanAllFolders();
    } catch (err) {
      console.error('Rescan trigger failed', err);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Header with Title & Total Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Film className="w-6 h-6 text-primary-light" />
            Media Library
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-slate-400 font-mono font-normal">
              {mediaList.length} items
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and stream your indexed Windows media collections.
          </p>
        </div>

        {/* Rescan Button & Layout Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRescan}
            disabled={scanProgress?.status === 'scanning'}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-border text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary-light ${scanProgress?.status === 'scanning' ? 'animate-spin' : ''}`} />
            <span>{scanProgress?.status === 'scanning' ? 'Scanning...' : 'Rescan Folders'}</span>
          </button>

          <div className="flex items-center bg-secondary/80 p-1 rounded-xl border border-border">
            <button
              onClick={() => setLayout('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === 'grid' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                layout === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-border/50 flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter title..."
            value={search}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-secondary/80 border border-border focus:border-primary rounded-xl text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Folder Select */}
          {folders.length > 0 && (
            <select
              value={folderId}
              onChange={(e) => updateParam('folderId', e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-slate-300 focus:outline-none font-medium"
            >
              <option value="">All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name || f.folderPath} ({f.mediaCount || 0})
                </option>
              ))}
            </select>
          )}

          {/* Resolution Select */}
          <select
            value={resolution}
            onChange={(e) => updateParam('resolution', e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-slate-300 focus:outline-none font-medium"
          >
            <option value="">All Resolutions</option>
            <option value="3840x2160">4K (2160p)</option>
            <option value="1920x1080">1080p Full HD</option>
            <option value="1280x720">720p HD</option>
          </select>

          {/* Sort */}
          <select
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split('-');
              const next = new URLSearchParams(searchParams);
              next.set('sort', s);
              next.set('order', o);
              setSearchParams(next);
            }}
            className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-slate-300 focus:outline-none font-medium"
          >
            <option value="date-desc">Newest Added</option>
            <option value="date-asc">Oldest Added</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="duration-desc">Longest Duration</option>
            <option value="size-desc">Largest File Size</option>
          </select>
        </div>
      </div>

      {/* Media Grid / List */}
      {loading ? (
        <div className={layout === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="aspect-video rounded-2xl glass-card animate-pulse" />
          ))}
        </div>
      ) : mediaList.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-border/50 max-w-lg mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-slate-500">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Videos Found</h3>
          <p className="text-xs text-slate-400">
            {search || folderId || resolution
              ? 'Try adjusting your search criteria or filter options.'
              : 'Add media directories to populate your LocalStream library.'}
          </p>
        </div>
      ) : (
        <div className={layout === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
          {mediaList.map((media) => (
            <MediaCard key={media.id} media={media} layout={layout} onFavoriteChange={fetchMedia} />
          ))}
        </div>
      )}
    </div>
  );
};
