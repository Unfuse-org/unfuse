import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Submenu } from '@tauri-apps/api/menu';
import type { MenuItemOptions, PredefinedMenuItemOptions, SubmenuOptions } from '@tauri-apps/api/menu';
import { LogicalPosition } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';

export type DesktopPlatform = 'windows' | 'macos' | 'linux';
export function platformHint(): DesktopPlatform {
  if (typeof navigator === 'undefined') return 'windows';
  return /mac/i.test(navigator.platform) ? 'macos' : /linux/i.test(navigator.platform) ? 'linux' : 'windows';
}
export type AppMenuAction = 'new-chat' | 'settings' | 'sidebar' | 'rack' | 'focus' | 'setup';

export function appMenuOptions(platform: DesktopPlatform, enabled: boolean, action: (id: AppMenuAction) => void): SubmenuOptions[] {
  const command = (id: AppMenuAction, text: string, accelerator?: string): MenuItemOptions => ({ id, text, enabled, accelerator, action: () => action(id) });
  const editing: Array<PredefinedMenuItemOptions | MenuItemOptions> = ['Undo', 'Redo', 'Separator', 'Cut', 'Copy', 'Paste', 'SelectAll'].map(item =>
    platform === 'linux' && (item === 'Undo' || item === 'Redo')
      ? { text: item, action: () => { document.execCommand(item.toLowerCase()); } }
      : { item: item as PredefinedMenuItemOptions['item'] });
  const groups: SubmenuOptions[] = [
    { text: 'File', items: [command('new-chat', 'New Conversation', 'CmdOrCtrl+N'), ...(platform === 'macos' ? [] : [command('settings', 'Settings', 'CmdOrCtrl+,')])] },
    { text: 'Edit', items: editing },
    { text: 'View', items: [command('sidebar', 'Toggle Sidebar', 'CmdOrCtrl+B'), command('rack', 'Toggle Model Rack', 'CmdOrCtrl+Shift+M'), command('focus', 'Toggle Focus Mode', 'CmdOrCtrl+Shift+F'), { item: 'Separator' }, ...(platform === 'macos' ? [{ item: 'Fullscreen' } as PredefinedMenuItemOptions] : [{ text: 'Toggle Fullscreen', accelerator: 'F11', action: () => { const window = getCurrentWindow(); void window.isFullscreen().then(value => window.setFullscreen(!value)).catch(console.error); } }])] },
    { text: 'Help', items: [command('setup', 'Open Setup')] },
  ];
  if (platform === 'macos') {
    groups.unshift({ text: 'Unfuse', items: [{ item: { About: { name: 'Unfuse' } } }, { item: 'Separator' }, command('settings', 'Settings…', 'CmdOrCtrl+,'), { item: 'Separator' }, { item: 'Services' }, { item: 'Separator' }, { item: 'Hide' }, { item: 'HideOthers' }, { item: 'ShowAll' }, { item: 'Separator' }, { item: 'Quit' }] });
    groups.splice(groups.length - 1, 0, { text: 'Window', items: [{ item: 'Minimize' }, { item: 'Maximize' }, { item: 'CloseWindow' }, { item: 'Separator' }, { item: 'BringAllToFront' }] });
  }
  return groups;
}

