/**
 * Open Whiteboard — Dynamic Note Grid Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 93425 (chunks/93425.*.js, line 67): u.Y.NoteGrid, multi-note container layout
 *   - Module 8854 & 770023: Dynamic grid sizing, card insertion, and bounding box math
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { NoteGridEntity, NoteGridItem } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { NOTE_PASTEL_COLORS } from './StickyNoteWidget';
import { AddIcon, DismissIcon } from '../../assets/icons';

interface NoteGridWidgetProps {
  noteGrid: NoteGridEntity;
}

export const NoteGridWidget: React.FC<NoteGridWidgetProps> = ({ noteGrid }) => {
  const { isSelected } = useSelectionStore();
  const selected = isSelected(noteGrid.id);

  const [title, setTitle] = useState(noteGrid.title || 'Note Grid');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(noteGrid.title || 'Note Grid');
  }, [noteGrid.title]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      sceneStore.updateEntity(noteGrid.id, { title: newTitle }, false);
    },
    [noteGrid.id]
  );

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (title !== noteGrid.title) {
      sceneStore.updateEntity(noteGrid.id, { title }, true);
    }
  }, [noteGrid.id, noteGrid.title, title]);

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive && selected) {
        selectionStore.deselect(noteGrid.id);
      } else {
        selectionStore.select(noteGrid.id, isAdditive);
      }
    },
    [noteGrid.id, selected]
  );

  // Update text of an individual note inside the grid
  const handleNoteTextChange = useCallback(
    (noteId: string, newText: string) => {
      const updatedNotes = noteGrid.notes.map((n) =>
        n.id === noteId ? { ...n, text: newText } : n
      );
      sceneStore.updateEntity(noteGrid.id, { notes: updatedNotes }, false);
    },
    [noteGrid.id, noteGrid.notes]
  );

  // Add a new note to the grid
  const handleAddNote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const nextIndex = noteGrid.notes.length % NOTE_PASTEL_COLORS.length;
      const nextColor = NOTE_PASTEL_COLORS[nextIndex].color;

      const newNote: NoteGridItem = {
        id: `grid_item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: '',
        color: nextColor,
        reactions: [],
      };

      const updatedNotes = [...noteGrid.notes, newNote];

      // Auto-expand grid height if rows increase
      const cardsPerRow = 3;
      const totalRows = Math.ceil((updatedNotes.length + 1) / cardsPerRow);
      const computedHeight = Math.max(300, totalRows * 180 + 80);

      sceneStore.updateEntity(
        noteGrid.id,
        {
          notes: updatedNotes,
          height: computedHeight,
        },
        true
      );
    },
    [noteGrid.id, noteGrid.notes]
  );

  // Remove a note from the grid
  const handleDeleteNote = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedNotes = noteGrid.notes.filter((n) => n.id !== noteId);
      sceneStore.updateEntity(noteGrid.id, { notes: updatedNotes }, true);
    },
    [noteGrid.id, noteGrid.notes]
  );

  return (
    <div
      id={`wb-notegrid-${noteGrid.id}`}
      onClick={handleGridClick}
      onPointerDown={(e) => {
        if (e.button === 0) e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: `${noteGrid.x}px`,
        top: `${noteGrid.y}px`,
        width: `${noteGrid.width}px`,
        minHeight: `${noteGrid.height}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: '12px',
        padding: '16px',
        boxSizing: 'border-box',
        boxShadow: selected
          ? '0 0 0 2px #0078D4, 0 12px 32px rgba(0,0,0,0.18)'
          : '0 8px 24px rgba(0, 0, 0, 0.08)',
        zIndex: noteGrid.zIndex,
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer',
        pointerEvents: 'auto',
        userSelect: 'none',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {/* Header Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          paddingBottom: '8px',
        }}
      >
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
            autoFocus
            style={{
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'Segoe UI, sans-serif',
              border: '1px solid #0078D4',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              width: '200px',
              color: '#1F1F1F',
            }}
          />
        ) : (
          <h3
            onDoubleClick={() => setIsEditingTitle(true)}
            title="Double-click to rename grid"
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: 'Segoe UI, sans-serif',
              color: '#1F1F1F',
              cursor: 'text',
            }}
          >
            {title}
          </h3>
        )}

        <span
          style={{
            fontSize: '12px',
            color: 'rgba(0,0,0,0.5)',
            fontWeight: 500,
          }}
        >
          {noteGrid.notes.length} {noteGrid.notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Grid of Sticky Note Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          alignItems: 'stretch',
        }}
      >
        {noteGrid.notes.map((card) => (
          <div
            key={card.id}
            style={{
              position: 'relative',
              backgroundColor: card.color || '#FFF1A8',
              borderRadius: '6px',
              padding: '12px',
              boxSizing: 'border-box',
              minHeight: '140px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Delete Note Button (hover) */}
            <button
              onClick={(e) => handleDeleteNote(card.id, e)}
              title="Delete note"
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                color: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#E71224';
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(0,0,0,0.4)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <DismissIcon size={14} />
            </button>

            {/* Note text area */}
            <textarea
              defaultValue={card.text}
              placeholder="Type note..."
              onChange={(e) => handleNoteTextChange(card.id, e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                resize: 'none',
                color: '#1F1F1F',
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '13px',
                lineHeight: '1.35',
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}

        {/* Dynamic "+ Add note" Card */}
        <button
          onClick={handleAddNote}
          title="Add a note to grid"
          style={{
            border: '2px dashed rgba(0, 120, 212, 0.4)',
            borderRadius: '6px',
            backgroundColor: 'rgba(0, 120, 212, 0.04)',
            cursor: 'pointer',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#0078D4',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 120, 212, 0.08)';
            e.currentTarget.style.borderColor = '#0078D4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 120, 212, 0.04)';
            e.currentTarget.style.borderColor = 'rgba(0, 120, 212, 0.4)';
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 120, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AddIcon size={18} color="#0078D4" />
          </div>
          <span>Add note</span>
        </button>
      </div>
    </div>
  );
};
