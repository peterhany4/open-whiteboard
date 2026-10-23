/**
 * Open Whiteboard — Geometric Shapes & Connectors Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 93425 (chunks/93425.*.js, line 67): u.Y.Shape (Rectangle, Circle, Diamond, Triangle, Parallelogram, Arrow, Line)
 *   - Module 8854: Shape bounding box calculations and connector anchor snapping
 */

import React, { useCallback } from 'react';
import type { ShapeEntity } from '../../canvas/sceneGraph';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';

interface ShapeWidgetProps {
  shape: ShapeEntity;
}

export const ShapeWidget: React.FC<ShapeWidgetProps> = ({ shape }) => {
  const { isSelected } = useSelectionStore();
  const selected = isSelected(shape.id);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive && selected) {
        selectionStore.deselect(shape.id);
      } else {
        selectionStore.select(shape.id, isAdditive);
      }
    },
    [shape.id, selected]
  );

  const { width, height, shapeType, strokeColor, fillColor, strokeWidth } = shape;
  const sw = strokeWidth || 2;
  const stroke = strokeColor || '#0078D4';
  const fill = fillColor || 'transparent';

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

  return (
    <div
      id={`wb-shape-${shape.id}`}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (e.button === 0) e.stopPropagation();
      }}
      style={{
        position: 'absolute',
        left: `${shape.x}px`,
        top: `${shape.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        cursor: 'pointer',
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: shape.zIndex,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          overflow: 'visible',
          display: 'block',
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
    </div>
  );
};
