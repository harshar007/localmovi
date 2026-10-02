import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  HardDrive, 
  ChevronRight, 
  Check, 
  X, 
  ArrowLeft, 
  FolderPlus, 
  Sparkles,
  Search,
  Monitor
} from 'lucide-react';
import { api } from '../api/apiClient';

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folderPath: string, folderName?: string) => void;
  title?: string;
}

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
  title = 'Choose Video Directory',
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<{ name: string; path: string; isDrive: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [manualPath, setManualPath] = useState('');

  const isElectron = !!(window as any).electronAPI?.isElectron;

  // Load directories for a given path
  const loadPath = async (dirPath = '') => {
    try {
      setLoading(true);
      setSearchFilter('');
      const data = await api.browseDirectories(dirPath);
      setCurrentPath(data.currentPath || '');
      setParentPath(data.parentPath || null);
      setDirectories(data.directories || []);
      setManualPath(data.currentPath || '');
    } catch (err) {
      console.error('Failed to browse directories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPath('');
    }
  }, [isOpen]);

  // Native Windows Explorer dialog if running inside Electron
  const handleNativeSelect = async () => {
    if (isElectron && (window as any).electronAPI?.selectFolder) {
      try {
        const folder = await (window as any).electronAPI.selectFolder();
        if (folder) {
          onSelectFolder(folder);
          onClose();
        }
      } catch (err) {
        console.error('Native dialog error', err);
      }
    }
  };

  const handleSelectCurrent = () => {
    if (currentPath) {
      onSelectFolder(currentPath);
      onClose();
    }
  };

  const handleFolderClick = (dir: { name: string; path: string; isDrive: boolean }) => {
    loadPath(dir.path);
  };

  const filteredDirs = directories.filter((d) =>
    d.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-6 border border-border/80 shadow-2xl space-y-5 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light shadow-glow-primary">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">
                Browse drives and select a folder containing video files.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-card text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Native Windows Explorer button (if Electron) */}
        {isElectron && (
          <button
            onClick={handleNativeSelect}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 hover:from-primary/30 hover:to-primary/30 border border-primary/40 text-primary-light text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Monitor className="w-4 h-4" />
            <span>Open Windows Explorer Folder Dialog</span>
          </button>
        )}

        {/* Quick Common Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Quick Shortcuts
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {['D:\\Movies', 'D:\\Videos', 'D:\\', 'C:\\Videos'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onSelectFolder(preset);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary/20 border border-border hover:border-primary/40 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Folder className="w-3.5 h-3.5 text-primary-light" />
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center gap-2 bg-secondary/80 p-2 rounded-2xl border border-border">
          {parentPath !== null && (
            <button
              onClick={() => loadPath(parentPath || '')}
              className="p-1.5 rounded-xl hover:bg-card text-slate-300 hover:text-white transition-colors"
              title="Go back to parent directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex-1 font-mono text-xs text-emerald-400 truncate px-2 font-semibold">
            {currentPath || 'This PC (Drives)'}
          </div>

          {currentPath && (
            <button
              onClick={handleSelectCurrent}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary transition-all flex items-center gap-1.5 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Select This Folder</span>
            </button>
          )}
        </div>

        {/* Search / Filter Subdirectories */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter folders..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-secondary/60 border border-border/80 focus:border-primary rounded-xl text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Directories Grid / List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading directories...</span>
            </div>
          ) : filteredDirs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-slate-500">
              {searchFilter ? 'No matching folders found.' : 'No subdirectories found in this location.'}
            </div>
          ) : (
            filteredDirs.map((dir) => (
              <div
                key={dir.path}
                onClick={() => handleFolderClick(dir)}
                className="flex items-center justify-between p-3 rounded-xl bg-card hover:bg-card-hover border border-border/40 hover:border-primary/50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 truncate">
                  {dir.isDrive ? (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light shrink-0">
                      <HardDrive className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-slate-400 group-hover:text-primary-light shrink-0">
                      <Folder className="w-4 h-4" />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {dir.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFolder(dir.path, dir.name);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary text-slate-300 hover:text-white text-[11px] font-semibold transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Select
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary-light" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Manual Input fallback */}
        <div className="pt-3 border-t border-border/40 flex items-center gap-2">
          <input
            type="text"
            placeholder="Or type full path (e.g. D:\Movies)"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualPath.trim()) {
                onSelectFolder(manualPath.trim());
                onClose();
              }
            }}
            className="flex-1 px-3.5 py-2 text-xs font-mono bg-secondary border border-border focus:border-primary rounded-xl text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => {
              if (manualPath.trim()) {
                onSelectFolder(manualPath.trim());
                onClose();
              }
            }}
            disabled={!manualPath.trim()}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold shadow-glow-primary transition-all shrink-0"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
