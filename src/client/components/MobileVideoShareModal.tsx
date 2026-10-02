import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  UploadCloud, 
  Film, 
  Play, 
  Users, 
  Monitor, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  Sparkles,
  Laptop,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem } from '../../shared/types';
import { useSocket } from '../context/SocketContext';

export interface VideoUploadModalProps {
  initialFile?: File | null;
  onClose: () => void;
  onUploaded?: (media: MediaItem) => void;
}

export const MobileVideoShareModal: React.FC<VideoUploadModalProps> = ({
  initialFile,
  onClose,
  onUploaded,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { deviceId, deviceName, sendPartyInvite, sendCommandToHost } = useSocket();

  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [transferredBytes, setTransferredBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (initialFile) {
      startUpload(initialFile);
    }
  }, [initialFile]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage(null);
      startUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setErrorMessage(null);
      startUpload(file);
    }
  };

  const startUpload = async (file: File) => {
    setIsUploading(true);
    setUploadPercent(0);
    setTransferredBytes(0);
    setTotalBytes(file.size || 0);
    setErrorMessage(null);

    try {
      const media = await api.uploadMedia(file, (percent, loaded, total) => {
        setUploadPercent(percent);
        if (loaded !== undefined) setTransferredBytes(loaded);
        if (total !== undefined) setTotalBytes(total);
      });

      setUploadedMedia(media);
      if (onUploaded) onUploaded(media);
    } catch (err: any) {
      console.error('Failed to upload video', err);
      setErrorMessage(err.message || 'Could not upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleHostParty = async () => {
    if (!uploadedMedia) return;
    try {
      const partyTitle = `${deviceName}'s Movie - ${uploadedMedia.title}`;
      const room = await api.createRoom({
        name: partyTitle,
        deviceId,
        deviceName,
        mediaId: uploadedMedia.id,
      });

      // Broadcast invite to TV and all other LAN screens
      sendPartyInvite({
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        mediaTitle: uploadedMedia.title,
      });

      onClose();
      navigate(`/rooms?join=${room.code}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start watch party');
    }
  };

  const handleWatchHere = () => {
    if (!uploadedMedia) return;
    onClose();
    navigate(`/watch/${uploadedMedia.id}`);
  };

  const handlePlayOnPC = async () => {
    if (!uploadedMedia) return;
    try {
      await sendCommandToHost({
        command: 'loadMedia',
        mediaId: uploadedMedia.id,
        position: 0,
      });
      onClose();
      navigate('/remote');
    } catch {
      alert('Could not cast to PC screen');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-[#1E1F20] border border-[#3C4043] shadow-elevation-3 space-y-6 max-h-[95vh] overflow-y-auto">
        {/* Header (ImgBB inspired clean visual) */}
        <div className="flex items-start justify-between border-b border-[#3C4043]/40 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Upload and share movies</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#A0A0A0]">
              Drag and drop anywhere to start uploading your video. Works on laptop and mobile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#A0A0A0] hover:text-white bg-[#28292A] hover:bg-[#303134] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-semibold">{errorMessage}</span>
              {selectedFile && !isUploading && (
                <button
                  onClick={() => startUpload(selectedFile)}
                  className="block mt-2 px-3 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 rounded-full font-bold text-[11px] transition-colors"
                >
                  Retry Upload
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: Big ImgBB Style Dropzone & START UPLOADING Button */}
        {!uploadedMedia && !isUploading && (
          <div className="space-y-5 text-center">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`relative p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 group ${
                isDraggingOver
                  ? 'border-[#A8C7FA] bg-[#004A77]/30 scale-[1.01]'
                  : 'border-[#3C4043] hover:border-[#A8C7FA]/80 bg-[#28292A]/50 hover:bg-[#28292A]'
              }`}
            >
              <input
                id="movie-universal-file-input"
                type="file"
                ref={fileInputRef}
                accept="video/*,.mp4,.mkv,.avi,.mov,.webm,.m4v,.flv,.wmv,.ts,.3gp,video/mp4,video/x-matroska,video/quicktime,video/webm"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />

              {/* Big Center Icon */}
              <div className="w-20 h-20 rounded-3xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <UploadCloud className="w-10 h-10 text-[#A8C7FA]" />
              </div>

              {/* Big ImgBB Style Button */}
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-sm sm:text-base font-black shadow-md uppercase tracking-wider group-hover:scale-105 transition-transform pointer-events-none">
                  <span>START UPLOADING</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </span>
                <p className="text-xs text-[#A0A0A0]">
                  or drag and drop video files here from Laptop / Mobile
                </p>
              </div>

              {/* Tag Pills (Easy tags like ImgBB) */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                {['MP4', 'MKV', 'MOV', 'WebM', 'AVI', '4K UHD', '1080p', 'HDR'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-[#1E1F20] border border-[#3C4043]/60 text-[11px] font-mono text-[#A0A0A0] font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Devices info badge */}
            <div className="flex items-center justify-center gap-6 text-xs text-[#A0A0A0] pt-1">
              <div className="flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-[#A8C7FA]" />
                <span>Laptop & PC Files</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#A8C7FA]" />
                <span>Phone Gallery & Downloads</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Live Uploading Progress */}
        {isUploading && (
          <div className="p-8 sm:p-10 rounded-3xl bg-[#28292A] border border-[#3C4043]/60 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#004A77] text-[#A8C7FA] flex items-center justify-center mx-auto animate-pulse shadow-md">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Uploading Movie to LocalStream...
              </h3>
              <p className="text-xs text-[#A0A0A0] truncate max-w-sm mx-auto font-mono">
                {selectedFile?.name || 'Processing video file...'}
              </p>
            </div>

            {/* Progress Bar & Byte Stats */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="w-full h-3.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-[#3C4043]/60">
                <div
                  className="h-full bg-gradient-to-r from-[#004A77] via-[#A8C7FA] to-[#C2E7FF] rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(4, uploadPercent)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#A0A0A0]">
                  {formatFileSize(transferredBytes)} / {formatFileSize(totalBytes)}
                </span>
                <span className="font-bold text-[#A8C7FA] text-sm">
                  {uploadPercent}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Upload Success & Ready to Host / Watch */}
        {uploadedMedia && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>🎉 Video successfully uploaded and ready to stream!</span>
            </div>

            {/* Media Preview Card */}
            <div className="p-4 rounded-2xl bg-[#28292A] border border-[#3C4043]/50 flex items-center gap-4">
              <div className="w-24 h-16 rounded-xl bg-black/50 overflow-hidden relative shrink-0 border border-white/10 flex items-center justify-center">
                {uploadedMedia.thumbnailPath ? (
                  <img src={uploadedMedia.thumbnailPath} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Film className="w-6 h-6 text-[#A0A0A0] m-auto" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-white truncate">
                  {uploadedMedia.title}
                </h4>
                <p className="text-xs text-[#A0A0A0] mt-0.5 font-mono">
                  {formatFileSize(uploadedMedia.fileSize)} • {uploadedMedia.resolution} • {uploadedMedia.codec}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleHostParty}
                className="w-full py-3.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
              >
                <Users className="w-4 h-4" />
                <span>🚀 Host Watch Party & Broadcast to TV</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  onClick={handleWatchHere}
                  className="w-1/2 py-3 rounded-full bg-[#004A77] hover:bg-[#0842A0] text-[#C2E7FF] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Watch Now</span>
                </button>

                <button
                  onClick={handlePlayOnPC}
                  className="w-1/2 py-3 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-bold flex items-center justify-center gap-1.5 border border-[#3C4043]/50 active:scale-98"
                >
                  <Monitor className="w-4 h-4 text-[#A8C7FA]" />
                  <span>Play on PC</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const VideoUploadModal = MobileVideoShareModal;
