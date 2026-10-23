/**
 * Microsoft Whiteboard — Interactive Acrylic Ruler Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 46977 (chunks/46977.*.js, lines 18-35)
 *     -> Ruler geometry: width 960px, height 120px (halfWidth: 60px)
 *     -> Compass protractor dial (64px diameter, radial 10° ticks, degree readout)
 *     -> Top & bottom ticks with userSpaceOnUse scale calibration
 *   - Module 57773: opacityUntouched: 0.9, opacityTouched: 0.75, height: 120, compassDiameter: 64
 *   - Module 671029: theme colors (acrylic background, border, tickMarkColor, angleTextColor)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { rulerEngine } from '../../tools/RulerEngine';
import type { RulerState } from '../../tools/RulerEngine';
import { useCanvasStore } from '../../store/canvasStore';
import { useTheme } from '../../theme/ThemeProvider';

export const RulerWidget: React.FC = () => {
  const [rulerState, setRulerState] = useState<RulerState>(() => rulerEngine.getState());
  const { camera } = useCanvasStore();
  const { isDark } = useTheme();

  const [isInteracting, setIsInteracting] = useState(false);
  const isDraggingBodyRef = useRef(false);
  const isRotatingDialRef = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialAngle: number }>({
    clientX: 0,
    clientY: 0,
    initialAngle: 0,
  });

  useEffect(() => {
    return rulerEngine.subscribe((state) => {
      setRulerState(state);
    });
  }, []);

  // 1. Mouse wheel rotation with 5° magnetic snapping
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Delta: 1 degree per wheel step, or 5 degrees with shift
      const delta = e.deltaY < 0 ? 1 : -1;
      const step = e.shiftKey ? delta * 5 : delta;
      rulerEngine.rotate(step, true);
    },
    []
  );

  // 2. Drag to move ruler body
  const handleBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingBodyRef.current = true;
      setIsInteracting(true);

      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initialAngle: rulerState.angle,
      };
    },
    [rulerState.angle]
  );

  // 3. Drag to rotate center protractor dial
  const handleDialPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isRotatingDialRef.current = true;
      setIsInteracting(true);

      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initialAngle: rulerState.angle,
      };
    },
    [rulerState.angle]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingBodyRef.current) {
        e.stopPropagation();
        e.preventDefault();

        const dx = (e.clientX - dragStartRef.current.clientX) / camera.scale;
        const dy = (e.clientY - dragStartRef.current.clientY) / camera.scale;

        dragStartRef.current.clientX = e.clientX;
        dragStartRef.current.clientY = e.clientY;

        rulerEngine.translate(dx, dy);
      } else if (isRotatingDialRef.current) {
        e.stopPropagation();
        e.preventDefault();

        // Calculate angular change based on vector from center of dial to pointer
        const dialCenterScreenX =
          camera.positionX + rulerState.x * camera.scale;
        const dialCenterScreenY =
          camera.positionY + rulerState.y * camera.scale;

        const currentRad = Math.atan2(
          e.clientY - dialCenterScreenY,
          e.clientX - dialCenterScreenX
        );
        const currentDeg = (currentRad * 180) / Math.PI;

        const startRad = Math.atan2(
          dragStartRef.current.clientY - dialCenterScreenY,
          dragStartRef.current.clientX - dialCenterScreenX
        );
        const startDeg = (startRad * 180) / Math.PI;

        const deltaDeg = currentDeg - startDeg;
        rulerEngine.setAngle(dragStartRef.current.initialAngle + deltaDeg);
      }
    },
    [camera, rulerState.x, rulerState.y]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingBodyRef.current || isRotatingDialRef.current) {
      e.stopPropagation();
      isDraggingBodyRef.current = false;
      isRotatingDialRef.current = false;
      setIsInteracting(false);

      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  }, []);

  if (!rulerState.isActive) {
    return null;
  }

  const { length, width, angle, x, y } = rulerState;
  const halfLen = length / 2;
  const halfWid = width / 2;

  // Themed colors (Module 671029)
  const acrylicBg = isDark
    ? isInteracting
      ? 'rgba(32, 32, 32, 0.85)'
      : 'rgba(36, 36, 36, 0.92)'
    : isInteracting
    ? 'rgba(240, 240, 240, 0.85)'
    : 'rgba(250, 250, 250, 0.92)';

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)';
  const tickColor = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.6)';
  const textColor = isDark ? '#FFFFFF' : '#1F1F1F';
  const dialAccent = '#0078D4';

  // Degree formatting (0° - 359°)
  const displayDegree = Math.round(((angle % 360) + 360) % 360);

  // Generate Inch tick marks for top edge (0 to 15 inches, 64px = 1 inch)
  const topTicks: React.ReactNode[] = [];
  const topLabels: React.ReactNode[] = [];
  const inchPx = 64;
  const totalInches = Math.floor(length / inchPx);

  for (let i = 0; i <= totalInches; i++) {
    const tickX = -halfLen + i * inchPx;
    // Major 1" tick
    topTicks.push(
      <line
        key={`inch-maj-${i}`}
        x1={tickX}
        y1={-halfWid}
        x2={tickX}
        y2={-halfWid + 20}
        stroke={tickColor}
        strokeWidth={1.5}
      />
    );
    topLabels.push(
      <text
        key={`inch-lbl-${i}`}
        x={tickX + 4}
        y={-halfWid + 32}
        fill={tickColor}
        fontSize="11"
        fontFamily="Segoe UI, sans-serif"
        style={{ userSelect: 'none' }}
      >
        {i}
      </text>
    );

    // Minor sub-inch ticks (1/4", 1/2", 3/4")
    if (i < totalInches) {
      topTicks.push(
        <line
          key={`inch-1/4-${i}`}
          x1={tickX + inchPx * 0.25}
          y1={-halfWid}
          x2={tickX + inchPx * 0.25}
          y2={-halfWid + 8}
          stroke={tickColor}
          strokeWidth={1}
        />,
        <line
          key={`inch-1/2-${i}`}
          x1={tickX + inchPx * 0.5}
          y1={-halfWid}
          x2={tickX + inchPx * 0.5}
          y2={-halfWid + 14}
          stroke={tickColor}
          strokeWidth={1.2}
        />,
        <line
          key={`inch-3/4-${i}`}
          x1={tickX + inchPx * 0.75}
          y1={-halfWid}
          x2={tickX + inchPx * 0.75}
          y2={-halfWid + 8}
          stroke={tickColor}
          strokeWidth={1}
        />
      );
    }
  }

  // Generate Metric cm/mm tick marks for bottom edge (0 to 24 cm, 40px = 1 cm)
  const bottomTicks: React.ReactNode[] = [];
  const bottomLabels: React.ReactNode[] = [];
  const cmPx = 40;
  const totalCm = Math.floor(length / cmPx);

  for (let c = 0; c <= totalCm; c++) {
    const tickX = -halfLen + c * cmPx;
    // Major 1cm tick
    bottomTicks.push(
      <line
        key={`cm-maj-${c}`}
        x1={tickX}
        y1={halfWid}
        x2={tickX}
        y2={halfWid - 18}
        stroke={tickColor}
        strokeWidth={1.5}
      />
    );
    bottomLabels.push(
      <text
        key={`cm-lbl-${c}`}
        x={tickX + 4}
        y={halfWid - 22}
        fill={tickColor}
        fontSize="11"
        fontFamily="Segoe UI, sans-serif"
        style={{ userSelect: 'none' }}
      >
        {c}
      </text>
    );

    // Minor mm ticks
    if (c < totalCm) {
      for (let m = 1; m < 10; m++) {
        const subX = tickX + (c === totalCm ? 0 : (m * cmPx) / 10);
        const tickH = m === 5 ? 12 : 7;
        bottomTicks.push(
          <line
            key={`cm-sub-${c}-${m}`}
            x1={subX}
            y1={halfWid}
            x2={subX}
            y2={halfWid - tickH}
            stroke={tickColor}
            strokeWidth={1}
          />
        );
      }
    }
  }

  // Radial ticks for protractor dial (every 10° around 360°, major at 90° quadrants)
  const dialRadius = 36;
  const compassTicks: React.ReactNode[] = [];
  for (let d = 0; d < 360; d += 10) {
    const rad = (d * Math.PI) / 180;
    const isQuadrant = d % 90 === 0;
    const isMajor = d % 45 === 0;
    const tickLen = isQuadrant ? 10 : isMajor ? 7 : 5;
    const r1 = dialRadius;
    const r2 = dialRadius - tickLen;

    compassTicks.push(
      <line
        key={`compass-${d}`}
        x1={r1 * Math.cos(rad)}
        y1={r1 * Math.sin(rad)}
        x2={r2 * Math.cos(rad)}
        y2={r2 * Math.sin(rad)}
        stroke={isQuadrant ? dialAccent : tickColor}
        strokeWidth={isQuadrant ? 2 : 1}
      />
    );
  }

  return (
    <div
      id="wb-ruler-widget"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg)`,
        transformOrigin: '0 0',
        zIndex: 500,
        cursor: isInteracting ? 'grabbing' : 'grab',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Ruler Body SVG Container */}
      <svg
        id="wb-ruler-svg"
        width={length}
        height={width}
        viewBox={`${-halfLen} ${-halfWid} ${length} ${width}`}
        style={{
          position: 'absolute',
          left: -halfLen,
          top: -halfWid,
          overflow: 'visible',
          filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.25))',
        }}
      >
        <defs>
          <filter id="rulerBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>

        {/* Acrylic Ruler Body */}
        <rect
          id="wb-ruler-body"
          x={-halfLen}
          y={-halfWid}
          width={length}
          height={width}
          rx={6}
          ry={6}
          fill={acrylicBg}
          stroke={borderColor}
          strokeWidth={1.5}
          onPointerDown={handleBodyPointerDown}
          style={{
            backdropFilter: 'blur(20px)',
            transition: 'fill 0.15s ease',
          }}
        />

        {/* Magnetic Edge Guides (visual indication for Top and Bottom snapping lines) */}
        <line
          x1={-halfLen + 8}
          y1={-halfWid + 1}
          x2={halfLen - 8}
          y2={-halfWid + 1}
          stroke={dialAccent}
          strokeWidth={1.5}
          opacity={0.4}
        />
        <line
          x1={-halfLen + 8}
          y1={halfWid - 1}
          x2={halfLen - 8}
          y2={halfWid - 1}
          stroke={dialAccent}
          strokeWidth={1.5}
          opacity={0.4}
        />

        {/* Top Edge Inch Ticks & Labels */}
        <g id="wb-ruler-top-ticks">{topTicks}</g>
        <g id="wb-ruler-top-labels">{topLabels}</g>

        {/* Bottom Edge Metric Ticks & Labels */}
        <g id="wb-ruler-bottom-ticks">{bottomTicks}</g>
        <g id="wb-ruler-bottom-labels">{bottomLabels}</g>

        {/* Center Protractor Dial Group */}
        <g
          id="wb-ruler-dial"
          onPointerDown={handleDialPointerDown}
          style={{ cursor: 'pointer' }}
        >
          {/* Outer dial ring */}
          <circle
            cx={0}
            cy={0}
            r={dialRadius + 2}
            fill={isDark ? 'rgba(45, 45, 45, 0.95)' : 'rgba(255, 255, 255, 0.95)'}
            stroke={dialAccent}
            strokeWidth={1.5}
          />

          {/* Radial compass tick marks */}
          {compassTicks}

          {/* Inner readout circle */}
          <circle
            cx={0}
            cy={0}
            r={dialRadius - 14}
            fill={isDark ? '#1F1F1F' : '#FFFFFF'}
            stroke={borderColor}
            strokeWidth={1}
          />

          {/* Angle degree readout (Segoe UI, 0°–359°) */}
          <text
            x={-1}
            y={1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={textColor}
            fontSize="14"
            fontWeight="600"
            fontFamily="'Segoe UI Variable Display', 'Segoe UI', sans-serif"
            style={{ userSelect: 'none' }}
          >
            {displayDegree}°
          </text>
        </g>
      </svg>
    </div>
  );
};
