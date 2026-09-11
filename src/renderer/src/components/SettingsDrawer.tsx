import React, { useState, useEffect } from 'react';
import { CogdexSyncConfig, SyncResponse } from '../types';
import { CloseIcon, RefreshIcon, CheckIcon, SaveIcon } from './Icons';
import { IconButton } from './IconButton';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: CogdexSyncConfig;
  onSaveConfig: (newConfig: Partial<CogdexSyncConfig>) => Promise<void>;
  onForceSync: () => Promise<SyncResponse>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onForceSync,
}) => {
  const [form, setForm] = useState<CogdexSyncConfig>({ ...config });
  const [excludedAppsText, setExcludedAppsText] = useState(
    config.excludedApps.join(', ')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncResponse | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setForm({ ...config });
    setExcludedAppsText(config.excludedApps.join(', '));
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const apps = excludedAppsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await onSaveConfig({
      ...form,
      excludedApps: apps,
      idleTimeoutSecs: Number(form.idleTimeoutSecs) || 60,
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await onForceSync();
      setSyncStatus(res);
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err?.message || 'Sync request failed',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <aside
      className={`fixed top-0 right-0 bottom-0 w-96 bg-ink-panel border-l border-ink-border shadow-elevated flex flex-col z-40 transform transition-transform duration-200 ease-out select-none ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="h-12 px-4 border-b border-ink-border flex items-center justify-between bg-ink-sidebar/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-serif text-sm font-semibold text-ink-text tracking-wide">
            Vault Sync & Engine
          </span>
        </div>
        <IconButton icon={CloseIcon} title="Close settings" onClick={onClose} size="sm" variant="ghost" />
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {/* Dev Mode TCC Identity Notice */}
        {import.meta.env.DEV && (
          <div className="p-3 rounded bg-ink-card border border-ink-accent/30 text-ink-accent-light space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-accent-light flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-accent-light" />
              Dev Mode Permission Identity
            </div>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              In dev mode, macOS assigns system permissions to the <strong className="text-ink-text font-semibold">'Electron'</strong> binary bundle.
            </p>
          </div>
        )}

        {/* Master Switch Card */}
        <div className="p-3.5 bg-ink-card rounded border border-ink-border flex items-center justify-between">
          <div className="pr-3">
            <div className="font-medium text-ink-text text-xs">Enable Vault Sync</div>
            <div className="text-ink-muted text-[11px] leading-tight mt-0.5">
              Append completed keylog sessions to your Obsidian daily note
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="w-4 h-4 rounded border-ink-border bg-ink-bg text-ink-accent focus:ring-1 focus:ring-ink-accent-light cursor-pointer accent-ink-accent"
          />
        </div>

        {/* Vault Path */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs">
            Obsidian Vault Path (Absolute)
          </label>
          <input
            type="text"
            placeholder="/Users/username/Documents/ObsidianVault"
            value={form.vaultPath}
            onChange={(e) => setForm({ ...form, vaultPath: e.target.value })}
            className="w-full bg-ink-bg border border-ink-border rounded px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Daily Folder Root */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs flex items-center justify-between">
            <span>Daily Folder Root</span>
            <span className="text-ink-faint font-mono text-[11px]">(default: Daily)</span>
          </label>
          <input
            type="text"
            placeholder="Daily"
            value={form.dailyFolderRoot}
            onChange={(e) => setForm({ ...form, dailyFolderRoot: e.target.value })}
            className="w-full bg-ink-bg border border-ink-border rounded px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Day Pattern & Keylog Suffix */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <label className="block font-medium text-ink-text text-xs">Day Pattern</label>
            <input
              type="text"
              placeholder="%Y-%m-%d"
              value={form.dayPattern}
              onChange={(e) => setForm({ ...form, dayPattern: e.target.value })}
              className="w-full bg-ink-bg border border-ink-border rounded px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-medium text-ink-text text-xs">Keylog Suffix</label>
            <input
              type="text"
              placeholder=" - keylog"
              value={form.keylogSuffix}
              onChange={(e) => setForm({ ...form, keylogSuffix: e.target.value })}
              className="w-full bg-ink-bg border border-ink-border rounded px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
            />
          </div>
        </div>

        {/* Idle Timeout */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs">
            Idle Timeout Gap (seconds)
          </label>
          <input
            type="number"
            min="5"
            max="3600"
            value={form.idleTimeoutSecs}
            onChange={(e) =>
              setForm({ ...form, idleTimeoutSecs: parseInt(e.target.value, 10) || 60 })
            }
            className="w-full bg-ink-bg border border-ink-border rounded px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Excluded Apps */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs">
            Excluded Applications
          </label>
          <textarea
            rows={3}
            value={excludedAppsText}
            onChange={(e) => setExcludedAppsText(e.target.value)}
            placeholder="1password, bitwarden, inkwell, ..."
            className="w-full bg-ink-bg border border-ink-border rounded px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors resize-none"
          />
          <span className="text-[11px] text-ink-faint block">
            Comma-separated app names to ignore during keystroke logging.
          </span>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div
            className={`p-2.5 rounded border text-xs leading-relaxed break-words font-mono ${
              syncStatus.success
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
            }`}
          >
            {syncStatus.message}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3.5 border-t border-ink-border bg-ink-sidebar/95">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-ink-card hover:bg-ink-hover text-ink-text border border-ink-border font-medium transition-colors text-xs select-none disabled:opacity-40 cursor-pointer shadow-subtle active:scale-[0.98]"
          >
            {saveSuccess ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <SaveIcon className="w-3.5 h-3.5 text-ink-muted" />}
            <span>{saveSuccess ? 'Saved' : 'Save Config'}</span>
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-ink-accent hover:bg-ink-accent-hover text-white border border-ink-accent-light/30 font-medium transition-colors text-xs select-none disabled:opacity-40 cursor-pointer shadow-subtle active:scale-[0.98]"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Force Sync'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
