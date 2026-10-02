import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  Monitor, 
  Smartphone, 
  Check, 
  ArrowLeft,
  Sliders,
  Layers,
  Sparkles,
  Radio,
  Link2,
  Tv
} from 'lucide-react';
import { MediaItem } from '../../shared/types';
import { api } from '../api/apiClient';
import { useSocket } from '../context/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface VideoPlayerProps {
  media: MediaItem;
  initialPosition?: number;
  onEnded?: () => void;
  autoPlay?: boolean;
  roomSync?: {
    roomId: string;
    state: 'playing' | 'paused';
    position: number;
    isController?: boolean;
    onSyncCommand?: (action: { state?: 'playing' | 'paused'; position?: number; mediaId?: string }) => void;
  };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  initialPosition = 0,
  onEnded,
  autoPlay = true,
  roomSync,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { deviceId, sendCommandToHost, hostState, reportHostPlaybackState, isHost } = useSocket();

  const queryParams = new URLSearchParams(location.search);
  const syncRequested = queryParams.get('sync') === 'true';

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [transcodeMode, setTranscodeMode] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [isHostSync, setIsHostSync] = useState(syncRequested);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Determine initial stream URL
  const streamUrl = transcodeMode
    ? `/api/media/${media.id}/transcode?startTime=${Math.floor(currentTime)}`
    : `/api/media/${media.id}/stream`;

  // Check if we should prompt to resume
  useEffect(() => {
    if (!syncRequested && initialPosition > 10 && initialPosition < (media.duration || 100) - 30) {
      setShowResumePrompt(true);
    }
  }, [initialPosition, media.duration, syncRequested]);

  // Handle Controls Auto-hide
  const handleActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  useEffect(() => {
    handleActivity();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, handleActivity]);

  // Room state synchronization (Watch Party Live Sync)
  useEffect(() => {
    if (!roomSync || !videoRef.current) return;

    // Sync playback position if delta > 1.5 seconds
    const timeDelta = Math.abs(videoRef.current.currentTime - roomSync.position);
    if (timeDelta > 1.5) {
      videoRef.current.currentTime = roomSync.position;
      setCurrentTime(roomSync.position);
    }

    // Sync play/pause state
    if (roomSync.state === 'playing' && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (roomSync.state === 'paused' && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [roomSync?.state, roomSync?.position]);

  // Host state synchronization (Live Sync with Host PC)
  useEffect(() => {
    if (!isHostSync || !hostState || hostState.mediaId !== media.id || !videoRef.current) {
      return;
    }

    // Sync playback position if delta > 1.5 seconds
    const timeDelta = Math.abs(videoRef.current.currentTime - hostState.position);
    if (timeDelta > 1.5) {
      videoRef.current.currentTime = hostState.position;
      setCurrentTime(hostState.position);
    }

    // Sync play/pause state
    if (hostState.state === 'playing' && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (hostState.state === 'paused' && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isHostSync, hostState, media.id]);

  // Host report broadcast loop (if running on Host PC)
  useEffect(() => {
    const reportInterval = setInterval(() => {
      if (videoRef.current) {
        reportHostPlaybackState({
          mediaId: media.id,
          media,
          position: videoRef.current.currentTime,
          duration: videoRef.current.duration || duration,
          state: isPlaying ? 'playing' : 'paused',
        });
      }
    }, 2000);

    return () => clearInterval(reportInterval);
  }, [media, isPlaying, duration, reportHostPlaybackState]);

  // Save progress periodically to database
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && videoRef.current.currentTime > 0) {
        api.updateProgress(media.id, {
          deviceId,
          position: videoRef.current.currentTime,
          duration: videoRef.current.duration || duration,
        }).catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [media.id, deviceId, duration]);

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      if (roomSync?.onSyncCommand) {
        roomSync.onSyncCommand({ state: 'playing', position: videoRef.current.currentTime });
      }
    } else {
      videoRef.current.pause();
      if (roomSync?.onSyncCommand) {
        roomSync.onSyncCommand({ state: 'paused', position: videoRef.current.currentTime });
      }
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      if (roomSync?.onSyncCommand) {
        roomSync.onSyncCommand({ position: newTime, state: isPlaying ? 'playing' : 'paused' });
      }
    }
    // If user manually seeks outside room sync, switch mode
    if (isHostSync) {
      setIsHostSync(false);
      setToastMessage('Switched to Independent Playback');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    if (roomSync?.onSyncCommand) {
      roomSync.onSyncCommand({ position: newTime, state: isPlaying ? 'playing' : 'paused' });
    }
    if (isHostSync) {
      setIsHostSync(false);
      setToastMessage('Switched to Independent Playback');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleCastToHost = async () => {
    try {
      await sendCommandToHost({
        command: 'loadMedia',
        mediaId: media.id,
        position: videoRef.current?.currentTime || 0,
      });
      setToastMessage('Playing on Host Screen');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('Could not connect to Host');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const toggleHostSync = () => {
    setIsHostSync(!isHostSync);
    setToastMessage(!isHostSync ? '🔗 Synced with Host Screen' : 'Independent Playback');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      handleActivity();
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skipTime(10);
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.min(1, volume + 0.1);
            setVolume(nextVol);
            videoRef.current.volume = nextVol;
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.max(0, volume - 0.1);
            setVolume(nextVol);
            videoRef.current.volume = nextVol;
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, currentTime, handleActivity]);

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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleActivity}
      onTouchStart={handleActivity}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl select-none group border border-border/40"
    >
      {/* HTML5 Video Tag */}
      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full h-full object-contain cursor-pointer"
        autoPlay={autoPlay && !showResumePrompt}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          if (videoRef.current) {
            api.updateProgress(media.id, {
              deviceId,
              position: videoRef.current.currentTime,
              duration: videoRef.current.duration || duration,
            }).catch(() => {});
          }
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || media.duration || 0);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (onEnded) onEnded();
        }}
        onClick={togglePlay}
        onError={() => {
          if (!transcodeMode) {
            setTranscodeMode(true);
            setToastMessage('Switching to Transcoding stream...');
            setTimeout(() => setToastMessage(null), 3000);
          }
        }}
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-primary" />
        </div>
      )}

      {/* Live Host Sync Status Pill */}
      {isHostSync && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-emerald-500/90 text-white rounded-full text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
          <Radio className="w-3.5 h-3.5" />
          <span>Synced with Host Screen</span>
        </div>
      )}

      {/* Resume Playback Prompt Banner */}
      {showResumePrompt && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
          <Sparkles className="w-12 h-12 text-primary-light mb-3 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-2">Resume Watching?</h3>
          <p className="text-sm text-slate-300 mb-6 max-w-sm">
            You stopped watching at <span className="font-mono text-primary-light font-semibold">{formatTime(initialPosition)}</span>. Would you like to resume?
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowResumePrompt(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = initialPosition;
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-glow-primary transition-all"
            >
              Resume ({formatTime(initialPosition)})
            </button>
            <button
              onClick={() => {
                setShowResumePrompt(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white font-medium text-sm transition-all"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Top Header Controls (Back, Title, Cast to Host, Sync with Host) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-black/40 hover:bg-black/80 backdrop-blur-xs text-slate-300 hover:text-white transition-colors"
            title="Back to media"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {media.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="uppercase font-mono">{media.codec}</span>
              <span>•</span>
              <span>{media.resolution}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Sync with Host & Cast to Host */}
        <div className="flex items-center gap-2">
          {/* Host Sync Button */}
          {hostState && hostState.mediaId === media.id && (
            <button
              onClick={toggleHostSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all ${
                isHostSync
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-secondary/80 text-slate-300 border-border hover:text-white'
              }`}
              title="Toggle Live Synchronized Playback with Host"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isHostSync ? 'Synced' : 'Sync with Host'}</span>
            </button>
          )}

          {/* Cast / Host on Big Screen */}
          <button
            onClick={handleCastToHost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-primary backdrop-blur-md text-white text-xs font-semibold border border-white/10 shadow-lg transition-all"
            title="Host / Play on Host PC Big Screen"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Host PC</span>
          </button>
        </div>
      </div>

      {/* Floating Center Play/Pause Trigger */}
      <div
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
      >
        {!isPlaying && !showResumePrompt && (
          <div className="w-20 h-20 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-glow-primary transform transition-transform hover:scale-110">
            <Play className="w-10 h-10 fill-white ml-1.5" />
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-mono font-medium text-slate-300 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 group/bar py-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary transition-all"
            />
          </div>
          <span className="text-xs font-mono font-medium text-slate-400 w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          {/* Left Buttons: Play, Rewind, Forward, Volume */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl text-white hover:text-primary-light transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Rewind 10s (J)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skipTime(10)}
              className="p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Fast-forward 10s (L)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary opacity-60 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>
          </div>

          {/* Right Buttons: Speed, Transcode, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-mono font-semibold text-slate-200 hover:text-white transition-colors"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-xl min-w-[90px] flex flex-col z-30 animate-slide-up">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-3 py-1.5 text-xs text-left font-mono flex items-center justify-between hover:bg-secondary transition-colors ${
                        playbackRate === rate ? 'text-primary font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transcode Toggle */}
            <button
              onClick={() => {
                setTranscodeMode(!transcodeMode);
                setToastMessage(
                  !transcodeMode ? 'Enabled Real-Time Transcoding' : 'Enabled Direct Stream'
                );
                setTimeout(() => setToastMessage(null), 2500);
              }}
              className={`p-2 rounded-xl transition-colors ${
                transcodeMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle Transcoding Engine"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* In-Player Toast Alerts */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
