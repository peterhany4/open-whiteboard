import React, { useEffect, useRef } from 'react';
import {
  inkingStore,
  useInkingStore,
  PEN_COLOR_SWATCHES,
  EFFECT_SWATCHES,
  HIGHLIGHTER_COLOR_SWATCHES,
  LASER_COLOR_SWATCHES,
  PEN_THICKNESSES,
  HIGHLIGHTER_THICKNESSES,
  LASER_THICKNESSES,
} from '../../store/inkingStore';
import type {
  PenSlot,
  PenArrowMode,
  ColorSwatch,
} from '../../store/inkingStore';

interface PenPopoverProps {
  tool: 'Pen1' | 'Pen2' | 'Pen3' | 'Pen4' | 'Pen5' | 'PenEffect' | 'Highlighter' | 'Laser';
  onClose: () => void;
}

export const PenPopover: React.FC<PenPopoverProps> = ({ tool, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const state = useInkingStore();

  const isHighlighter = tool === 'Highlighter';
  const isLaser = tool === 'Laser';
  const isPen = !isHighlighter && !isLaser;

  const currentPenState = isPen ? state.pens[tool as PenSlot] : null;
  const currentThickness = isPen
    ? currentPenState?.thickness ?? 2
    : isHighlighter
    ? state.highlighter.thickness
    : state.laser.thickness;

  const currentColor = isPen
    ? currentPenState?.color ?? '#1F1F1F'
    : isHighlighter
    ? state.highlighter.color
    : state.laser.color;

  const currentEffect = isPen ? currentPenState?.effect : undefined;
  const currentArrowMode = isPen ? currentPenState?.arrowMode ?? 'NoArrow' : 'NoArrow';

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Check if click was on the toolbar itself
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

  const thicknesses = isHighlighter
    ? HIGHLIGHTER_THICKNESSES
    : isLaser
    ? LASER_THICKNESSES
    : PEN_THICKNESSES;

  const colorSwatches: ColorSwatch[] = isHighlighter
    ? HIGHLIGHTER_COLOR_SWATCHES
    : isLaser
    ? LASER_COLOR_SWATCHES
    : [...PEN_COLOR_SWATCHES, ...EFFECT_SWATCHES];

  const handleThicknessSelect = (thickness: number) => {
    if (isPen) {
      inkingStore.setPenThickness(tool as PenSlot, thickness);
    } else if (isHighlighter) {
      inkingStore.setHighlighterThickness(thickness);
    } else if (isLaser) {
      inkingStore.setLaserThickness(thickness);
    }
  };

  const handleColorSelect = (swatch: ColorSwatch) => {
    if (isPen) {
      inkingStore.setPenColor(tool as PenSlot, swatch.color, swatch.effect);
    } else if (isHighlighter) {
      inkingStore.setHighlighterColor(swatch.color);
    } else if (isLaser) {
      inkingStore.setLaserColor(swatch.color);
    }
  };

  const handleArrowModeSelect = (mode: PenArrowMode) => {
    if (isPen) {
      inkingStore.setPenArrowMode(tool as PenSlot, mode);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="wb-pen-popover"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 14px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: isLaser ? '240px' : '286px',
        padding: '14px',
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
        gap: '12px',
        animation: 'wbPopoverFadeIn 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
      }}
      role="dialog"
      aria-label={`${tool} Settings`}
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

      {/* 1. Thickness Presets Row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--colorNeutralForeground3)',
          }}
        >
          Thickness
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            backgroundColor: 'var(--colorNeutralBackground2)',
            borderRadius: '6px',
          }}
        >
          {thicknesses.map((th) => {
            const isSelected = currentThickness === th;
            // Map thickness to visual dot radius (from 4px to 16px)
            const minTh = thicknesses[0];
            const maxTh = thicknesses[thicknesses.length - 1];
            const visualDotSize = 4 + ((th - minTh) / (maxTh - minTh)) * 12;

            return (
              <button
                key={th}
                onClick={() => handleThicknessSelect(th)}
                title={`${th}px`}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: isSelected
                    ? '2px solid var(--themePrimary)'
                    : '2px solid transparent',
                  backgroundColor: isSelected
                    ? 'var(--colorNeutralBackground1Hover)'
                    : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                <div
                  style={{
                    width: `${visualDotSize}px`,
                    height: `${visualDotSize}px`,
                    borderRadius: '50%',
                    backgroundColor: isSelected
                      ? 'var(--themePrimary)'
                      : 'var(--colorNeutralForeground1)',
                    transition: 'all 0.15s ease',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--colorNeutralStroke1)',
          margin: '0 -2px',
        }}
      />

      {/* 2. Color Palette Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--colorNeutralForeground3)',
          }}
        >
          Color
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isLaser ? 'repeat(6, 1fr)' : 'repeat(6, 1fr)',
            gap: '8px',
            justifyItems: 'center',
          }}
        >
          {colorSwatches.map((swatch) => {
            const isSelected =
              swatch.effect
                ? currentEffect === swatch.effect
                : currentColor.toUpperCase() === swatch.color.toUpperCase() && !currentEffect;

            const isRainbow = swatch.effect === 'rainbow';
            const isGalaxy = swatch.effect === 'galaxy';

            return (
              <button
                key={swatch.name}
                onClick={() => handleColorSelect(swatch)}
                title={swatch.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                  background: isRainbow
                    ? 'linear-gradient(135deg, #FF4E00 0%, #FED430 25%, #02A556 50%, #0069BF 75%, #914BB8 100%)'
                    : isGalaxy
                    ? 'radial-gradient(circle at 35% 35%, #FF77DD 0%, #AE198D 40%, #5B318D 75%, #180530 100%)'
                    : swatch.color,
                  boxShadow: isSelected
                    ? '0 0 0 2px var(--colorNeutralBackground1), 0 0 0 4px var(--themePrimary)'
                    : 'inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                }}
              >
                {/* Galaxy sparkles decoration */}
                {isGalaxy && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="#FFFFFF"
                    style={{
                      position: 'absolute',
                      top: '7px',
                      left: '7px',
                      opacity: 0.9,
                      filter: 'drop-shadow(0 0 2px #FFFFFF)',
                    }}
                  >
                    <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5L8 0Z" />
                  </svg>
                )}
                {/* Selected inner white/dark dot indicator */}
                {isSelected && !isGalaxy && (
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      margin: '0 auto',
                      backgroundColor:
                        swatch.color === '#1F1F1F' || isRainbow ? '#FFFFFF' : '#1F1F1F',
                      opacity: 0.85,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Arrowhead Toggle Row (Only for regular Pens) */}
      {isPen && (
        <>
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--colorNeutralStroke1)',
              margin: '0 -2px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--colorNeutralForeground3)',
              }}
            >
              Arrow Mode
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
                backgroundColor: 'var(--colorNeutralBackground2)',
                padding: '3px',
                borderRadius: '6px',
              }}
            >
              {/* None */}
              <button
                onClick={() => handleArrowModeSelect('NoArrow')}
                title="No Arrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    currentArrowMode === 'NoArrow'
                      ? 'var(--colorNeutralBackground1)'
                      : 'transparent',
                  color:
                    currentArrowMode === 'NoArrow'
                      ? 'var(--themePrimary)'
                      : 'var(--colorNeutralForeground2)',
                  fontWeight: currentArrowMode === 'NoArrow' ? 600 : 400,
                  fontSize: '12px',
                  boxShadow:
                    currentArrowMode === 'NoArrow' ? 'var(--shadow2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '2px',
                    backgroundColor: 'currentColor',
                    borderRadius: '1px',
                  }}
                />
              </button>

              {/* Single Arrow */}
              <button
                onClick={() => handleArrowModeSelect('InkSingleArrow')}
                title="Single Arrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    currentArrowMode === 'InkSingleArrow'
                      ? 'var(--colorNeutralBackground1)'
                      : 'transparent',
                  color:
                    currentArrowMode === 'InkSingleArrow'
                      ? 'var(--themePrimary)'
                      : 'var(--colorNeutralForeground2)',
                  fontWeight: currentArrowMode === 'InkSingleArrow' ? 600 : 400,
                  fontSize: '12px',
                  boxShadow:
                    currentArrowMode === 'InkSingleArrow' ? 'var(--shadow2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                  <path
                    d="M1 6H17M17 6L12 1.5M17 6L12 10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Double Arrow */}
              <button
                onClick={() => handleArrowModeSelect('InkDoubleArrow')}
                title="Double Arrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor:
                    currentArrowMode === 'InkDoubleArrow'
                      ? 'var(--colorNeutralBackground1)'
                      : 'transparent',
                  color:
                    currentArrowMode === 'InkDoubleArrow'
                      ? 'var(--themePrimary)'
                      : 'var(--colorNeutralForeground2)',
                  fontWeight: currentArrowMode === 'InkDoubleArrow' ? 600 : 400,
                  fontSize: '12px',
                  boxShadow:
                    currentArrowMode === 'InkDoubleArrow' ? 'var(--shadow2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
                  <path
                    d="M5 1.5L1.5 6L5 10.5M1.5 6H20.5M17 1.5L20.5 6L17 10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
