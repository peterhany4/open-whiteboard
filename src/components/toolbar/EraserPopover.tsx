import React, { useEffect, useRef, useState } from 'react';
import { inkingStore, useInkingStore } from '../../store/inkingStore';
import type { EraserMode } from '../../store/inkingStore';
import { DeleteIcon, CheckmarkIcon } from '../../assets/icons';

interface EraserPopoverProps {
  onClose: () => void;
}

export const EraserPopover: React.FC<EraserPopoverProps> = ({ onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { eraser } = useInkingStore();
  const [clearedToast, setClearedToast] = useState(false);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const toolbarEl = document.getElementById('whiteboard-ink-toolbar');
        if (toolbarEl && toolbarEl.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSelectMode = (mode: EraserMode) => {
    inkingStore.setEraserMode(mode);
  };

  const handleClearCanvas = () => {
    setClearedToast(true);
    inkingStore.clearCanvas();
    setTimeout(() => {
      setClearedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div
      ref={popoverRef}
      className="wb-eraser-popover"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 14px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '210px',
        padding: '10px',
        borderRadius: 'var(--wb-card-border-radius, 8px)',
        backgroundColor: 'var(--wb-acrylic-background)',
        backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        border: 'var(--wb-acrylic-border)',
        boxShadow: 'var(--shadow16, 0 8px 16px rgba(0,0,0,0.14))',
        color: 'var(--colorNeutralForeground1)',
        zIndex: 1050,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        animation: 'wbPopoverFadeIn 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
      }}
      role="dialog"
      aria-label="Eraser Options"
    >
      {/* Downward pointer notch */}
      <div
        style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          backgroundColor: 'var(--colorNeutralBackground1)',
          borderRight: 'var(--wb-acrylic-border)',
          borderBottom: 'var(--wb-acrylic-border)',
          pointerEvents: 'none',
        }}
      />

      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--colorNeutralForeground3)',
          padding: '2px 4px',
        }}
      >
        Eraser Mode
      </span>

      {/* 1. Point Eraser Option */}
      <button
        onClick={() => handleSelectMode('PointEraser')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor:
            eraser.mode === 'PointEraser'
              ? 'var(--colorNeutralBackground1Hover)'
              : 'transparent',
          color: 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '13px',
          fontWeight: eraser.mode === 'PointEraser' ? 600 : 400,
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          if (eraser.mode !== 'PointEraser') {
            e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground2)';
          }
        }}
        onMouseLeave={(e) => {
          if (eraser.mode !== 'PointEraser') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span>Partial / Point erase</span>
        {eraser.mode === 'PointEraser' && (
          <CheckmarkIcon size={16} color="var(--themePrimary)" />
        )}
      </button>

      {/* 2. Stroke Eraser Option */}
      <button
        onClick={() => handleSelectMode('StrokeEraser')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor:
            eraser.mode === 'StrokeEraser'
              ? 'var(--colorNeutralBackground1Hover)'
              : 'transparent',
          color: 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '13px',
          fontWeight: eraser.mode === 'StrokeEraser' ? 600 : 400,
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          if (eraser.mode !== 'StrokeEraser') {
            e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground2)';
          }
        }}
        onMouseLeave={(e) => {
          if (eraser.mode !== 'StrokeEraser') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span>Erase entire stroke</span>
        {eraser.mode === 'StrokeEraser' && (
          <CheckmarkIcon size={16} color="var(--themePrimary)" />
        )}
      </button>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--colorNeutralStroke1)',
          margin: '4px 0',
        }}
      />

      {/* 3. Clear Board / Canvas Button */}
      <button
        onClick={handleClearCanvas}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: clearedToast ? 'rgba(231, 18, 36, 0.15)' : 'transparent',
          color: clearedToast ? '#E71224' : 'var(--colorNeutralForeground1)',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(231, 18, 36, 0.12)';
          e.currentTarget.style.color = '#E71224';
        }}
        onMouseLeave={(e) => {
          if (!clearedToast) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--colorNeutralForeground1)';
          }
        }}
      >
        <DeleteIcon size={16} color="currentColor" />
        <span>{clearedToast ? 'Canvas Cleared!' : 'Clear canvas'}</span>
      </button>
    </div>
  );
};
