import React, { memo, useState, useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useTheme } from '../theme/ThemeProvider';
import {
  GRID_DIMENSIONS,
  getEffectiveGridPattern,
  calculateGridTransform,
  calculateGridDimensions,
  getGridColors,
} from './grid';
import type { GridPatternType } from './grid';

interface PatternDefsProps {
  patternType: GridPatternType;
  patternId: string;
  baseColor: string;
  accentColor: string;
}

const PatternDefs: React.FC<PatternDefsProps> = memo(
  ({ patternType, patternId, baseColor, accentColor }) => {
    switch (patternType) {
      case 'Dot':
        return (
          <pattern
            id={patternId}
            width={16}
            height={16}
            x={12}
            y={12}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={4} cy={4} r={1.0} strokeWidth={0} fill={baseColor} />
          </pattern>
        );

      case 'Cubic':
        return (
          <pattern
            id={patternId}
            width={16}
            height={16}
            patternUnits="userSpaceOnUse"
            fill="none"
          >
            <rect
              width={16}
              height={16}
              stroke={baseColor}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          </pattern>
        );

      case 'Graph':
        return (
          <pattern
            id={patternId}
            width={36}
            height={36}
            y={-0.15}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={36}
              height={36}
              fill="none"
              stroke={accentColor}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <rect width={36} height={34} strokeWidth={0} fill={`url(#${patternId}_h)`} />
            <rect width={34} height={36} strokeWidth={0} fill={`url(#${patternId}_v)`} />
            <pattern
              id={`${patternId}_h`}
              width={36}
              height={6}
              patternUnits="userSpaceOnUse"
              strokeWidth={0.5}
              stroke={baseColor}
            >
              <polyline points="0,6 36,6" />
            </pattern>
            <pattern
              id={`${patternId}_v`}
              width={6}
              height={36}
              patternUnits="userSpaceOnUse"
              strokeWidth={0.5}
              stroke={baseColor}
            >
              <polyline points="6,0 6,36" />
            </pattern>
          </pattern>
        );

      case 'CubicDot':
        return (
          <pattern
            id={patternId}
            width={44}
            height={44}
            patternUnits="userSpaceOnUse"
            x={22}
            y={22}
          >
            <circle cx={22} cy={22} r={1.75} strokeWidth={0} fill={accentColor} />
            <polyline points="0,22 44,22" stroke={baseColor} strokeWidth={1} />
            <polyline points="22,0 22,44" stroke={baseColor} strokeWidth={1} />
          </pattern>
        );

      case 'CompactRule':
        return (
          <pattern
            id={patternId}
            width={13.5}
            height={13.5}
            patternUnits="userSpaceOnUse"
          >
            <polyline points="0,0 13.5,0" strokeWidth={1.5} stroke={accentColor} />
            <polyline points="0,6.75 13.5,6.75" strokeWidth={0.75} stroke={baseColor} />
          </pattern>
        );

      case 'WideRule':
        return (
          <pattern
            id={patternId}
            width={44}
            height={44}
            patternUnits="userSpaceOnUse"
            y={-1}
          >
            <polyline points="0,0 44,0" strokeWidth={1.5} stroke={accentColor} />
          </pattern>
        );

      case 'SlantedCubic': {
        const ht = 2 * Math.sqrt(128); // ~22.6274px
        return (
          <pattern
            id={patternId}
            width={ht}
            height={ht}
            patternUnits="userSpaceOnUse"
            stroke={baseColor}
            strokeWidth={1}
          >
            <polyline points={`0,0 ${ht},${ht}`} />
            <polyline points={`0,${ht} ${ht},0`} />
          </pattern>
        );
      }

      case 'Triangular': {
        const yt = 16;
        const Ct = yt / (2 * Math.sin(Math.PI / 3)); // ~9.2376px
        return (
          <pattern
            id={patternId}
            width={Ct}
            height={yt}
            patternUnits="userSpaceOnUse"
            stroke={baseColor}
            strokeWidth={0.75}
            fill="none"
            x={4}
          >
            <polyline points={`0,0 ${Ct},0`} />
            <polyline
              points={`0,8 ${Ct / 2},0 ${Ct},8\n\t\t\t\t\t\t${Ct / 2},16 0,8 ${Ct},8`}
            />
            <polyline points={`0,16 ${Ct},16`} />
          </pattern>
        );
      }

      case 'Neutral':
      default:
        return <pattern id={patternId} />;
    }
  }
);
PatternDefs.displayName = 'PatternDefs';

export const GridBackground: React.FC = memo(() => {
  const { camera, gridPattern } = useCanvasStore();
  const { mode } = useTheme();

  // Mode-driven colors: pure white / deep slate with crisp high-contrast lines
  const colors = getGridColors(mode);

  // Dynamic viewport tracking
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    function handleResize() {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine effective pattern with threshold suppression (< 0.2 scale)
  const effectivePattern = getEffectiveGridPattern(gridPattern, camera.scale);
  const dimensions = GRID_DIMENSIONS[effectivePattern];

  // Viewport & Transform geometry (Module 897381)
  const transform = calculateGridTransform(camera, dimensions, true);
  const size = calculateGridDimensions(
    viewportSize.width,
    viewportSize.height,
    camera.scale,
    dimensions
  );

  const patternId = `wb_grid_${effectivePattern}`;
  const defsClassName =
    effectivePattern === 'Dot'
      ? 'canvasBackgroundDotGridExperiment'
      : 'canvasBackgroundGrid';

  return (
    <svg
      className="canvasBackground"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
      version="1.1"
      role="presentation"
      data-grid-width={dimensions.width}
      data-grid-height={dimensions.height}
    >
      <defs className={defsClassName}>
        <PatternDefs
          patternType={effectivePattern}
          patternId={patternId}
          baseColor={colors.base}
          accentColor={colors.accent}
        />
      </defs>
      <rect
        className="canvasBackgroundColor"
        width="100%"
        height="100%"
        fill={colors.background}
      />
      {effectivePattern !== 'Neutral' && (
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      )}
    </svg>
  );
});
GridBackground.displayName = 'GridBackground';
