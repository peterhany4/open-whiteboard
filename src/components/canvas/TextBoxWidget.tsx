/**
 * Open Whiteboard — Resizable Rich Text Box Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 93425 (chunks/93425.*.js, line 67): u.Y.PlainText insertion & typography
 *   - Module 8854: Bounding box auto-expansion & adaptive Light/Dark contrast
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TextEntity } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { useInkingStore } from '../../store/inkingStore';
import { useTheme } from '../../theme/ThemeProvider';

interface TextBoxWidgetProps {
  textEntity: TextEntity;
}

export const TextBoxWidget: React.FC<TextBoxWidgetProps> = ({ textEntity }) => {
  const { isSelected, editingEntityId, setEditingEntityId } = useSelectionStore();
  const selected = isSelected(textEntity.id);
  const { selectedTool } = useInkingStore();
  const isSelectTool = selectedTool === 'Select';
  const { isDark } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(textEntity.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(textEntity.text || '');
  }, [textEntity.text]);

  // Synchronize editing state from selectionStore
  const isStoreEditing = editingEntityId === textEntity.id;
  useEffect(() => {
    if (isStoreEditing) {
      setIsEditing(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 20);
    } else {
      setIsEditing(false);
    }
  }, [isStoreEditing]);

  // Dynamic auto-expansion for multi-line text
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = Math.max(32, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = `${scrollH}px`;
      if (scrollH > textEntity.height) {
        sceneStore.updateEntity(textEntity.id, { height: scrollH }, false);
      }
    }
  }, [textEntity.id, textEntity.height]);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  // Adaptive contrast calculation: Dark mode flips default dark text to white
  const rawColor = textEntity.color || '#1F1F1F';
  const displayColor = isDark && (rawColor === '#1F1F1F' || rawColor === '#000000')
    ? '#FFFFFF'
    : !isDark && rawColor === '#FFFFFF'
    ? '#1F1F1F'
    : rawColor;

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      sceneStore.updateEntity(textEntity.id, { text: newText }, false);
    },
    [textEntity.id]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setEditingEntityId(null);
    let finalH = textEntity.height;
    if (textareaRef.current) {
      finalH = Math.max(32, textareaRef.current.scrollHeight);
    }
    if (text !== textEntity.text || finalH !== textEntity.height) {
      sceneStore.updateEntity(textEntity.id, { text, height: finalH }, true);
    }
  }, [textEntity.id, textEntity.text, textEntity.height, text, setEditingEntityId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        textareaRef.current?.blur();
      }
    },
    []
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelectTool) return;
      e.stopPropagation();
      selectionStore.select(textEntity.id);
      setEditingEntityId(textEntity.id);
      setIsEditing(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 20);
    },
    [textEntity.id, isSelectTool, setEditingEntityId]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelectTool) return;
      e.stopPropagation();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive && selected) {
        selectionStore.deselect(textEntity.id);
      } else {
        selectionStore.select(textEntity.id, isAdditive);
        // If already selected and clicked again, activate inline editing
        if (selected && !isAdditive && !isEditing) {
          setEditingEntityId(textEntity.id);
          setIsEditing(true);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              const len = textareaRef.current.value.length;
              textareaRef.current.setSelectionRange(len, len);
            }
          }, 20);
        }
      }
    },
    [textEntity.id, selected, isSelectTool, isEditing, setEditingEntityId]
  );

  return (
    <div
      id={`wb-text-${textEntity.id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (isSelectTool && e.button === 0) e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: `${textEntity.x}px`,
        top: `${textEntity.y}px`,
        width: `${textEntity.width}px`,
        minHeight: `${textEntity.height}px`,
        padding: '6px 8px',
        boxSizing: 'border-box',
        cursor: isSelectTool ? (isEditing ? 'text' : 'pointer') : 'inherit',
        userSelect: isEditing ? 'text' : 'none',
        pointerEvents: isSelectTool ? 'auto' : 'none',
        zIndex: textEntity.zIndex,
        borderRadius: '4px',
        border: selected ? '1.5px dashed #0078D4' : '1.5px dashed transparent',
        backgroundColor: selected ? 'rgba(0, 120, 212, 0.04)' : 'transparent',
        transition: 'border 0.12s ease',
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        readOnly={!isEditing}
        placeholder="Click to type text..."
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          resize: 'none',
          color: displayColor,
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
          fontSize: `${textEntity.fontSize || 18}px`,
          fontWeight: (textEntity.fontSize || 18) >= 24 ? 700 : 400,
          lineHeight: '1.35',
          cursor: isEditing ? 'text' : 'pointer',
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
    </div>
  );
};
