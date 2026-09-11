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
  const [form, setForm] = useState<CogdexSyncConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(config);
  }, [config]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onSaveConfig(form);
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await onForceSync();
      setSyncMessage(res.message);
    } catch {
      setSyncMessage('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-80 bg-ink-sidebar/95 backdrop-blur-md border-l border-ink-border shadow-overlay flex flex-col animate-slide-in-right select-none font-sans"
      aria-label="Settings panel"
    >
      {/* Drawer Header */}
      <div className="h-12 border-b border-ink-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-sm font-semibold text-ink-warm">
            Obsidian Sync Settings
          </h2>
        </div>
        <IconButton
          icon={CloseIcon}
          title="Close drawer"
          variant="ghost"
          size="sm"
          onClick={onClose}
        />
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Sync Enable Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-ink-panel/60 border border-ink-border-subtle">
          <div>
            <span className="font-medium text-ink-text block">
              Enable Obsidian Sync
            </span>
            <span className="text-[11px] text-ink-muted">
              Auto-sync sessions to vault
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.enabled}
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              form.enabled ? 'bg-ink-accent' : 'bg-ink-border'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                form.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Vault Path */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs flex items-center justify-between">
            <span>Obsidian Vault Path</span>
            <span className="text-ink-muted font-mono text-[11px]">(Absolute path)</span>
          </label>
          <input
            type="text"
            placeholder="/Users/username/Obsidian/MyVault"
            value={form.vaultPath}
            onChange={(e) => setForm({ ...form, vaultPath: e.target.value })}
            className="w-full bg-ink-bg border border-ink-border rounded-md px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Daily Folder Root */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs flex items-center justify-between">
            <span>Daily Folder Root</span>
            <span className="text-ink-muted font-mono text-[11px]">(default: Daily)</span>
          </label>
          <input
            type="text"
            placeholder="Daily"
            value={form.dailyFolderRoot}
            onChange={(e) => setForm({ ...form, dailyFolderRoot: e.target.value })}
            className="w-full bg-ink-bg border border-ink-border rounded-md px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Day Pattern */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs flex items-center justify-between">
            <span>Day Folder Pattern</span>
            <span className="text-ink-muted font-mono text-[11px]">(moment format)</span>
          </label>
          <input
            type="text"
            placeholder="YYYY/MM-MMM/YYYY-MM-DD"
            value={form.dayPattern}
            onChange={(e) => setForm({ ...form, dayPattern: e.target.value })}
            className="w-full bg-ink-bg border border-ink-border rounded-md px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Keylog Note Suffix */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs flex items-center justify-between">
            <span>Keylog Note Suffix</span>
            <span className="text-ink-muted font-mono text-[11px]">(e.g. keylog)</span>
          </label>
          <input
            type="text"
            placeholder="keylog"
            value={form.keylogSuffix}
            onChange={(e) => setForm({ ...form, keylogSuffix: e.target.value })}
            className="w-full bg-ink-bg border border-ink-border rounded-md px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Idle Timeout */}
        <div className="space-y-1.5">
          <label className="block font-medium text-ink-text text-xs flex items-center justify-between">
            <span>Idle Timeout (seconds)</span>
            <span className="text-ink-muted font-mono text-[11px]">(Default 120s)</span>
          </label>
          <input
            type="number"
            min="10"
            max="3600"
            value={form.idleTimeoutSecs}
            onChange={(e) => setForm({ ...form, idleTimeoutSecs: Number(e.target.value) })}
            className="w-full bg-ink-bg border border-ink-border rounded-md px-2.5 py-1.5 text-ink-text font-mono text-xs focus:border-ink-accent focus:ring-1 focus:ring-ink-accent-light/40 transition-colors"
          />
        </div>

        {/* Save button & status */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-ink-accent hover:bg-ink-accent-hover text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveMessage ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-ink-success" />
                <span>{saveMessage}</span>
              </>
            ) : (
              <>
                <SaveIcon className="w-3.5 h-3.5" />
                <span>Save Config</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Manual Force Sync Section */}
      <div className="p-4 border-t border-ink-border bg-ink-panel/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-text">Manual Sync</span>
          {syncMessage && (
            <span className="text-[11px] text-ink-muted truncate max-w-[150px]">
              {syncMessage}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={isSyncing || !form.enabled}
          className="w-full px-3 py-1.5 bg-ink-card hover:bg-ink-hover border border-ink-border text-ink-text rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Force Sync'}</span>
        </button>
      </div>
    </aside>
  );
};
