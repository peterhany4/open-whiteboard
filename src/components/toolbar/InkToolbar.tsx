import React, { useRef } from 'react';
import {
  inkingStore,
  useInkingStore,
} from '../../store/inkingStore';
import type {
  PenSlot,
  InkingTool,
} from '../../store/inkingStore';
import {
  CursorIcon,
  HandIcon,
  PenIcon,
  HighlighterIcon,
  LaserIcon,
  EraserIcon,
  RulerIcon,
  LassoIcon,
  ChevronDownIcon,
} from '../../assets/icons';
import { PenPopover } from './PenPopover';
import { EraserPopover } from './EraserPopover';
import { rulerEngine } from '../../tools/RulerEngine';

export const InkToolbar: React.FC = () => {
  const state = useInkingStore();
  const {
    selectedTool,
    pens,
    highlighter,
    laser,
    eraser,
    isRulerActive,
    activePopover,
  } = state;

  const toolbarRef = useRef<HTMLDivElement>(null);



  const handleToolClick = (tool: InkingTool) => {
    if (tool === 'Ruler') {
      rulerEngine.toggle();
      return;
    }

    if (selectedTool === tool) {
      // Second click on the active tool toggles its popover
      if (
        tool.startsWith('Pen') ||
        tool === 'Highlighter' ||
        tool === 'Laser' ||
        tool === 'Eraser'
      ) {
        inkingStore.togglePopover(tool);
      }
    } else {
      // Select new tool & close existing popover
      inkingStore.selectTool(tool);
      inkingStore.closePopover();
    }
  };

  const penSlots: { slot: PenSlot; label: string }[] = [
    { slot: 'Pen1', label: 'Black Pen (1)' },
    { slot: 'Pen2', label: 'Red Pen (2)' },
    { slot: 'Pen3', label: 'Green Pen (3)' },
    { slot: 'Pen4', label: 'Blue Pen (4)' },
    { slot: 'PenEffect', label: 'Galaxy / Special Pen (5)' },
  ];

  return (
    <>
      {/* SVG Pattern Definitions for Rainbow and Galaxy Inks (Module 133066) */}
      <svg id="wb-effect-resources" style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="effect-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4E00" />
            <stop offset="25%" stopColor="#FED430" />
            <stop offset="50%" stopColor="#02A556" />
            <stop offset="75%" stopColor="#0069BF" />
            <stop offset="100%" stopColor="#914BB8" />
          </linearGradient>
          <radialGradient id="effect-galaxy" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FF77DD" />
            <stop offset="40%" stopColor="#AE198D" />
            <stop offset="75%" stopColor="#5B318D" />
            <stop offset="100%" stopColor="#180530" />
          </radialGradient>
        </defs>
      </svg>

      {/* Floating Ink Ribbon Bar */}
      <nav
        id="whiteboard-ink-toolbar"
        ref={toolbarRef}
        aria-label="Inking Ribbon"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          height: 'var(--wb-ribbon-height, 52px)',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: 'var(--wb-ribbon-border-radius, 12px)',
          backgroundColor: 'var(--wb-acrylic-background)',
          backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
          WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
          border: 'var(--wb-acrylic-border)',
          boxShadow: 'var(--wb-acrylic-shadow)',
          zIndex: 1000,
          userSelect: 'none',
        }}
      >
        {/* 0. Navigation Tools: Select (Cursor) & Pan (Hand) */}
        <button
          id="wb-tool-select"
          onClick={() => inkingStore.selectTool('Select')}
          title="Select (V / S)"
          aria-label="Select Tool"
          aria-pressed={selectedTool === 'Select'}
          style={{
            position: 'relative',
            width: '42px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
            border: 'none',
            backgroundColor:
              selectedTool === 'Select'
                ? 'var(--colorNeutralBackground1Hover)'
                : 'transparent',
            color: selectedTool === 'Select' ? 'var(--wb-color-brand, #0078D4)' : 'var(--colorNeutralForeground1)',
            cursor: 'pointer',
            padding: 0,
            transform: selectedTool === 'Select' ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
            boxShadow:
              selectedTool === 'Select'
                ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                : 'none',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (selectedTool !== 'Select') {
              e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedTool !== 'Select') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <CursorIcon size={22} filled={selectedTool === 'Select'} />
        </button>

        <button
          id="wb-tool-hand"
          onClick={() => inkingStore.selectTool('Hand')}
          title="Pan Canvas (H)"
          aria-label="Pan Tool"
          aria-pressed={selectedTool === 'Hand'}
          style={{
            position: 'relative',
            width: '42px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
            border: 'none',
            backgroundColor:
              selectedTool === 'Hand'
                ? 'var(--colorNeutralBackground1Hover)'
                : 'transparent',
            color: selectedTool === 'Hand' ? 'var(--wb-color-brand, #0078D4)' : 'var(--colorNeutralForeground1)',
            cursor: 'pointer',
            padding: 0,
            transform: selectedTool === 'Hand' ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
            boxShadow:
              selectedTool === 'Hand'
                ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                : 'none',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (selectedTool !== 'Hand') {
              e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedTool !== 'Hand') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <HandIcon size={22} filled={selectedTool === 'Hand'} />
        </button>

        {/* Divider between navigation and inking pens */}
        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor: 'var(--colorNeutralStroke1)',
            margin: '0 4px',
          }}
        />

        {/* 1. Ballpoint Pens 1..5 */}
        {penSlots.map(({ slot, label }) => {
          const pen = pens[slot];
          const isSelected = selectedTool === slot;
          const isPopoverOpen = activePopover === slot;

          const inkDisplayColor =
            pen.effect === 'rainbow'
              ? 'url(#effect-rainbow)'
              : pen.effect === 'galaxy'
              ? 'url(#effect-galaxy)'
              : pen.color;

          return (
            <div key={slot} style={{ position: 'relative' }}>
              <button
                id={`wb-tool-${slot.toLowerCase()}`}
                onClick={() => handleToolClick(slot)}
                title={label}
                aria-pressed={isSelected}
                aria-haspopup="dialog"
                aria-expanded={isPopoverOpen}
                style={{
                  position: 'relative',
                  width: '42px',
                  height: '44px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
                  border: 'none',
                  backgroundColor: isSelected
                    ? 'var(--colorNeutralBackground1Hover)'
                    : 'transparent',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  padding: 0,
                  transform: isSelected ? 'translateY(-8px)' : 'translateY(0)',
                  transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
                  boxShadow: isSelected
                    ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                    : 'none',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <PenIcon size={24} inkColor={inkDisplayColor} />

                {/* Sub-indicator chevron when selected */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 0,
                    }}
                  >
                    <ChevronDownIcon size={10} color="var(--colorNeutralForeground3)" />
                  </div>
                )}
              </button>

              {/* Tool Popover Anchor */}
              {isPopoverOpen && (
                <PenPopover
                  tool={slot}
                  onClose={() => inkingStore.closePopover()}
                />
              )}
            </div>
          );
        })}

        {/* 2. Highlighter */}
        <div style={{ position: 'relative' }}>
          <button
            id="wb-tool-highlighter"
            onClick={() => handleToolClick('Highlighter')}
            title="Highlighter (I)"
            aria-pressed={selectedTool === 'Highlighter'}
            aria-haspopup="dialog"
            aria-expanded={activePopover === 'Highlighter'}
            style={{
              position: 'relative',
              width: '42px',
              height: '44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
              border: 'none',
              backgroundColor:
                selectedTool === 'Highlighter'
                  ? 'var(--colorNeutralBackground1Hover)'
                  : 'transparent',
              color: 'var(--colorNeutralForeground1)',
              cursor: 'pointer',
              padding: 0,
              transform: selectedTool === 'Highlighter' ? 'translateY(-8px)' : 'translateY(0)',
              transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
              boxShadow:
                selectedTool === 'Highlighter'
                  ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                  : 'none',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedTool !== 'Highlighter') {
                e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTool !== 'Highlighter') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <HighlighterIcon size={24} highlighterColor={highlighter.color} />
            {selectedTool === 'Highlighter' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                }}
              >
                <ChevronDownIcon size={10} color="var(--colorNeutralForeground3)" />
              </div>
            )}
          </button>

          {activePopover === 'Highlighter' && (
            <PenPopover
              tool="Highlighter"
              onClose={() => inkingStore.closePopover()}
            />
          )}
        </div>

        {/* 3. Laser Pointer */}
        <div style={{ position: 'relative' }}>
          <button
            id="wb-tool-laser"
            onClick={() => handleToolClick('Laser')}
            title="Laser Pointer (L)"
            aria-pressed={selectedTool === 'Laser'}
            aria-haspopup="dialog"
            aria-expanded={activePopover === 'Laser'}
            style={{
              position: 'relative',
              width: '42px',
              height: '44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
              border: 'none',
              backgroundColor:
                selectedTool === 'Laser'
                  ? 'var(--colorNeutralBackground1Hover)'
                  : 'transparent',
              color: 'var(--colorNeutralForeground1)',
              cursor: 'pointer',
              padding: 0,
              transform: selectedTool === 'Laser' ? 'translateY(-8px)' : 'translateY(0)',
              transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
              boxShadow:
                selectedTool === 'Laser'
                  ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                  : 'none',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedTool !== 'Laser') {
                e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTool !== 'Laser') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <LaserIcon size={24} laserColor={laser.color} />
            {selectedTool === 'Laser' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                }}
              >
                <ChevronDownIcon size={10} color="var(--colorNeutralForeground3)" />
              </div>
            )}
          </button>

          {activePopover === 'Laser' && (
            <PenPopover
              tool="Laser"
              onClose={() => inkingStore.closePopover()}
            />
          )}
        </div>

        {/* Vertical Divider */}
        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor: 'var(--colorNeutralStroke1)',
            margin: '0 4px',
          }}
        />

        {/* 4. Eraser */}
        <div style={{ position: 'relative' }}>
          <button
            id="wb-tool-eraser"
            onClick={() => handleToolClick('Eraser')}
            title={`Eraser (E) — ${eraser.mode === 'PointEraser' ? 'Partial Erase' : 'Stroke Erase'}`}
            aria-pressed={selectedTool === 'Eraser'}
            aria-haspopup="dialog"
            aria-expanded={activePopover === 'Eraser'}
            style={{
              position: 'relative',
              width: '42px',
              height: '44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
              border: 'none',
              backgroundColor:
                selectedTool === 'Eraser'
                  ? 'var(--colorNeutralBackground1Hover)'
                  : 'transparent',
              color: 'var(--colorNeutralForeground1)',
              cursor: 'pointer',
              padding: 0,
              transform: selectedTool === 'Eraser' ? 'translateY(-8px)' : 'translateY(0)',
              transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
              boxShadow:
                selectedTool === 'Eraser'
                  ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                  : 'none',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedTool !== 'Eraser') {
                e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTool !== 'Eraser') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <EraserIcon size={24} />
            {selectedTool === 'Eraser' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 0,
                }}
              >
                <ChevronDownIcon size={10} color="var(--colorNeutralForeground3)" />
              </div>
            )}
          </button>

          {activePopover === 'Eraser' && (
            <EraserPopover onClose={() => inkingStore.closePopover()} />
          )}
        </div>

        {/* 5. Ruler (Protractor toggle widget) */}
        <button
          id="wb-tool-ruler"
          onClick={() => handleToolClick('Ruler')}
          title="Ruler Overlay (R or Ctrl+R)"
          aria-pressed={isRulerActive}
          style={{
            position: 'relative',
            width: '42px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
            border: 'none',
            backgroundColor: isRulerActive
              ? 'rgba(24, 90, 189, 0.16)'
              : 'transparent',
            color: isRulerActive
              ? 'var(--themePrimary)'
              : 'var(--colorNeutralForeground1)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.12s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isRulerActive) {
              e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRulerActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <RulerIcon size={24} />
        </button>

        {/* 6. Lasso Select */}
        <button
          id="wb-tool-lasso"
          onClick={() => handleToolClick('FreeformLasso')}
          title="Lasso Select (L / Q)"
          aria-pressed={selectedTool === 'FreeformLasso'}
          style={{
            position: 'relative',
            width: '42px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--wb-ribbon-button-radius, 8px)',
            border: 'none',
            backgroundColor:
              selectedTool === 'FreeformLasso'
                ? 'var(--colorNeutralBackground1Hover)'
                : 'transparent',
            color: 'var(--colorNeutralForeground1)',
            cursor: 'pointer',
            padding: 0,
            transform: selectedTool === 'FreeformLasso' ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.12s ease',
            boxShadow:
              selectedTool === 'FreeformLasso'
                ? '0 6px 12px rgba(0, 0, 0, 0.15)'
                : 'none',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (selectedTool !== 'FreeformLasso') {
              e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedTool !== 'FreeformLasso') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <LassoIcon size={24} />
        </button>
      </nav>
    </>
  );
};
