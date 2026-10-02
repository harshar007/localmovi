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
  Wifi, 
  WifiOff, 
  Sliders, 
  FastForward, 
  Sparkles,
  ChevronRight,
  Plus
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
    api.getMedia().then((media) => setAllMedia(media.slice(0, 15))).catch(() => {});
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
      setTimeout(() => setIsSending(false), 150);
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
    <div className="max-w-xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header Status Card */}
      <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light shadow-glow-primary">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              Host PC Player
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentMedia ? currentMedia.title : 'Ready for playback'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowMediaPicker(!showMediaPicker)}
          className="px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-border text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Film className="w-3.5 h-3.5 text-primary-light" />
          <span>Queue Video</span>
        </button>
      </div>

      {/* Quick Video Selector Drawer */}
      {showMediaPicker && (
        <div className="glass-panel rounded-3xl p-4 border border-primary/30 animate-slide-up space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Video to Play on Host
            </h4>
            <Link to="/library" className="text-xs text-primary-light hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
            {allMedia.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  handleCommand('loadMedia', { mediaId: m.id, position: 0 });
                  setShowMediaPicker(false);
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/60 hover:bg-primary/20 border border-border/40 hover:border-primary/40 cursor-pointer transition-colors group"
              >
                <div className="w-12 h-8 rounded-lg bg-black overflow-hidden shrink-0">
                  {m.thumbnailPath ? (
                    <img src={m.thumbnailPath} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-4 h-4 m-auto mt-2 text-slate-600" />
                  )}
                </div>
                <span className="text-xs font-medium text-slate-200 group-hover:text-primary-light truncate">
                  {m.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Playback Control Deck */}
      <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-2xl space-y-7">
        {/* Poster & Media Info */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-16 rounded-2xl bg-secondary/80 border border-border/60 overflow-hidden shrink-0 relative shadow-inner">
            {currentMedia?.thumbnailPath ? (
              <img src={currentMedia.thumbnailPath} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Film className="w-6 h-6 opacity-40" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary-light animate-ping" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              {currentMedia ? currentMedia.title : 'No Media Selected'}
            </h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="font-mono">{formatTime(currentPos)}</span>
              <span>/</span>
              <span className="font-mono text-slate-500">{formatTime(totalDuration)}</span>
              {currentMedia?.resolution && (
                <>
                  <span>•</span>
                  <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary-light text-[10px] font-bold">
                    {currentMedia.resolution}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Timeline Scrubber */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono font-medium text-slate-400">
            <span>{formatTime(currentPos)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={totalDuration > 0 ? totalDuration : 100}
            step="1"
            value={currentPos}
            onChange={(e) => setLocalSeek(parseFloat(e.target.value))}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            className="w-full h-2.5 bg-secondary/90 rounded-xl appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Big Touch Controls Row */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
          {/* Rewind 30s */}
          <button
            onClick={() => handleCommand('seek', { position: Math.max(0, currentPos - 30) })}
            className="w-12 h-12 rounded-2xl glass-card hover:bg-card-hover text-slate-300 hover:text-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Rewind 30s"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[9px] font-bold">30</span>
          </button>

          {/* Rewind 10s */}
          <button
            onClick={() => handleCommand('seek', { position: Math.max(0, currentPos - 10) })}
            className="w-12 h-12 rounded-2xl glass-card hover:bg-card-hover text-slate-300 hover:text-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Rewind 10s"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[9px] font-bold">10</span>
          </button>

          {/* Big Center Play / Pause Button */}
          <button
            onClick={() => handleCommand('togglePlay')}
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 ${
              isPlaying
                ? 'bg-gradient-to-tr from-accent to-rose-600 shadow-glow-accent text-white'
                : 'bg-gradient-to-tr from-primary to-indigo-600 shadow-glow-primary text-white'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-9 h-9 fill-white" />
            ) : (
              <Play className="w-9 h-9 fill-white ml-1" />
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => handleCommand('seek', { position: Math.min(totalDuration, currentPos + 10) })}
            className="w-12 h-12 rounded-2xl glass-card hover:bg-card-hover text-slate-300 hover:text-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Forward 10s"
          >
            <RotateCw className="w-5 h-5" />
            <span className="text-[9px] font-bold">10</span>
          </button>

          {/* Forward 30s */}
          <button
            onClick={() => handleCommand('seek', { position: Math.min(totalDuration, currentPos + 30) })}
            className="w-12 h-12 rounded-2xl glass-card hover:bg-card-hover text-slate-300 hover:text-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Forward 30s"
          >
            <RotateCw className="w-5 h-5" />
            <span className="text-[9px] font-bold">30</span>
          </button>
        </div>

        {/* Volume & Fullscreen Controls */}
        <div className="pt-4 border-t border-border/40 space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleCommand('volume', { volume: localVolume === 0 ? 1 : 0 })}
              className="p-2.5 rounded-xl bg-card hover:bg-card-hover text-slate-300 hover:text-white border border-border"
            >
              {localVolume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localVolume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setLocalVolume(v);
                handleCommand('volume', { volume: v });
              }}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs font-mono font-medium text-slate-400 w-9 text-right">
              {Math.round(localVolume * 100)}%
            </span>
          </div>

          {/* Speed & Actions Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-secondary/60 p-1 rounded-xl border border-border/50">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleCommand('speed', { speed: spd })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    (hostState?.playbackRate || 1.0) === spd
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCommand('toggleFullscreen')}
                className="p-2.5 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white transition-colors"
                title="Toggle Host Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCommand('stop')}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors"
                title="Stop Playback"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
