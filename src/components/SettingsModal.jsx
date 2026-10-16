import { useRef, useState } from 'react';
import { Cloud, Copy, Download, Eye, EyeOff, RefreshCw, Upload } from 'lucide-react';
import Modal from './Modal.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { WEEK_OPTIONS } from '../lib/storage.js';
import { decodeSetup, encodeSetup, isValidScriptUrl } from '../lib/sync.js';
import { formatTime, todayStr } from '../lib/dates.js';
import { btnPrimary, btnSecondary, inputCls, mutedText } from './ui.js';

function Section({ title, hint, children }) {
  return (
    <section className="border-t border-slate-200 pt-4 first:border-0 first:pt-0 dark:border-zinc-700">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className={`mt-0.5 text-xs ${mutedText}`}>{hint}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function SettingsModal({
  settings,
  sync,
  configured,
  theme,
  onTheme,
  onGridsAll,
  onWeeks,
  onConnect,
  onDisconnect,
  onSyncNow,
  onExport,
  onImport,
  onClose,
}) {
  const [url, setUrl] = useState(settings.syncUrl);
  const [token, setToken] = useState(settings.token);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null); // { ok: boolean, text: string }
  const fileRef = useRef(null);

  const say = (ok, text) => setMsg({ ok, text });

  const connect = (e) => {
    e.preventDefault();
    const u = url.trim();
    const k = token.trim();
    if (!isValidScriptUrl(u)) return say(false, 'The URL should look like https://script.google.com/macros/s/…/exec');
    if (!k) return say(false, 'Enter the token you set in Code.gs');
    onConnect({ syncUrl: u, token: k });
    say(true, 'Connecting…');
  };

  const applyCode = () => {
    const s = decodeSetup(code);
    if (!s) return say(false, 'That setup code is not valid');
    setUrl(s.syncUrl);
    setToken(s.token);
    setCode('');
    onConnect(s);
    say(true, 'Setup code applied — syncing…');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodeSetup(settings.syncUrl, settings.token));
      say(true, 'Setup code copied. Paste it on your other device.');
    } catch {
      say(false, 'Could not access the clipboard');
    }
  };

  const download = () => {
    const blob = new Blob([onExport()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `habit-grid-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const r = onImport(await file.text());
      say(true, `Imported ${r.habits} habit(s) and ${r.checkins} completed day(s), merged with your current data.`);
    } catch (err) {
      say(false, err.message || 'Import failed');
    }
  };

  let status = 'Not connected — your data stays on this device only.';
  if (configured) {
    if (sync.status === 'syncing') status = 'Syncing…';
    else if (sync.status === 'error') status = `Error: ${sync.error}`;
    else if (sync.at) status = `Synced at ${formatTime(sync.at)}`;
    else status = 'Connected';
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="space-y-5">
        <Section title="Appearance" hint="System follows your phone or computer's light / dark setting.">
          <ThemeToggle theme={theme} onChange={onTheme} />
        </Section>

        <Section title="Heatmap grid" hint="How many weeks each grid shows, and whether the grids are visible.">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-zinc-700" role="group">
            {WEEK_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={settings.weeks === w}
                onClick={() => onWeeks(w)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  settings.weeks === w
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                {w === 52 ? '1 year' : `${w} weeks`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => onGridsAll(false)}>
              <Eye className="h-4 w-4" />
              Show all grids
            </button>
            <button type="button" className={btnSecondary} onClick={() => onGridsAll(true)}>
              <EyeOff className="h-4 w-4" />
              Hide all grids
            </button>
          </div>
        </Section>

        <Section
          title="Google Sheet sync"
          hint="Keeps your phone and computer in sync. Changes are saved on this device first, then sent in the background."
        >
          <p className={`flex items-center gap-1.5 text-sm ${sync.status === 'error' && configured ? 'text-rose-600 dark:text-rose-400' : mutedText}`}>
            <Cloud className="h-4 w-4 shrink-0" />
            <span className="break-words">{status}</span>
          </p>

          <form onSubmit={connect} className="space-y-2.5">
            <input
              className={inputCls}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Web app URL (https://script.google.com/…/exec)"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Apps Script web app URL"
            />
            <input
              className={inputCls}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token (the TOKEN value in Code.gs)"
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Sync token"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={btnPrimary}>
                {configured ? 'Save & sync' : 'Connect'}
              </button>
              {configured && (
                <>
                  <button type="button" className={btnSecondary} onClick={onSyncNow} disabled={sync.status === 'syncing'}>
                    <RefreshCw className={`h-4 w-4 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
                    Sync now
                  </button>
                  <button type="button" className={btnSecondary} onClick={copyCode}>
                    <Copy className="h-4 w-4" />
                    Copy setup code
                  </button>
                  <button type="button" className={btnSecondary} onClick={onDisconnect}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="flex gap-2">
            <input
              className={inputCls}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Or paste a setup code from another device"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Setup code"
            />
            <button type="button" className={btnSecondary} onClick={applyCode} disabled={!code.trim()}>
              Apply
            </button>
          </div>
        </Section>

        <Section title="Backup" hint="Export a JSON file, or import one. Importing merges with what you have — it never erases existing data.">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={download}>
              <Download className="h-4 w-4" />
              Export Data (JSON)
            </button>
            <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import Data (JSON)
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={pickFile} />
          </div>
        </Section>

        {msg && (
          <p role="status" className={`text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </Modal>
  );
}
