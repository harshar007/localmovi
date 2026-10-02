import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Monitor, 
  Film, 
  WifiOff, 
  FastForward, 
  Sparkles,
  ChevronRight,
  Plus,
  Tv,
  ListPlus
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/apiClient';
import { MediaItem } from '../../shared/types';
import { Link } from 'react-router-dom';

export const RemoteController: React.FC = () => {
  const { hostState, isConnected, sendCommandToHost } = useSocket();
  const [localSeek, setLocalSeek] = useState<number | null>(null);
  const [localVolume, setLocalVolume] = useState<number>(1);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    api.getMedia().then((media) => setAllMedia(media.slice(0, 20))).catch(() => {});
  }, []);

  useEffect(() => {
    if (hostState) {
      setLocalVolume(hostState.volume);
    }
  }, [hostState?.volume]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCommand = async (command: any, params: any = {}) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await sendCommandToHost({ command, ...params });
    } catch (err) {
      console.error('Failed to send remote command', err);
    } finally {
      setTimeout(() => setIsSending(false), 120);
    }
  };

  const handleSeekCommit = async () => {
    if (localSeek !== null) {
      await handleCommand('seek', { position: localSeek });
      setLocalSeek(null);
    }
  };

  const isPlaying = hostState?.state === 'playing';
  const currentPos = localSeek !== null ? localSeek : (hostState?.position || 0);
  const totalDuration = hostState?.duration || hostState?.media?.duration || 100;
  const currentMedia = hostState?.media;

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Google TV Remote Card */}
      <div className="bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043]/50 shadow-elevation-2 space-y-6 text-center">
        
        {/* Remote Header / Status */}
        <div className="flex items-center justify-between border-b border-[#3C4043]/40 pb-4 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#004A77] text-[#C2E7FF] flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Host PC Player</span>
              <span className="text-[10px] text-[#A0A0A0] flex items-center gap-1 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {isConnected ? 'Cast Connected' : 'Connecting...'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowMediaPicker(!showMediaPicker)}
            className="px-3 py-1.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#C2E7FF] text-xs font-medium border border-[#3C4043]/50 transition-colors flex items-center gap-1"
          >
            <ListPlus className="w-3.5 h-3.5 text-[#A8C7FA]" />
            <span>Select Movie</span>
          </button>
        </div>

        {/* Current Video Artwork & Metadata */}
        {currentMedia ? (
          <div className="space-y-3">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#28292A] border border-[#3C4043]/50 shadow-md">
              {currentMedia.thumbnailPath ? (
                <img src={currentMedia.thumbnailPath} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#A0A0A0]">
                  <Film className="w-12 h-12 opacity-30" />
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-emerald-400">
                Playing on Host Screen
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                {currentMedia.title}
              </h3>
              <p className="text-xs text-[#A0A0A0] font-mono mt-0.5">
                {formatTime(currentPos)} / {formatTime(totalDuration)}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#28292A] border border-dashed border-[#3C4043] space-y-3">
            <Film className="w-10 h-10 text-[#A0A0A0] mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-white">No Video Playing on PC</h4>
            <p className="text-xs text-[#A0A0A0]">
              Choose a movie from your library to start streaming on the host PC.
            </p>
            <button
              onClick={() => setShowMediaPicker(true)}
              className="m3-btn-primary mx-auto"
            >
              <span>Browse Movies</span>
            </button>
          </div>
        )}

        {/* Timeline Slider */}
        <div className="space-y-1 pt-1">
          <input
            type="range"
            min={0}
            max={totalDuration || 100}
            value={currentPos}
            disabled={!currentMedia}
            onChange={(e) => setLocalSeek(parseFloat(e.target.value))}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            className="w-full h-2 rounded-full bg-[#28292A] accent-[#A8C7FA] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-[#A0A0A0]">
            <span>{formatTime(currentPos)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Main Remote D-Pad / Playback Controls (Touch-Optimized) */}
        <div className="flex items-center justify-center gap-6 py-2">
          {/* -10s Seek */}
          <button
            onClick={() => handleCommand('seek', { position: Math.max(0, currentPos - 10) })}
            disabled={!currentMedia}
            className="w-14 h-14 rounded-full bg-[#28292A] hover:bg-[#303134] active:scale-95 disabled:opacity-40 text-white flex flex-col items-center justify-center transition-all border border-[#3C4043]/50"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-5 h-5 text-[#A8C7FA]" />
            <span className="text-[9px] font-mono font-bold mt-0.5">-10s</span>
          </button>

          {/* Central Play/Pause Big Button */}
          <button
            onClick={() => handleCommand('togglePlay')}
            disabled={!currentMedia}
            className="w-20 h-20 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] active:scale-95 disabled:opacity-40 text-[#062E6F] flex items-center justify-center shadow-glow-primary transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {/* +10s Seek */}
          <button
            onClick={() => handleCommand('seek', { position: Math.min(totalDuration, currentPos + 10) })}
            disabled={!currentMedia}
            className="w-14 h-14 rounded-full bg-[#28292A] hover:bg-[#303134] active:scale-95 disabled:opacity-40 text-white flex flex-col items-center justify-center transition-all border border-[#3C4043]/50"
            title="Forward 10 seconds"
          >
            <RotateCw className="w-5 h-5 text-[#A8C7FA]" />
            <span className="text-[9px] font-mono font-bold mt-0.5">+10s</span>
          </button>
        </div>

        {/* Volume & Mute Row */}
        <div className="p-3.5 rounded-2xl bg-[#28292A] border border-[#3C4043]/40 flex items-center gap-3">
          <button
            onClick={() => handleCommand('volume', { volume: localVolume === 0 ? 1 : 0 })}
            className="p-2 rounded-xl text-[#A0A0A0] hover:text-white"
          >
            {localVolume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-[#A8C7FA]" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={localVolume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setLocalVolume(val);
              handleCommand('volume', { volume: val });
            }}
            className="flex-1 h-2 rounded-full bg-[#1E1F20] accent-[#A8C7FA]"
          />

          <span className="text-[11px] font-mono text-[#A0A0A0] w-9 text-right">
            {Math.round(localVolume * 100)}%
          </span>
        </div>

        {/* Secondary Remote Actions (Fullscreen, Stop, Speed) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => handleCommand('toggleFullscreen')}
            className="py-2.5 rounded-2xl bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#3C4043]/40 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-[#A8C7FA]" />
            <span>Fullscreen</span>
          </button>

          <button
            onClick={() => handleCommand('speed', { speed: (hostState?.playbackRate || 1) === 1 ? 1.5 : (hostState?.playbackRate || 1) === 1.5 ? 2 : 1 })}
            className="py-2.5 rounded-2xl bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#3C4043]/40 transition-colors font-mono"
          >
            <FastForward className="w-4 h-4 text-[#C2E7FF]" />
            <span>{hostState?.playbackRate || 1}x</span>
          </button>

          <button
            onClick={() => handleCommand('stop')}
            className="py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-rose-500/30 transition-colors"
          >
            <Square className="w-4 h-4 text-rose-400" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Select Media Drawer */}
      {showMediaPicker && (
        <div className="bg-[#1E1F20] rounded-3xl p-5 border border-[#3C4043]/50 shadow-elevation-2 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0]">
              Cast Movie to PC Screen
            </h4>
            <button
              onClick={() => setShowMediaPicker(false)}
              className="text-xs text-[#A0A0A0] hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {allMedia.map((m) => (
              <div
                key={m.id}
                onClick={async () => {
                  await handleCommand('loadMedia', { mediaId: m.id, position: 0 });
                  setShowMediaPicker(false);
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-[#28292A] hover:bg-[#303134] border border-[#3C4043]/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-8 rounded-lg bg-black/60 overflow-hidden shrink-0">
                    {m.thumbnailPath ? (
                      <img src={m.thumbnailPath} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-4 h-4 m-auto text-[#A0A0A0]" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-white truncate">{m.title}</span>
                </div>
                <Play className="w-3.5 h-3.5 text-[#A8C7FA] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
