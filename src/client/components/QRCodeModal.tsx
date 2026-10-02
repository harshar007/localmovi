import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Smartphone, Wifi, Radio, Play, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  isOpen?: boolean;
  lanUrl?: string;
  qrCode?: string;
  targetUrl?: string;
  videoTitle?: string;
  onClose: () => void;
  title?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ 
  isOpen = true,
  lanUrl = '', 
  qrCode = '', 
  targetUrl,
  videoTitle,
  onClose,
  title
}) => {
  const [copied, setCopied] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string>(qrCode);

  const effectiveUrl = targetUrl || lanUrl || window.location.origin;

  useEffect(() => {
    if (targetUrl) {
      QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setGeneratedQr(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    } else if (qrCode) {
      setGeneratedQr(qrCode);
    }
  }, [targetUrl, qrCode]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-sm glass-panel rounded-3xl p-6 border border-border/80 shadow-2xl space-y-5 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-card text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center mx-auto shadow-glow-primary">
            {videoTitle ? <Play className="w-6 h-6 text-white fill-white ml-0.5" /> : <Smartphone className="w-6 h-6 text-white" />}
          </div>
          <h3 className="text-base font-bold text-white">
            {title || (videoTitle ? 'Scan & Play on Phone' : 'Connect Mobile Device')}
          </h3>
          <p className="text-xs text-slate-400">
            {videoTitle 
              ? `Scan to start playing "${videoTitle}" instantly on your phone`
              : "Scan with your phone's camera on the same Wi-Fi"}
          </p>
        </div>

        {/* Instant Play Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instant Play • No Login Required</span>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-2xl mx-auto w-60 h-60 flex items-center justify-center shadow-inner">
          {generatedQr ? (
            <img src={generatedQr} alt="Video Play QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="text-slate-500 text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Generating QR Code...</span>
            </div>
          )}
        </div>

        {/* LAN URL & Copy Button */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/80 border border-border">
          <Radio className="w-4 h-4 text-emerald-400 shrink-0 ml-1 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400 flex-1 truncate text-left font-semibold">
            {effectiveUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-card hover:bg-primary text-slate-300 hover:text-white transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-primary-light" />
          <span>Local Wi-Fi Streaming • Zero buffering</span>
        </div>
      </div>
    </div>
  );
};
