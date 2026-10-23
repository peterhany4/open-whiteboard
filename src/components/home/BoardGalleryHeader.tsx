import React from 'react';
import { useBoardStore, boardStore } from '../../store/boardStore';
import { useTheme } from '../../theme';
import { SearchIcon, DismissIcon, SunIcon, MoonIcon } from '../../assets/icons';
import { WindowControls } from '../electron/WindowControls';

export const BoardGalleryHeader: React.FC = () => {
  const { searchQuery, boards } = useBoardStore();
  const { mode, toggleTheme } = useTheme();

  const handleOpenFile = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const res = await window.electronAPI.openWhiteboard();
      if (res.success && res.content) {
        try {
          const bundle = JSON.parse(res.content);
          const rawName = res.filePath ? res.filePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') : null;
          const title = bundle.title || rawName || 'Imported Whiteboard';
          await boardStore.importBoard(title, bundle.canvasData || bundle);
        } catch (err) {
          console.error('[BoardGallery] Failed to parse .whiteboard file:', err);
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.whiteboard,.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const text = await file.text();
            const bundle = JSON.parse(text);
            const title = file.name.replace(/\.[^/.]+$/, '');
            await boardStore.importBoard(title, bundle.canvasData || bundle);
          } catch (err) {
            console.error('[BoardGallery] Failed to parse .whiteboard file:', err);
          }
        }
      };
      input.click();
    }
  };

  return (
    <header
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget && window.electronAPI) {
          window.electronAPI.maximize();
        }
      }}
      style={{
        height: '60px',
        padding: '0 0 0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--wb-acrylic-background)',
        backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        borderBottom: 'var(--wb-acrylic-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow2, 0 1px 3px rgba(0,0,0,0.06))',
        WebkitAppRegion: 'drag' as any,
      }}
    >
      {/* Left: Signature App Icon & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', WebkitAppRegion: 'no-drag' as any }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #185ABD 0%, #2E6AC5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(24, 90, 189, 0.35)',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="3" width="16" height="14" rx="2" stroke="#FFFFFF" strokeWidth="1.5" />
            <path
              d="M5 12L8 8L12 12L15 9"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--wb-text-primary)',
              letterSpacing: '-0.2px',
              fontFamily: 'var(--wb-font-family, inherit)',
            }}
          >
            Microsoft Whiteboard
          </span>
        </div>
      </div>

      {/* Center: Fluent Search Box */}
      <div
        style={{
          flex: '1',
          maxWidth: '480px',
          margin: '0 24px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag' as any,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '12px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--wb-text-secondary)',
          }}
        >
          <SearchIcon size={16} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => boardStore.setSearchQuery(e.target.value)}
          placeholder="Search whiteboards..."
          style={{
            width: '100%',
            height: '36px',
            paddingLeft: '36px',
            paddingRight: searchQuery ? '36px' : '12px',
            backgroundColor: mode === 'Dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--wb-acrylic-border)',
            borderRadius: '6px',
            color: 'var(--wb-text-primary)',
            fontSize: '13.5px',
            outline: 'none',
            transition: 'all 0.15s ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--wb-color-brand, #0078D4)';
            e.currentTarget.style.backgroundColor =
              mode === 'Dark' ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF';
            e.currentTarget.style.boxShadow = '0 0 0 1px var(--wb-color-brand, #0078D4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--wb-acrylic-border)';
            e.currentTarget.style.backgroundColor =
              mode === 'Dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {searchQuery && (
          <button
            onClick={() => boardStore.setSearchQuery('')}
            title="Clear search"
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              padding: '4px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--wb-text-secondary)',
            }}
          >
            <DismissIcon size={14} />
          </button>
        )}
      </div>

      {/* Right: Open file, Board counter, Theme toggle & Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '10px', WebkitAppRegion: 'no-drag' as any }}>
        {/* Open .whiteboard File Button */}
        <button
          onClick={handleOpenFile}
          title="Open whiteboard file from disk (*.whiteboard, *.json)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--colorNeutralStroke1)',
            backgroundColor: 'var(--colorNeutralBackground1)',
            color: 'var(--colorNeutralForeground1)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)')}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M2 5C2 3.89543 2.89543 3 4 3H8L10 5H16C17.1046 5 18 5.89543 18 7V15C18 16.1046 17.1046 17 16 17H4C2.89543 17 2 16.1046 2 15V5Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Open file</span>
        </button>

        <span
          style={{
            fontSize: '12px',
            color: 'var(--wb-text-secondary)',
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: mode === 'Dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          }}
        >
          {boards.length} {boards.length === 1 ? 'whiteboard' : 'whiteboards'}
        </span>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${mode === 'Light' ? 'Dark' : 'Light'} Mode`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--wb-text-primary)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              mode === 'Dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {mode === 'Light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        {/* Custom Fluent Windows 11 Titlebar Controls */}
        <WindowControls />
      </div>
    </header>
  );
};
