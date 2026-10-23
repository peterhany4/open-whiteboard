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
import { useTheme } from '../../theme/ThemeProvider';

interface TextBoxWidgetProps {
  textEntity: TextEntity;
}

export const TextBoxWidget: React.FC<TextBoxWidgetProps> = ({ textEntity }) => {
  const { isSelected } = useSelectionStore();
  const selected = isSelected(textEntity.id);
  const { isDark } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(textEntity.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(textEntity.text || '');
  }, [textEntity.text]);

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
    if (text !== textEntity.text) {
      sceneStore.updateEntity(textEntity.id, { text }, true);
    }
  }, [textEntity.id, textEntity.text, text]);

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
        selectionStore.deselect(textEntity.id);
      } else {
        selectionStore.select(textEntity.id, isAdditive);
      }
    },
    [textEntity.id, selected]
  );

  return (
    <div
      id={`wb-text-${textEntity.id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (e.button === 0) e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: `${textEntity.x}px`,
        top: `${textEntity.y}px`,
        width: `${textEntity.width}px`,
        minHeight: `${textEntity.height}px`,
        padding: '6px 8px',
        boxSizing: 'border-box',
        cursor: isEditing ? 'text' : 'pointer',
        userSelect: isEditing ? 'text' : 'none',
        pointerEvents: 'auto',
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
