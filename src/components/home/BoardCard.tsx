import React, { useState, useRef, useEffect } from 'react';
import type { BoardSummary } from '../../store/boardStore';
import { boardStore } from '../../store/boardStore';
import { useTheme } from '../../theme';
import { formatRelativeTime } from './formatRelativeTime';
import {
  MoreIcon,
  EditIcon,
  DuplicateIcon,
  DeleteIcon,
  ImageIcon,
  DocumentPDFIcon,
  CheckmarkIcon,
} from '../../assets/icons';
import { ExportEngine } from '../../tools/ExportEngine';

interface BoardCardProps {
  board: BoardSummary;
}

export const BoardCard: React.FC<BoardCardProps> = ({ board }) => {
  const { mode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(board.title);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(board.title);
  }, [board.title]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Handle outside click to close context menu
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      window.addEventListener('pointerdown', handlePointerDown);
    }
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  const handleOpen = () => {
    if (isRenaming) return;
    boardStore.openBoard(board.id);
  };

  const handleRenameSubmit = async () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== board.title) {
      await boardStore.renameBoard(board.id, trimmed);
    } else {
      setTitleDraft(board.title);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setTitleDraft(board.title);
      setIsRenaming(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    await boardStore.duplicateBoard(board.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await boardStore.deleteBoard(board.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportPng = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    // If this is currently active board, use fast direct export
    await ExportEngine.exportToPng({ scale: 2, boardTitle: board.title });
  };

  const handleExportPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    await ExportEngine.exportToPdf({ boardTitle: board.title });
  };

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Whiteboard: ${board.title}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isRenaming) setIsMenuOpen(false);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '240px',
        borderRadius: '10px',
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor:
          mode === 'Dark' ? 'rgba(38, 38, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isHovered
          ? '1px solid var(--wb-color-brand, #0078D4)'
          : '1px solid var(--wb-acrylic-border)',
        boxShadow: isHovered
          ? '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)'
          : '0 2px 6px rgba(0, 0, 0, 0.04)',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Preview Thumbnail Container (16:9 area) */}
      <div
        onClick={handleOpen}
        title={`Open "${board.title}"`}
        style={{
          width: '100%',
          height: '158px',
          backgroundColor: mode === 'Dark' ? '#1F1F1F' : '#FFFFFF',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderBottom: '1px solid var(--wb-acrylic-border)',
        }}
      >
        {board.thumbnailDataUrl ? (
          <img
            src={board.thumbnailDataUrl}
            alt={board.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage:
                mode === 'Dark'
                  ? 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)'
                  : 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
        )}

        {/* Hover Open Overlay Pill */}
        {isHovered && !isRenaming && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(0, 120, 212, 0.9)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            Open board
          </div>
        )}
      </div>

      {/* 2. Board Card Footer Bar */}
      <div
        style={{
          flex: 1,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        {/* Title & Timestamp */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {isRenaming ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                ref={inputRef}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                style={{
                  width: '100%',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--wb-color-brand, #0078D4)',
                  backgroundColor:
                    mode === 'Dark' ? '#2B2B2B' : '#FFFFFF',
                  color: 'var(--wb-text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleRenameSubmit}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--wb-color-brand, #0078D4)',
                  padding: '2px',
                }}
              >
                <CheckmarkIcon size={16} />
              </button>
            </div>
          ) : (
            <span
              onClick={handleOpen}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              title={board.title}
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--wb-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              {board.title}
            </span>
          )}

          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--wb-text-secondary)',
              marginTop: '3px',
            }}
          >
            Edited {formatRelativeTime(board.updatedAt)}
          </span>
        </div>

        {/* Card Options Context Menu Button ("...") */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            title="More options"
            aria-label={`Options for ${board.title}`}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              background: isMenuOpen ? 'rgba(0, 120, 212, 0.15)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMenuOpen ? 'var(--wb-color-brand, #0078D4)' : 'var(--wb-text-secondary)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                mode === 'Dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              if (!isMenuOpen) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <MoreIcon size={18} />
          </button>

          {/* Context Menu Dropdown */}
          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '38px',
                right: 0,
                width: '180px',
                backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
                border: '1px solid var(--colorNeutralStroke1, rgba(0, 0, 0, 0.12))',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
                padding: '4px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Open */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  handleOpen();
                }}
                style={menuItemStyle()}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span>Open</span>
              </button>

              {/* Rename */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  setIsRenaming(true);
                }}
                style={menuItemStyle()}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <EditIcon size={16} />
                <span>Rename</span>
              </button>

              {/* Duplicate */}
              <button
                onClick={handleDuplicate}
                style={menuItemStyle()}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DuplicateIcon size={16} />
                <span>Duplicate</span>
              </button>

              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--colorNeutralStroke1)',
                  margin: '4px 0',
                }}
              />

              {/* Export PNG */}
              <button
                onClick={handleExportPng}
                style={menuItemStyle()}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ImageIcon size={16} />
                <span>Export PNG</span>
              </button>

              {/* Export PDF */}
              <button
                onClick={handleExportPdf}
                style={menuItemStyle()}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DocumentPDFIcon size={16} />
                <span>Export PDF</span>
              </button>

              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--colorNeutralStroke1)',
                  margin: '4px 0',
                }}
              />

              {/* Delete */}
              <button
                onClick={handleDelete}
                style={{
                  ...menuItemStyle(),
                  color: '#D13438',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(209, 52, 56, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DeleteIcon size={16} color="#D13438" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function menuItemStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--colorNeutralForeground1, #1F1F1F)',
    textAlign: 'left',
    transition: 'background-color 0.12s ease',
  };
}
