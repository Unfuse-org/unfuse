import React, { useState, useEffect, useRef } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import {
  ThemeId,
  THEMES,
  applyTheme,
  getStoredTheme,
} from '../../theme/themes';

export const ThemeSelector: React.FC = () => {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(getStoredTheme);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial theme application
    applyTheme(activeThemeId);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeId>;
      if (customEvent.detail) {
        setActiveThemeId(customEvent.detail);
      }
    };

    window.addEventListener('unfuse_theme_changed', handleThemeChange);
    return () => window.removeEventListener('unfuse_theme_changed', handleThemeChange);
  }, [activeThemeId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (id: ThemeId) => {
    setActiveThemeId(id);
    applyTheme(id);
    setIsOpen(false);
  };

  const activeTheme = THEMES[activeThemeId] || THEMES['unfuse'];
  const themeList = Object.values(THEMES);
  const darkThemes = themeList.filter((t) => t.category === 'dark');
  const lightThemes = themeList.filter((t) => t.category === 'light');

  return (
    <div className="relative inline-block select-none" ref={containerRef}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-[28px] px-2.5 flex items-center gap-2 border transition-all text-xs font-medium cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
        title="Change application theme"
      >
        <Palette className="w-3.5 h-3.5 opacity-80" />
        {/* Active theme color dots preview */}
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full border border-black/20"
            style={{ backgroundColor: activeTheme.swatches[0] }}
          />
          <span
            className="w-2 h-2 rounded-full border border-black/20"
            style={{ backgroundColor: activeTheme.swatches[2] }}
          />
        </div>
        <span className="font-medium text-[11px] max-w-[110px] truncate">
          {activeTheme.name}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-64 border shadow-2xl z-50 p-1.5 flex flex-col gap-1 max-h-[460px] overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          {/* DARK THEMES */}
          <div className="px-2 pt-1 pb-1">
            <span
              className="text-[10px] uppercase font-mono tracking-wider font-semibold opacity-60"
              style={{ color: 'var(--text-muted)' }}
            >
              Dark Themes ({darkThemes.length})
            </span>
          </div>
          {darkThemes.map((theme) => {
            const isSelected = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className="w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                  color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Swatches preview */}
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30"
                      style={{ backgroundColor: theme.swatches[0] }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30"
                      style={{ backgroundColor: theme.swatches[2] }}
                    />
                  </div>
                  <span className="truncate font-medium text-[12px] group-hover:text-white">
                    {theme.name}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                )}
              </button>
            );
          })}

          {/* LIGHT THEMES */}
          <div className="px-2 pt-2.5 pb-1 border-t mt-1" style={{ borderColor: 'var(--border-subtle)' }}>
            <span
              className="text-[10px] uppercase font-mono tracking-wider font-semibold opacity-60"
              style={{ color: 'var(--text-muted)' }}
            >
              Light Themes ({lightThemes.length})
            </span>
          </div>
          {lightThemes.map((theme) => {
            const isSelected = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className="w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                  color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Swatches preview */}
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30"
                      style={{ backgroundColor: theme.swatches[0] }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30"
                      style={{ backgroundColor: theme.swatches[2] }}
                    />
                  </div>
                  <span className="truncate font-medium text-[12px]">
                    {theme.name}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
