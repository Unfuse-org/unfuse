import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, Copy, X } from 'lucide-react';
import { platformHint } from './DesktopMenus';
import type { DesktopPlatform } from './DesktopMenus';

export function WindowControls({ platform = platformHint() }: { platform?: DesktopPlatform }) {
  const native = '__TAURI_INTERNALS__' in window;
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!native || platform !== 'windows') return;
    const appWindow = getCurrentWindow();
    let disposed = false;
    const update = () => appWindow.isMaximized().then(value => { if (!disposed) setMaximized(value); }).catch(console.error);
    void update();
    const listener = appWindow.onResized(() => { void update(); });
    return () => { disposed = true; void listener.then(unlisten => unlisten()).catch(console.error); };
  }, [native, platform]);
  if (platform !== 'windows') return null;
  const control = 'flex h-10 w-11 items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40';
  return <div className="flex shrink-0" aria-label="Window controls">
    <button className={control} disabled={!native} aria-label="Minimize window" title="Minimize" onClick={() => { void getCurrentWindow().minimize().catch(console.error); }}><Minus size={15} /></button>
    <button className={control} disabled={!native} aria-label={maximized ? 'Restore window' : 'Maximize window'} title={maximized ? 'Restore' : 'Maximize'} onClick={() => { void getCurrentWindow().toggleMaximize().catch(console.error); }}>{maximized ? <Copy size={13} /> : <Square size={13} />}</button>
    <button className={`${control} hover:!bg-red-600 hover:!text-white`} disabled={!native} aria-label="Close window" title="Close" onClick={() => { void getCurrentWindow().close().catch(console.error); }}><X size={17} /></button>
  </div>;
}
