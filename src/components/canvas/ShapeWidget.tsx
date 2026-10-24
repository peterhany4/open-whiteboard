/**
 * Open Whiteboard — Geometric Shapes & Connectors Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 93425 (chunks/93425.*.js, line 67): u.Y.Shape (Rectangle, Circle, Diamond, Triangle, Parallelogram, Arrow, Line)
 *   - Module 8854: Shape bounding box calculations, text auto-fit, and connector anchor snapping
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ShapeEntity } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { useInkingStore } from '../../store/inkingStore';
import { useTheme } from '../../theme/ThemeProvider';

interface ShapeWidgetProps {
  shape: ShapeEntity;
}

export const ShapeWidget: React.FC<ShapeWidgetProps> = ({ shape }) => {
  const { isSelected } = useSelectionStore();
  const selected = isSelected(shape.id);
  const { selectedTool } = useInkingStore();
  const { isDark } = useTheme();

  const isSelectTool = selectedTool === 'Select';
  const isLineOrArrow = shape.shapeType === 'line' || shape.shapeType === 'arrow';

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shape.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if external changes occur (undo/redo)
  useEffect(() => {
    setText(shape.text || '');
  }, [shape.text]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelectTool || isLineOrArrow) return;
      e.stopPropagation();
      setIsEditing(true);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 30);
    },
    [isSelectTool, isLineOrArrow]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelectTool) return;
      e.stopPropagation();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive && selected) {
        selectionStore.deselect(shape.id);
      } else {
        selectionStore.select(shape.id, isAdditive);
        // If already selected and clicked again, activate inline editing
        if (selected && !isEditing && !isLineOrArrow) {
          setIsEditing(true);
          setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
          }, 30);
        }
      }
    },
    [shape.id, selected, isSelectTool, isEditing, isLineOrArrow]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);
      sceneStore.updateEntity(shape.id, { text: val }, false);
    },
    [shape.id]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (text !== (shape.text || '')) {
      sceneStore.updateEntity(shape.id, { text }, true);
    }
  }, [shape.id, shape.text, text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        textareaRef.current?.blur();
      }
    },
    []
  );

  // Allow typing directly when shape is selected in Select mode
  useEffect(() => {
    if (!selected || isEditing || !isSelectTool || isLineOrArrow) return;

    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key.length === 1 || e.key === 'Enter') {
        setIsEditing(true);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            if (e.key !== 'Enter' && !text) {
              setText(e.key);
              sceneStore.updateEntity(shape.id, { text: e.key }, false);
            }
          }
        }, 20);
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selected, isEditing, isSelectTool, isLineOrArrow, shape.id, text]);

  const { width, height, shapeType, strokeColor, fillColor, strokeWidth } = shape;
  const sw = strokeWidth || 2;
  const stroke = strokeColor || '#0078D4';
  const fill = fillColor || 'transparent';

  // Contrast calculation for embedded text
  const textColor = shape.textColor || (isDark ? '#FFFFFF' : '#1F1F1F');

  // Padding to ensure text stays comfortably within geometric curves
  const textPaddingX = Math.max(12, width * (shapeType === 'circle' || shapeType === 'diamond' ? 0.22 : 0.1));
  const textPaddingY = Math.max(8, height * (shapeType === 'circle' || shapeType === 'diamond' ? 0.22 : 0.1));

  const renderShapeGeometry = () => {
    switch (shapeType) {
      case 'circle':
        return (
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={Math.max(1, (width - sw) / 2)}
            ry={Math.max(1, (height - sw) / 2)}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        );

      case 'diamond': {
        const points = `${width / 2},${sw} ${width - sw},${height / 2} ${width / 2},${height - sw} ${sw},${height / 2}`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      }

      case 'triangle': {
        const points = `${width / 2},${sw} ${width - sw},${height - sw} ${sw},${height - sw}`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      }

      case 'parallelogram': {
        const offset = width * 0.22;
        const points = `${offset},${sw} ${width - sw},${sw} ${width - offset},${height - sw} ${sw},${height - sw}`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      }

      case 'arrow': {
        const midY = height / 2;
        const headSize = Math.min(20, width * 0.25);
        return (
          <g>
            <line
              x1={sw}
              y1={midY}
              x2={width - headSize}
              y2={midY}
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
            />
            <polyline
              points={`${width - headSize},${midY - headSize * 0.6} ${width - sw},${midY} ${width - headSize},${midY + headSize * 0.6}`}
              fill="none"
              stroke={stroke}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      }

      case 'line': {
        const midY = height / 2;
        return (
          <line
            x1={sw}
            y1={midY}
            x2={width - sw}
            y2={midY}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        );
      }

      case 'rectangle':
      default:
        return (
          <rect
            x={sw / 2}
            y={sw / 2}
            width={Math.max(1, width - sw)}
            height={Math.max(1, height - sw)}
            rx={8}
            ry={8}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        );
    }
  };

  // Cardinal border connector anchor points
  const anchors = [
    { x: width / 2, y: 0 },
    { x: width, y: height / 2 },
    { x: width / 2, y: height },
    { x: 0, y: height / 2 },
  ];

  // Tool-Mode Isolation: Only accept pointer events and show pointer cursor when Select tool is active!
  const containerCursor = isSelectTool ? (isEditing ? 'text' : 'pointer') : 'inherit';
  const containerPointerEvents = isSelectTool ? 'auto' : 'none';

  return (
    <div
      id={`wb-shape-${shape.id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (isSelectTool && e.button === 0) e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: `${shape.x}px`,
        top: `${shape.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        cursor: containerCursor,
        pointerEvents: containerPointerEvents,
        userSelect: isEditing ? 'text' : 'none',
        zIndex: shape.zIndex,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        {renderShapeGeometry()}

        {/* Visual Connector Snap Anchor Dots (when selected) */}
        {selected &&
          anchors.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3.5}
              fill="#0078D4"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          ))}
      </svg>

      {/* Internal Text Layer / Centered Textarea */}
      {!isLineOrArrow && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${textPaddingY}px ${textPaddingX}px`,
            boxSizing: 'border-box',
            pointerEvents: isSelectTool ? 'auto' : 'none',
          }}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Type here..."
              style={{
                width: '100%',
                maxHeight: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                resize: 'none',
                color: textColor,
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                fontSize: `${shape.fontSize || 15}px`,
                fontWeight: 500,
                lineHeight: '1.4',
                textAlign: 'center',
                overflow: 'hidden',
                cursor: 'text',
                padding: 0,
                margin: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                maxHeight: '100%',
                color: text ? textColor : 'var(--colorNeutralForeground4)',
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                fontSize: `${shape.fontSize || 15}px`,
                fontWeight: 500,
                lineHeight: '1.4',
                textAlign: 'center',
                wordBreak: 'break-word',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {text || (selected && isSelectTool ? 'Double-click to type' : '')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
