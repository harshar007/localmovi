import React, { useState, useRef } from 'react';
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
  Send
} from 'lucide-react';
import { api } from '../api/apiClient';
import { MediaItem } from '../../shared/types';
import { useSocket } from '../context/SocketContext';

interface MobileVideoShareModalProps {
  onClose: () => void;
  onUploaded?: (media: MediaItem) => void;
}

export const MobileVideoShareModal: React.FC<MobileVideoShareModalProps> = ({
  onClose,
  onUploaded,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { deviceId, deviceName, sendPartyInvite, sendCommandToHost } = useSocket();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadedMedia, setUploadedMedia] = useState<MediaItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage(null);
      startUpload(file);
    }
  };

  const startUpload = async (file: File) => {
    setIsUploading(true);
    setUploadPercent(0);
    setErrorMessage(null);

    try {
      const media = await api.uploadMedia(file, (percent) => {
        setUploadPercent(percent);
      });

      setUploadedMedia(media);
      if (onUploaded) onUploaded(media);
    } catch (err: any) {
      console.error('Failed to upload video from phone', err);
      setErrorMessage(err.message || 'Could not upload video from phone');
    } finally {
      setIsUploading(false);
    }
  };

  const handleHostParty = async () => {
    if (!uploadedMedia) return;
    try {
      const partyTitle = `${deviceName}'s Phone Movie - ${uploadedMedia.title}`;
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl p-6 bg-[#1E1F20] border border-[#3C4043] shadow-elevation-2 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3C4043]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#A8C7FA] text-[#062E6F] flex items-center justify-center font-bold shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Share Movie from Phone</h3>
              <p className="text-xs text-[#A0A0A0]">Stream or host a video directly from your mobile gallery / files.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#A0A0A0] hover:text-white bg-[#28292A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Video File Picker */}
        {!uploadedMedia && !isUploading && (
          <div className="space-y-4 text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 sm:p-10 rounded-3xl border-2 border-dashed border-[#3C4043] hover:border-[#A8C7FA] bg-[#28292A]/50 hover:bg-[#28292A] cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group active:scale-98"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <UploadCloud className="w-7 h-7 text-[#A8C7FA]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  Tap to Choose Video from Phone
                </p>
                <p className="text-xs text-[#A0A0A0]">
                  Supports MP4, MKV, MOV, WebM, AVI from your phone gallery or files
                </p>
              </div>
              <span className="mt-2 px-4 py-1.5 rounded-full bg-[#A8C7FA] text-[#062E6F] text-xs font-bold shadow-sm">
                Browse Files
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: Live Uploading Progress */}
        {isUploading && (
          <div className="p-8 rounded-3xl bg-[#28292A] border border-[#3C4043]/50 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#004A77] text-[#A8C7FA] flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm sm:text-base font-bold text-white">
                Transferring Video from Phone...
              </h4>
              <p className="text-xs text-[#A0A0A0]">
                {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : 'Uploading...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-[#3C4043]/60">
                <div
                  className="h-full bg-gradient-to-r from-[#004A77] via-[#A8C7FA] to-[#C2E7FF] rounded-full transition-all duration-300"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-[#A8C7FA]">
                {uploadPercent}% completed
              </span>
            </div>
          </div>
        )}

        {/* STEP 3: Upload Success & Ready to Host / Watch */}
        {uploadedMedia && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>🎉 Video successfully loaded from your phone and ready to host!</span>
            </div>

            {/* Media Preview Card */}
            <div className="p-3.5 rounded-2xl bg-[#28292A] border border-[#3C4043]/50 flex items-center gap-3.5">
              <div className="w-24 h-16 rounded-xl bg-black/50 overflow-hidden relative shrink-0">
                {uploadedMedia.thumbnailPath ? (
                  <img src={uploadedMedia.thumbnailPath} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Film className="w-6 h-6 text-[#A0A0A0] m-auto" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">
                  {uploadedMedia.title}
                </h4>
                <p className="text-xs text-[#A0A0A0] mt-0.5 font-mono">
                  {formatFileSize(uploadedMedia.fileSize)} • {uploadedMedia.resolution} • {uploadedMedia.codec}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleHostParty}
                className="w-full py-3 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
              >
                <Users className="w-4 h-4" />
                <span>🚀 Host Watch Party & Broadcast to TV</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleWatchHere}
                  className="w-1/2 py-2.5 rounded-full bg-[#004A77] hover:bg-[#0842A0] text-[#C2E7FF] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch on Phone</span>
                </button>

                <button
                  onClick={handlePlayOnPC}
                  className="w-1/2 py-2.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#3C4043]/50 active:scale-98"
                >
                  <Monitor className="w-3.5 h-3.5 text-[#A8C7FA]" />
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
