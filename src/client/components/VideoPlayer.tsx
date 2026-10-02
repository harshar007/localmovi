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
  Sparkles
} from 'lucide-react';
import { MediaItem } from '../../shared/types';
import { api } from '../api/apiClient';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

interface VideoPlayerProps {
  media: MediaItem;
  initialPosition?: number;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  initialPosition = 0,
  onEnded,
  autoPlay = true,
}) => {
  const navigate = useNavigate();
  const { deviceId, sendCommandToHost } = useSocket();

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Determine initial stream URL
  const streamUrl = transcodeMode
    ? `/api/media/${media.id}/transcode?startTime=${Math.floor(currentTime)}`
    : `/api/media/${media.id}/stream`;

  // Check if we should prompt to resume
  useEffect(() => {
    if (initialPosition > 10 && initialPosition < (media.duration || 100) - 30) {
      setShowResumePrompt(true);
    }
  }, [initialPosition, media.duration]);

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

  // Save progress periodically
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
    } else {
      videoRef.current.pause();
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Playback Rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Cast / Play on Host PC
  const handleCastToHost = async () => {
    try {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      await sendCommandToHost({
        command: 'loadMedia',
        mediaId: media.id,
        position: currentTime,
      });
      setToastMessage('Sent to Host PC');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('Host PC offline');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore typing in inputs
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

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
          // If direct play fails (e.g. MKV/AVI/AC3), switch automatically to transcode mode
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

      {/* Top Header Controls (Back, Title, Cast to Host) */}
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

        {/* Cast to Host PC Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCastToHost}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary/80 hover:bg-primary backdrop-blur-md text-white text-xs font-semibold border border-white/10 shadow-lg transition-all"
            title="Stream / Control on Host PC"
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Play on Host</span>
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
              title="Rewind 10 seconds (J)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skipTime(10)}
              className="p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
              title="Forward 10 seconds (L)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* Right Buttons: Transcode toggle, Speed, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3 relative">
            {/* Direct / Transcode Mode Indicator */}
            <button
              onClick={() => setTranscodeMode(!transcodeMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                transcodeMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
              title={transcodeMode ? 'Transcoding active via FFmpeg' : 'Direct Play (Zero CPU)'}
            >
              {transcodeMode ? 'Transcoded' : 'Direct Play'}
            </button>

            {/* Speed Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1 rounded-lg bg-card/80 hover:bg-card text-xs font-mono font-medium text-slate-300 hover:text-white border border-border"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 w-24 glass-dropdown rounded-xl shadow-xl z-30 flex flex-col">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleRateChange(rate)}
                      className={`px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-primary/20 ${
                        playbackRate === rate ? 'text-primary-light font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
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

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-600/90 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-2xl flex items-center gap-2 animate-fade-in z-40">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
