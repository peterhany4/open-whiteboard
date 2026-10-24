import React from 'react';
import { useCanvasStore, canvasStore } from '../../store/canvasStore';
import { sceneStore } from '../../store/sceneStore';
import { useTheme } from '../../theme';
import {
  ZoomOutIcon,
  ZoomInIcon,
  FitToScreenIcon,
  SunIcon,
  MoonIcon,
} from '../../assets/icons';

export const ZoomHUD: React.FC = () => {
  const { zoom } = useCanvasStore();
  const { mode, toggleTheme } = useTheme();

  const zoomPercent = Math.round(zoom * 100);

  return (
    <nav
      id="wb-zoom-hud"
      aria-label="Zoom and Theme HUD"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        height: '42px',
        padding: '0 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: 'var(--wb-hud-pill-radius, 20px)',
        backgroundColor: 'var(--wb-acrylic-background)',
        backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        border: 'var(--wb-acrylic-border)',
        boxShadow: 'var(--wb-acrylic-shadow)',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      {/* 1. Zoom Out */}
      <button
        onClick={() => canvasStore.zoomOut()}
        title="Zoom Out (Ctrl+-)"
        aria-label="Zoom Out"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <ZoomOutIcon size={18} />
      </button>

      {/* 2. Zoom Percentage Button */}
      <button
        onClick={() => canvasStore.resetZoom()}
        title="Reset Zoom to 100%"
        aria-label={`Current Zoom: ${zoomPercent}%. Click to reset`}
        style={{
          minWidth: '50px',
          height: '28px',
          padding: '0 6px',
          borderRadius: '14px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span>{zoomPercent}%</span>
      </button>

      {/* 3. Zoom In */}
      <button
        onClick={() => canvasStore.zoomIn()}
        title="Zoom In (Ctrl++)"
        aria-label="Zoom In"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <ZoomInIcon size={18} />
      </button>

      {/* 4. Fit to Screen */}
      <button
        onClick={() => canvasStore.fitToScreen(sceneStore.getCanvasBounds())}
        title="Fit to Screen"
        aria-label="Fit to Screen"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <FitToScreenIcon size={18} />
      </button>

      {/* Vertical Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'var(--colorNeutralStroke1)',
          margin: '0 2px',
        }}
      />

      {/* 5. Instant Light/Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        title={mode === 'Light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        aria-label="Toggle Light and Dark Mode"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          color: mode === 'Light' ? '#616161' : '#FBAE17',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {mode === 'Light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
      </button>
    </nav>
  );
};
