import { useEffect, useRef, useState } from 'react';
import { Channel, invoke, isTauri } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ArrowLeft, X } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

type Output = { type: 'data'; data: number[] } | { type: 'exit' } | { type: 'error'; data: string };

export function TerminalPanel({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Starting shell…');

  useEffect(() => {
    if (!container.current) return;
    if (!isTauri()) { setStatus('The terminal requires the Unfuse desktop app.'); return; }
    let disposed = false;
    let exited = false;
    let id: number | undefined;
    let writes = Promise.resolve();
    const terminal = new Terminal({ fontSize: 12, fontFamily: 'Menlo, Monaco, monospace', cursorBlink: true, scrollback: 5000 });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container.current);
    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      terminal.options.theme = { background: styles.getPropertyValue('--bg-app').trim(), foreground: styles.getPropertyValue('--text-main').trim(), cursor: styles.getPropertyValue('--text-main').trim() };
    };
    applyTheme();
    fit.fit();
    const report = (error: unknown) => { if (!disposed) setStatus(String(error)); };
    const resize = () => {
      if (disposed) return;
      fit.fit();
      if (id !== undefined && !exited) void invoke('terminal_resize', { id, rows: terminal.rows, cols: terminal.cols }).catch(report);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container.current);
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    const input = terminal.onData((data) => {
      if (id === undefined || exited) return;
      const terminalId = id;
      writes = writes.then(() => invoke<void>('terminal_write', { id: terminalId, data })).catch(report);
    });
    const output = new Channel<Output>();
    output.onmessage = (event) => {
      if (disposed) return;
      if (event.type === 'data') terminal.write(new Uint8Array(event.data));
      if (event.type === 'error') report(event.data);
      if (event.type === 'exit') {
        exited = true;
        setStatus('Shell exited');
        if (id !== undefined) void invoke('terminal_close', { id }).catch(report);
      }
    };
    void invoke<number>('terminal_open', { rows: terminal.rows, cols: terminal.cols, output }).then((sessionId) => {
      id = sessionId;
      if (disposed || exited) { void invoke('terminal_close', { id }).catch(report); return; }
      setStatus('');
      resize();
      terminal.focus();
    }).catch(report);
    return () => {
      disposed = true;
      observer.disconnect();
      themeObserver.disconnect();
      input.dispose();
      terminal.dispose();
      if (id !== undefined) void invoke('terminal_close', { id }).catch(() => {});
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <header className="h-10 px-3 flex items-center gap-2 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={onBack} aria-label="Back to workspace" className="p-1.5 rounded hover:bg-[var(--bg-surface-hover)]"><ArrowLeft size={14} /></button>
        <span className="flex-1 text-xs">Terminal</span>
        <button onClick={onClose} aria-label="Close terminal" className="p-1.5 rounded hover:bg-[var(--bg-surface-hover)]"><X size={14} /></button>
      </header>
      {status && <p role="status" className="px-4 pt-3 text-xs" style={{ color: 'var(--text-muted)' }}>{status}</p>}
      <div ref={container} className="flex-1 min-h-0 overflow-hidden m-3 select-text" />
    </div>
  );
}
