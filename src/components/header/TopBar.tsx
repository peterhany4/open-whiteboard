import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore, canvasStore } from '../../store/canvasStore';
import { useTheme } from '../../theme';
import {
  UndoIcon,
  RedoIcon,
  CopilotIcon,
  SettingsIcon,
  CheckmarkIcon,
  SunIcon,
  MoonIcon,
  ExportIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  DocumentPDFIcon,
  ImageIcon,
} from '../../assets/icons';
import { paperColors } from '../../theme/tokens';
import type { GridPatternType } from '../../canvas/grid';
import { ExportEngine } from '../../tools/ExportEngine';
import { useBoardStore, boardStore } from '../../store/boardStore';
import { sceneStore } from '../../store/sceneStore';
import { WindowControls } from '../electron/WindowControls';

export const TopBar: React.FC = () => {
  const { boardTitle, canUndo, canRedo, isSettingsOpen, gridPattern } = useCanvasStore();
  const { isSaving } = useBoardStore();
  const { mode, toggleTheme, paperColor, setPaperColor } = useTheme();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleInput(boardTitle);
  }, [boardTitle]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Outside click to close settings
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        canvasStore.closeSettings();
      }
    }
    if (isSettingsOpen) {
      window.addEventListener('pointerdown', handlePointerDown);
    }
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isSettingsOpen]);

  // Outside click to close export dropdown
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    }
    if (isExportOpen) {
      window.addEventListener('pointerdown', handlePointerDown);
    }
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isExportOpen]);

  const handleExportPng = async (scale: number) => {
    setIsExporting(true);
    setIsExportOpen(false);
    try {
      await ExportEngine.exportToPng({ scale, boardTitle });
    } catch (err) {
      console.error('[TopBar] Export PNG error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = () => {
    setIsExportOpen(false);
    try {
      ExportEngine.exportToSvg({ boardTitle });
    } catch (err) {
      console.error('[TopBar] Export SVG error:', err);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setIsExportOpen(false);
    try {
      await ExportEngine.exportToPdf({ boardTitle });
    } catch (err) {
      console.error('[TopBar] Export PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveWhiteboardFile = async () => {
    setIsExportOpen(false);
    const canvasData = {
      entities: sceneStore.serializeEntities(),
      gridPattern,
    };
    const bundle = {
      version: 1,
      format: 'Open Whiteboard Bundle',
      title: boardTitle || 'Untitled Whiteboard',
      createdAt: new Date().toISOString(),
      canvasData,
    };
    const content = JSON.stringify(bundle, null, 2);

    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveWhiteboard(boardTitle || 'Whiteboard', content);
    } else {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${boardTitle || 'Whiteboard'}.whiteboard`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleTitleSubmit = () => {
    const trimmed = titleInput.trim();
    if (trimmed) {
      canvasStore.setBoardTitle(trimmed);
    } else {
      setTitleInput(boardTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleInput(boardTitle);
      setIsEditingTitle(false);
    }
  };

  const paperPaletteOptions = [
    { key: 'white', label: 'White', color: paperColors.white },
    { key: 'yellow', label: 'Soft Yellow', color: paperColors.yellow },
    { key: 'blue', label: 'Soft Blue', color: paperColors.blue },
    { key: 'orange', label: 'Soft Orange', color: paperColors.orange },
    { key: 'pink', label: 'Soft Pink', color: paperColors.pink },
    { key: 'purple', label: 'Soft Purple', color: paperColors.purple },
    { key: 'green', label: 'Soft Green', color: paperColors.green },
    { key: 'black', label: 'Dark Paper', color: paperColors.black },
  ];

  const gridOptions: { key: GridPatternType; label: string }[] = [
    { key: 'Dot', label: 'Dot Grid' },
    { key: 'Cubic', label: 'Square' },
    { key: 'Graph', label: 'Graph' },
    { key: 'CubicDot', label: 'Cubic Dot' },
    { key: 'CompactRule', label: 'Narrow Rule' },
    { key: 'WideRule', label: 'Wide Rule' },
    { key: 'SlantedCubic', label: 'Isometric' },
    { key: 'Triangular', label: 'Triangular' },
    { key: 'Neutral', label: 'Blank' },
  ];

  return (
    <header
      id="shellHeader"
      aria-label="Whiteboard Header"
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget && window.electronAPI) {
          window.electronAPI.maximize();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--wb-header-height, 48px)',
        padding: '0 0 0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--wb-acrylic-background)',
        backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        borderBottom: 'var(--wb-acrylic-border)',
        boxShadow: 'var(--shadow2, 0 1px 2px rgba(0,0,0,0.06))',
        zIndex: 1000,
        userSelect: 'none',
        WebkitAppRegion: 'drag' as any,
      }}
    >
      {/* Left: App Logo, Board Title & History */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'no-drag' as any }}>
        {/* Navigation button back to Whiteboard Gallery */}
        <button
          onClick={() => boardStore.navigateTo('gallery')}
          title="Back to My Whiteboards"
          aria-label="Back to My Whiteboards"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            padding: '4px 8px 4px 4px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--wb-text-primary)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              mode === 'Dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ChevronLeftIcon size={18} color="var(--wb-text-secondary)" />
          {/* Open Whiteboard signature tile icon */}
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #185ABD 0%, #2E6AC5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(24, 90, 189, 0.3)',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
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
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--wb-text-secondary)',
            }}
          >
            My whiteboards
          </span>
        </button>

        {/* Small vertical divider */}
        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--wb-acrylic-border)' }} />

        {/* Board Title (Clickable & Editable) */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--themePrimary)',
              backgroundColor: 'var(--colorNeutralBackground1)',
              color: 'var(--colorNeutralForeground1)',
              outline: 'none',
              width: '180px',
            }}
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename board"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--colorNeutralForeground1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>{boardTitle}</span>
            <span
              style={{
                fontSize: '11px',
                color: isSaving ? 'var(--wb-color-brand, #0078D4)' : 'var(--colorNeutralForeground3)',
                fontWeight: 400,
              }}
            >
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          </button>
        )}

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--colorNeutralStroke1)', margin: '0 4px' }} />

        {/* Undo Button */}
        <button
          onClick={() => canvasStore.triggerUndo()}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: canUndo ? 'var(--colorNeutralForeground1)' : 'var(--colorNeutralForegroundDisabled)',
            cursor: canUndo ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            if (canUndo) e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
          }}
          onMouseLeave={(e) => {
            if (canUndo) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <UndoIcon size={18} />
        </button>

        {/* Redo Button */}
        <button
          onClick={() => canvasStore.triggerRedo()}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: canRedo ? 'var(--colorNeutralForeground1)' : 'var(--colorNeutralForegroundDisabled)',
            cursor: canRedo ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            if (canRedo) e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
          }}
          onMouseLeave={(e) => {
            if (canRedo) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <RedoIcon size={18} />
        </button>
      </div>

      {/* Right: Copilot, Share, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '8px', WebkitAppRegion: 'no-drag' as any }}>
        {/* Copilot Pill Button */}
        <button
          title="Copilot in Open Whiteboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            height: '32px',
            borderRadius: '16px',
            border: '1px solid var(--colorNeutralStroke1)',
            backgroundColor: 'var(--colorNeutralBackground1)',
            color: 'var(--colorNeutralForeground1)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--themePrimary)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(24, 90, 189, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--colorNeutralStroke1)';
            e.currentTarget.style.boxShadow = 'var(--shadow2)';
          }}
        >
          <CopilotIcon size={16} />
          <span>Copilot</span>
        </button>

        {/* Export Menu Dropdown */}
        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            title="Export Whiteboard (PNG, SVG, PDF)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid var(--colorNeutralStroke1)',
              backgroundColor: isExportOpen
                ? 'var(--colorNeutralBackground1Selected)'
                : 'var(--colorNeutralBackground1)',
              color: 'var(--colorNeutralForeground1)',
              cursor: isExporting ? 'wait' : 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--themePrimary)';
            }}
            onMouseLeave={(e) => {
              if (!isExportOpen) e.currentTarget.style.borderColor = 'var(--colorNeutralStroke1)';
            }}
          >
            <ExportIcon size={16} color="var(--themePrimary)" />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            <ChevronDownIcon size={12} />
          </button>

          {/* Export Menu Dropdown Popover */}
          {isExportOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'var(--wb-acrylic-background)',
                backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
                WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
                border: 'var(--wb-acrylic-border)',
                boxShadow: 'var(--shadow16)',
                color: 'var(--colorNeutralForeground1)',
                zIndex: 1100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                animation: 'wbPopoverFadeIn 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
              }}
            >
              <div
                style={{
                  padding: '6px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--colorNeutralForeground3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Export Whiteboard
              </div>

              <button
                onClick={() => handleExportPng(2)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ImageIcon size={20} color="#0078D4" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>High-Resolution PNG (2x)</div>
                  <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Crisp raster image for presentations</div>
                </div>
              </button>

              <button
                onClick={() => handleExportPng(3)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ImageIcon size={20} color="#8F349E" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Super-Resolution PNG (3x)</div>
                  <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Ultra crisp high-DPI export</div>
                </div>
              </button>

              <button
                onClick={handleExportSvg}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 16L9 4L11 8L16 4L14 16H4Z" stroke="#00B44B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Vector SVG</div>
                  <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Infinite resolution vector graphics</div>
                </div>
              </button>

              <button
                onClick={handleExportPdf}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DocumentPDFIcon size={20} color="#E71224" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Annotated PDF Document</div>
                  <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Standard PDF document for sharing</div>
                </div>
              </button>

              {/* Native .whiteboard Bundle */}
              <button
                onClick={handleSaveWhiteboardFile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: 'linear-gradient(135deg, #185ABD 0%, #2E6AC5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="3" width="16" height="14" rx="2" stroke="#FFFFFF" strokeWidth="2" />
                    <path d="M5 12L8 8L12 12L15 9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Whiteboard File (.whiteboard)</div>
                  <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>Full editable board bundle for desktop</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          title="Share Whiteboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            height: '32px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--themePrimary)',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background-color 0.12s ease',
            boxShadow: 'var(--shadow2)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--themeDark)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--themePrimary)')}
        >
          <span>Share</span>
        </button>

        {/* Settings Menu Button & Popover */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => canvasStore.toggleSettings()}
            title="Settings & Canvas Preferences"
            aria-label="Settings"
            aria-expanded={isSettingsOpen}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isSettingsOpen ? 'var(--colorNeutralBackground1Hover)' : 'transparent',
              color: 'var(--colorNeutralForeground1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
            onMouseLeave={(e) => {
              if (!isSettingsOpen) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <SettingsIcon size={20} />
          </button>

          {/* Settings Menu Dropdown */}
          {isSettingsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                padding: '12px',
                borderRadius: 'var(--wb-card-border-radius, 8px)',
                backgroundColor: 'var(--wb-acrylic-background)',
                backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
                WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
                border: 'var(--wb-acrylic-border)',
                boxShadow: 'var(--shadow16)',
                color: 'var(--colorNeutralForeground1)',
                zIndex: 1100,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                animation: 'wbPopoverFadeIn 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--colorNeutralForeground3)' }}>
                  Theme Mode
                </span>
                <button
                  onClick={toggleTheme}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--colorNeutralStroke1)',
                    backgroundColor: 'var(--colorNeutralBackground1)',
                    color: 'var(--colorNeutralForeground1)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {mode === 'Light' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
                  <span>{mode}</span>
                </button>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--colorNeutralStroke1)' }} />

              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--colorNeutralForeground3)' }}>
                Canvas Paper Color
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {paperPaletteOptions.map((opt) => {
                  const isSelected = paperColor.toLowerCase() === opt.key.toLowerCase();
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setPaperColor(opt.key)}
                      title={opt.label}
                      style={{
                        width: '42px',
                        height: '32px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--themePrimary)' : '1px solid var(--colorNeutralStroke1)',
                        backgroundColor: opt.color,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s ease',
                        boxShadow: 'var(--shadow2)',
                      }}
                    >
                      {isSelected && (
                        <CheckmarkIcon
                          size={14}
                          color={opt.key === 'black' ? '#FFFFFF' : '#1F1F1F'}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--colorNeutralStroke1)' }} />

              <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--colorNeutralForeground3)' }}>
                Grid Pattern
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {gridOptions.map((opt) => {
                  const isSelected = gridPattern === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => canvasStore.setGridPattern(opt.key)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--themePrimary)' : '1px solid var(--colorNeutralStroke1)',
                        backgroundColor: isSelected ? 'var(--colorNeutralBackground1Selected)' : 'var(--colorNeutralBackground1)',
                        color: isSelected ? 'var(--themePrimary)' : 'var(--colorNeutralForeground1)',
                        fontSize: '11px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Custom Fluent Windows 11 Titlebar Controls */}
        <WindowControls />
      </div>
    </header>
  );
};
