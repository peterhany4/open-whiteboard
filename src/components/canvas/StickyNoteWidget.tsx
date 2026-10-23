/**
 * Microsoft Whiteboard — Authentic Folded-Corner Sticky Note Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 93425 (chunks/93425.*.js, line 67): u.Y.Note, default size (200x200), color palette
 *   - Module 8854 & 770023: Bounding box math, text auto-fit, and folded shadow styling
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { NoteEntity } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore } from '../../store/selectionStore';
import { useSelectionStore } from '../../store/selectionStore';

export const NOTE_PASTEL_COLORS: { name: string; color: string; textColor: string }[] = [
  { name: 'Yellow', color: '#FFF1A8', textColor: '#1F1F1F' },
  { name: 'Green', color: '#D4F5B0', textColor: '#1F1F1F' },
  { name: 'Blue', color: '#C8EBFA', textColor: '#1F1F1F' },
  { name: 'Pink', color: '#FED8E4', textColor: '#1F1F1F' },
  { name: 'Purple', color: '#E9D5FA', textColor: '#1F1F1F' },
  { name: 'Orange', color: '#FFDFBA', textColor: '#1F1F1F' },
  { name: 'Grey', color: '#EDEBE9', textColor: '#1F1F1F' },
  { name: 'Charcoal', color: '#323130', textColor: '#FFFFFF' },
];

interface StickyNoteWidgetProps {
  note: NoteEntity;
}

export const StickyNoteWidget: React.FC<StickyNoteWidgetProps> = ({ note }) => {
  const { isSelected } = useSelectionStore();
  const selected = isSelected(note.id);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if external changes occur (e.g. undo/redo)
  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      sceneStore.updateEntity(note.id, { text: newText }, false);
    },
    [note.id]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Commit final text to history for Undo/Redo
    if (text !== note.text) {
      sceneStore.updateEntity(note.id, { text }, true);
    }
  }, [note.id, note.text, text]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 20);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive && selected) {
        selectionStore.deselect(note.id);
      } else {
        selectionStore.select(note.id, isAdditive);
      }
    },
    [note.id, selected]
  );

  const handleAddReaction = useCallback(
    (emoji: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const currentReactions = note.reactions || [];
      const updated = [...currentReactions, emoji];
      sceneStore.updateEntity(note.id, { reactions: updated }, true);
    },
    [note.id, note.reactions]
  );

  const handleRemoveReaction = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const currentReactions = [...(note.reactions || [])];
      currentReactions.splice(index, 1);
      sceneStore.updateEntity(note.id, { reactions: currentReactions }, true);
    },
    [note.id, note.reactions]
  );

  const isCharcoal = note.color === '#323130' || note.color === '#1F1F1F';
  const textColor = isCharcoal ? '#FFFFFF' : '#1F1F1F';

  return (
    <div
      id={`wb-note-${note.id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (e.button === 0) e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width}px`,
        height: `${note.height}px`,
        backgroundColor: note.color || '#FFF1A8',
        borderRadius: '6px',
        padding: '16px 16px 28px 16px',
        boxSizing: 'border-box',
        color: textColor,
        boxShadow: selected
          ? '0 0 0 2px #0078D4, 0 8px 24px rgba(0,0,0,0.18)'
          : '0 4px 12px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        userSelect: isEditing ? 'text' : 'none',
        pointerEvents: 'auto',
        zIndex: note.zIndex,
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        overflow: 'hidden',
      }}
    >
      {/* Authentic Folded Corner Dog-Ear SVG */}
      <div
        id="wb-note-dogear"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          pointerEvents: 'none',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {/* Subtle curl shadow */}
          <path
            d="M0 20L20 0V20H0Z"
            fill="rgba(0, 0, 0, 0.08)"
          />
          {/* Folded paper flap */}
          <path
            d="M0 20L20 0L8 8L0 20Z"
            fill="rgba(255, 255, 255, 0.22)"
          />
        </svg>
      </div>

      {/* Inline Text Content / Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        readOnly={!isEditing}
        placeholder="Type a note..."
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          resize: 'none',
          color: 'inherit',
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
          fontSize: '15px',
          lineHeight: '1.4',
          cursor: isEditing ? 'text' : 'pointer',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      />

      {/* Bottom Corner Reaction Badges */}
      {note.reactions && note.reactions.length > 0 && (
        <div
          id="wb-note-reactions"
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap',
            zIndex: 10,
          }}
        >
          {note.reactions.map((emoji, idx) => (
            <span
              key={`${emoji}-${idx}`}
              onClick={(e) => handleRemoveReaction(idx, e)}
              title="Click to remove reaction"
              style={{
                fontSize: '12px',
                padding: '2px 4px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Hover Quick Reaction Pill */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '2px 4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {['👍', '❤️', '✔️', '🎉'].map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => handleAddReaction(emoji, e)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '1px 3px',
                borderRadius: '4px',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
