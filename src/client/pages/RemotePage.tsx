import React from 'react';
import { RemoteController } from '../components/RemoteController';
import { Smartphone, Sparkles } from 'lucide-react';

export const RemotePage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-16">
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
          <Smartphone className="w-6 h-6 text-primary-light" />
          Host PC Remote Control
        </h1>
        <p className="text-xs text-slate-400">
          Control video playback on your host computer in real-time.
        </p>
      </div>

      <RemoteController />
    </div>
  );
};
