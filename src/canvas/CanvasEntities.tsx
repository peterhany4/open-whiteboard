import React, { memo } from 'react';
import type {
  CanvasEntity,
  InkStrokeEntity,
} from './sceneGraph';

interface CanvasEntitiesProps {
  entities: CanvasEntity[];
}

import { penTool } from '../tools/PenTool';
import { useTheme } from '../theme/ThemeProvider';

const RenderStroke: React.FC<{ stroke: InkStrokeEntity; isDark?: boolean }> = memo(({ stroke, isDark = false }) => {
  const pathD = penTool.generateSmoothPath(stroke.points);
  const isHighlighter = stroke.tool === 'highlighter' || stroke.isHighlighter;

  const startArrow = stroke.arrowStart
    ? penTool.getArrowHeadForStart(stroke.points, stroke.width)
    : null;
  const endArrow = stroke.arrowEnd
    ? penTool.getArrowHeadForEnd(stroke.points, stroke.width)
    : null;

  const strokeColor =
    stroke.effect === 'rainbow'
      ? 'url(#wbRainbowGradient)'
      : stroke.effect === 'galaxy'
      ? 'url(#wbGalaxyGradient)'
      : stroke.color;

  return (
    <g id={`stroke-${stroke.id}`}>
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={stroke.width}
        strokeLinecap={isHighlighter ? 'square' : 'round'}
        strokeLinejoin={isHighlighter ? 'bevel' : 'round'}
        opacity={isHighlighter ? (isDark ? 0.55 : 0.38) : 1.0}
        style={{
          mixBlendMode: isHighlighter ? (isDark ? 'screen' : 'multiply') : 'normal',
        }}
      />
      {startArrow && (
        <polyline
          points={`${startArrow.wing1.x},${startArrow.wing1.y} ${startArrow.tip.x},${startArrow.tip.y} ${startArrow.wing2.x},${startArrow.wing2.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {endArrow && (
        <polyline
          points={`${endArrow.wing1.x},${endArrow.wing1.y} ${endArrow.tip.x},${endArrow.tip.y} ${endArrow.wing2.x},${endArrow.wing2.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
});
RenderStroke.displayName = 'RenderStroke';

import { StickyNoteWidget } from '../components/canvas/StickyNoteWidget';
import { NoteGridWidget } from '../components/canvas/NoteGridWidget';
import { TextBoxWidget } from '../components/canvas/TextBoxWidget';
import { ShapeWidget } from '../components/canvas/ShapeWidget';
import { ReactionWidget } from '../components/canvas/ReactionWidget';
import { ImageWidget } from '../components/canvas/ImageWidget';
import { PDFDocumentWidget } from '../components/canvas/PDFDocumentWidget';

export const CanvasEntities: React.FC<CanvasEntitiesProps> = memo(({ entities }) => {
  const { isDark } = useTheme();
  // Separate highlighters (rendered underneath text/widgets) from foreground pen strokes
  const highlighterStrokes: InkStrokeEntity[] = [];
  const penStrokes: InkStrokeEntity[] = [];
  const otherEntities: CanvasEntity[] = [];

  for (const entity of entities) {
    if (entity.type === 'stroke') {
      const stroke = entity as InkStrokeEntity;
      if (stroke.isHighlighter || stroke.tool === 'highlighter') {
        highlighterStrokes.push(stroke);
      } else {
        penStrokes.push(stroke);
      }
    } else {
      otherEntities.push(entity);
    }
  }

  // Sort otherEntities by zIndex so locked images/documents (zIndex: 50) render first, then unlocked items
  otherEntities.sort((a, b) => (a.zIndex || 100) - (b.zIndex || 100));

  penStrokes.sort((a, b) => (a.zIndex || 200) - (b.zIndex || 200));

  return (
    <>
      {/* 1. Background Vector Highlighter Layer (Rendered beneath text widgets, zIndex: 90) */}
      {highlighterStrokes.length > 0 && (
        <svg
          id="highlighterLayerSvg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 90,
            mixBlendMode: isDark ? 'screen' : 'multiply',
          }}
        >
          {highlighterStrokes.map((stroke) => (
            <RenderStroke key={stroke.id} stroke={stroke} isDark={isDark} />
          ))}
        </svg>
      )}

      {/* 2. DOM Elements (Locked images, documents, shapes, sticky notes, note grids, text, reactions) */}
      {otherEntities.map((entity) => {
        switch (entity.type) {
          case 'note':
            return <StickyNoteWidget key={entity.id} note={entity} />;
          case 'noteGrid':
            return <NoteGridWidget key={entity.id} noteGrid={entity} />;
          case 'text':
            return <TextBoxWidget key={entity.id} textEntity={entity} />;
          case 'shape':
            return <ShapeWidget key={entity.id} shape={entity} />;
          case 'reaction':
            return <ReactionWidget key={entity.id} reaction={entity} />;
          case 'image':
            return <ImageWidget key={entity.id} image={entity} />;
          case 'pdf_document':
            return <PDFDocumentWidget key={entity.id} document={entity} />;
          default:
            return null;
        }
      })}

      {/* 3. Foreground Vector Pen Layer (Pen strokes, zIndex: 200 above widgets) */}
      {penStrokes.length > 0 && (
        <svg
          id="inkLayerSvg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        >
          <defs>
            <linearGradient id="wbRainbowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E71224" />
              <stop offset="20%" stopColor="#F36323" />
              <stop offset="40%" stopColor="#FED430" />
              <stop offset="60%" stopColor="#02A556" />
              <stop offset="80%" stopColor="#0069BF" />
              <stop offset="100%" stopColor="#914BB8" />
            </linearGradient>
            <linearGradient id="wbGalaxyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3C1053" />
              <stop offset="35%" stopColor="#AD217B" />
              <stop offset="70%" stopColor="#46CDCF" />
              <stop offset="100%" stopColor="#E1B12C" />
            </linearGradient>
          </defs>
          {penStrokes.map((stroke) => (
            <RenderStroke key={stroke.id} stroke={stroke} isDark={isDark} />
          ))}
        </svg>
      )}
    </>
  );
});
CanvasEntities.displayName = 'CanvasEntities';
