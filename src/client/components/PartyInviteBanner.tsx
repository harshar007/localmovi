import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, X, Users, Film } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const PartyInviteBanner: React.FC = () => {
  const { incomingPartyInvite, dismissPartyInvite } = useSocket();
  const navigate = useNavigate();

  if (!incomingPartyInvite) return null;

  const handleJoinAutomatically = () => {
    const code = incomingPartyInvite.roomCode;
    dismissPartyInvite();
    navigate(`/rooms?join=${code}`);
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full animate-bounce-in">
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border-2 border-primary shadow-2xl shadow-primary/30 bg-card/95 backdrop-blur-xl relative overflow-hidden space-y-3">
        {/* Glow Accent */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/30 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-glow-primary">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary-light border border-primary/30">
                  Watch Party Invite
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {incomingPartyInvite.senderName} invited you!
              </h4>
            </div>
          </div>

          <button
            onClick={dismissPartyInvite}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-secondary/80 border border-border/60 space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-white truncate">
              {incomingPartyInvite.roomName}
            </span>
          </div>
          {incomingPartyInvite.mediaTitle && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Film className="w-3.5 h-3.5 text-primary-light" />
              <span className="truncate">{incomingPartyInvite.mediaTitle}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={dismissPartyInvite}
            className="w-1/3 py-2 rounded-xl bg-secondary hover:bg-card text-slate-300 text-xs font-medium transition-colors"
          >
            Ignore
          </button>
          <button
            onClick={handleJoinAutomatically}
            className="w-2/3 py-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-xs font-bold shadow-glow-primary flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Join & Watch Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
