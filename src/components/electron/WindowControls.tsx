import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme';

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  const { mode } = useTheme();

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    window.electronAPI.isMaximized().then(setIsMaximized);
    const unsubscribe = window.electronAPI.onMaximizeChange(setIsMaximized);
    return () => {
      unsubscribe?.();
    };
  }, [isElectron]);

  if (!isElectron) {
    return null;
  }

  const isDark = mode === 'Dark';
  const buttonHoverBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const iconColor = isDark ? '#FFFFFF' : '#1F1F1F';

  return (
    <div
      id="wb-window-controls"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
        alignSelf: 'stretch',
        marginLeft: 'auto',
        WebkitAppRegion: 'no-drag' as any,
      }}
    >
      {/* Minimize Button */}
      <button
        id="wb-win-minimize"
        onClick={() => window.electronAPI?.minimize()}
        title="Minimize"
        aria-label="Minimize Window"
        style={{
          width: '46px',
          height: '100%',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          backgroundColor: 'transparent',
          color: iconColor,
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          WebkitAppRegion: 'no-drag' as any,
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = buttonHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>

      {/* Maximize / Restore Button */}
      <button
        id="wb-win-maximize"
        onClick={() => window.electronAPI?.maximize()}
        title={isMaximized ? 'Restore' : 'Maximize'}
        aria-label={isMaximized ? 'Restore Window' : 'Maximize Window'}
        style={{
          width: '46px',
          height: '100%',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          backgroundColor: 'transparent',
          color: iconColor,
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          WebkitAppRegion: 'no-drag' as any,
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = buttonHoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {isMaximized ? (
          // Windows 11 Restore ❐
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
            <path d="M2.5 1.5H8.5V7.5" strokeWidth="1" />
            <rect x="1.5" y="2.5" width="6" height="6" strokeWidth="1" />
          </svg>
        ) : (
          // Windows 11 Maximize □
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
            <rect x="1" y="1" width="8" height="8" strokeWidth="1" />
          </svg>
        )}
      </button>

      {/* Close Button - Turns Red on hover */}
      <button
        id="wb-win-close"
        onClick={() => window.electronAPI?.close()}
        title="Close"
        aria-label="Close Window"
        style={{
          width: '48px',
          height: '100%',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          backgroundColor: 'transparent',
          color: iconColor,
          cursor: 'pointer',
          padding: 0,
          outline: 'none',
          WebkitAppRegion: 'no-drag' as any,
          transition: 'background-color 0.12s ease, color 0.12s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E81123';
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = iconColor;
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
          <path d="M1 1L9 9M9 1L1 9" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