// Called once by App, so the native application menu also stays available during setup.
export function useDesktopMenuBar(platform: DesktopPlatform, enabled: boolean, onAction: (id: AppMenuAction) => void) {
  const native = '__TAURI_INTERNALS__' in window;
  const actionRef = useRef(onAction);
  const editorRef = useRef<HTMLElement | null>(null);
  actionRef.current = onAction;
  const queue = useRef(Promise.resolve());
  const [menus, setMenus] = useState<Record<string, Submenu>>({});
  const [failure, setFailure] = useState('');
  const options = useMemo(() => appMenuOptions(platform, enabled, id => actionRef.current(id)), [platform, enabled]);

  useEffect(() => {
    const rememberEditor = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches('input, textarea') || target.isContentEditable)) editorRef.current = target;
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[aria-label="Application menu"]')) return;
      document.querySelectorAll('[aria-label="Application menu"] details[open]').forEach(item => item.removeAttribute('open'));
    };
    document.addEventListener('focusin', rememberEditor);
    document.addEventListener('pointerdown', closeOutside);
    return () => { document.removeEventListener('focusin', rememberEditor); document.removeEventListener('pointerdown', closeOutside); };
  }, []);

  useEffect(() => {
    if (!native) return;
    let disposed = false;
    const owned: Submenu[] = [];
    let appMenu: Menu | undefined;
    let previous: Menu | null = null;
    setMenus({});
    setFailure('');
    queue.current = queue.current.then(async () => {
      if (disposed) return;
      for (const option of options) owned.push(await Submenu.new(option));
      if (disposed) return;
      if (platform === 'macos') {
        appMenu = await Menu.new({ items: owned });
        previous = await appMenu.setAsAppMenu();
        await owned[owned.length - 2].setAsWindowsMenuForNSApp();
        await owned[owned.length - 1].setAsHelpMenuForNSApp();
      }
      if (!disposed) setMenus(Object.fromEntries(options.map((option, index) => [option.text, owned[index]])));
    }).catch(error => { if (!disposed) setFailure(String(error)); console.error('Application menu setup failed:', error); });
    return () => {
      disposed = true;
      queue.current = queue.current.then(async () => {
        if (previous) await previous.setAsAppMenu();
        if (appMenu) await appMenu.close();
        await Promise.all(owned.map(menu => menu.close()));
      }).catch(console.error);
    };
  }, [native, options, platform]);

  useEffect(() => {
    if (native && platform === 'macos') return;
    const shortcuts: Record<string, AppMenuAction> = { n: 'new-chat', ',': 'settings', b: 'sidebar', 'shift+m': 'rack', 'shift+f': 'focus' };
    const handleKey = (event: KeyboardEvent) => {
      if (native && event.key === 'F11') {
        event.preventDefault();
        const window = getCurrentWindow();
        void window.isFullscreen().then(value => window.setFullscreen(!value)).catch(console.error);
        return;
      }
      if (!enabled) return;
      if (event.altKey && !event.ctrlKey && !event.metaKey && ['f', 'e', 'v', 'h'].includes(event.key.toLowerCase())) {
        const item = document.querySelector<HTMLElement>(`[aria-label="Application menu"] [data-menu="${event.key.toLowerCase()}"]`);
        if (item) { event.preventDefault(); item.click(); }
        return;
      }
      const modifier = platform === 'macos' ? event.metaKey : event.ctrlKey;
      if (!modifier || event.altKey) return;
      const action = shortcuts[(event.shiftKey ? 'shift+' : '') + event.key.toLowerCase()];
      if (action) { event.preventDefault(); actionRef.current(action); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [enabled, native, platform]);

  if (platform === 'macos') return failure ? <span role="alert" className="text-xs">Menu unavailable</span> : null;
  return <nav aria-label="Application menu" className="flex h-full items-center gap-0.5 text-sm text-[var(--text-muted)]" onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open')); }}>
    {options.map(group => native ? <button key={group.text} data-menu={group.text[0].toLowerCase()} disabled={!menus[group.text]} title={failure || group.text} className="rounded px-2 py-1 hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]" aria-haspopup="menu" onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); event.currentTarget.click(); } }} onMouseDown={event => event.preventDefault()} onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (group.text === 'Edit' && editorRef.current?.isConnected) editorRef.current.focus({ preventScroll: true });
      void menus[group.text].popup(new LogicalPosition(rect.left, rect.bottom)).catch(error => { setFailure(String(error)); console.error(error); });
    }}>{group.text}</button> : <details key={group.text} className="relative" onToggle={event => { if (event.currentTarget.open) event.currentTarget.parentElement?.querySelectorAll('details').forEach(item => { if (item !== event.currentTarget) item.open = false; }); }}>
      <summary data-menu={group.text[0].toLowerCase()} className="cursor-pointer list-none rounded px-2 py-1 hover:bg-[var(--bg-surface-hover)] [&::-webkit-details-marker]:hidden">{group.text}</summary>
      <div className="absolute left-0 top-full z-50 mt-1 min-w-52 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-1 text-[var(--text-main)] shadow-xl">{group.items?.map((item, index) => {
        if ('item' in item && item.item === 'Separator') return <hr key={index} className="my-1 border-[var(--border-subtle)]" />;
        const custom = 'action' in item;
        return <button key={index} disabled={!custom || !enabled || group.text === 'Edit' || (typeof item.text === 'string' && item.text === 'Toggle Fullscreen')} className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-[var(--bg-surface-hover)] disabled:opacity-40" onClick={event => { if ('action' in item) item.action?.(item.id ?? ''); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{'text' in item && typeof item.text === 'string' ? item.text : 'item' in item ? (typeof item.item === 'string' ? item.item.replace('SelectAll', 'Select All') : 'About Unfuse') : ''}</button>;
      })}</div>
    </details>)}
    {failure && <span role="alert" className="px-2 text-xs">Menu unavailable</span>}
  </nav>;
}
