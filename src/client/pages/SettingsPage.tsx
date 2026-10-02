import React, { useState, useEffect } from 'react';
import { Settings, Save, Check, Shield, Server, Film, HardDrive } from 'lucide-react';
import { api } from '../api/apiClient';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateKey = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-primary-light" />
          Server Settings
        </h1>
        <p className="text-xs text-slate-400">
          Configure network ports, streaming defaults, and security access policies.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Network & Port */}
        <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            Network & Binding
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Server HTTP Port</label>
            <input
              type="number"
              value={settings['port'] || '3000'}
              onChange={(e) => updateKey('port', e.target.value)}
              className="w-full max-w-xs px-4 py-2 text-xs font-mono bg-secondary border border-border focus:border-primary rounded-xl text-white focus:outline-none"
            />
            <p className="text-[11px] text-slate-500">Default is 3000. Requires server restart to apply port changes.</p>
          </div>
        </div>

        {/* Video Transcoding Defaults */}
        <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-primary-light" />
            Adaptive Video Transcoding
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Default Transcode Profile</label>
            <select
              value={settings['transcode_quality'] || 'original'}
              onChange={(e) => updateKey('transcode_quality', e.target.value)}
              className="w-full max-w-xs px-3 py-2 text-xs bg-secondary border border-border focus:border-primary rounded-xl text-white focus:outline-none"
            >
              <option value="original">Direct Stream (Original Quality)</option>
              <option value="1080p">1080p Full HD Transcode</option>
              <option value="720p">720p HD Transcode (Low CPU)</option>
              <option value="480p">480p Mobile Optimized</option>
            </select>
            <p className="text-[11px] text-slate-500">
              LocalStream automatically uses zero-CPU direct stream when browser codecs support it.
            </p>
          </div>
        </div>

        {/* Access Security */}
        <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            Security & Authentication
          </h3>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/40">
            <div>
              <span className="font-semibold text-xs text-white block">Require Login for LAN Viewers</span>
              <span className="text-[11px] text-slate-400 block">
                When disabled, family members on the same Wi-Fi can stream directly without entering a password.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings['require_auth'] === 'true'}
              onChange={(e) => updateKey('require_auth', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-primary transition-all flex items-center gap-2"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved Successfully' : saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
