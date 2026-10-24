import React from 'react';
import type { IconProps } from './types';

interface HighlighterIconProps extends IconProps {
  highlighterColor?: string;
}

/**
 * Open Whiteboard — Authentic Wide-Body Chisel Highlighter Icon
 * Reverse-Engineered from Module 40049 & Fluent System Icons
 * Features:
 * - Wide rectangular fluorescent marker barrel with beveled shoulders
 * - Distinct 45-degree angled chisel-cut fluorescent marker nib
 * - Fluorescent marker tip accent
 * - Wide translucent base highlight swatch stroke
 */
export const HighlighterIcon: React.FC<HighlighterIconProps> = ({
  size = 20,
  color = 'currentColor',
  highlighterColor = '#FCFC00',
  className,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* 1. Wide-Body Fluorescent Marker Barrel, Cap Seam & Collar */}
      <path
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.8536 1.14645C14.6346 0.365398 15.901 0.365398 16.682 1.14645L18.8536 3.31802C19.6346 4.09907 19.6346 5.3654 18.8536 6.14645L15.3536 9.64645C15.166 9.83399 14.9117 9.93934 14.6464 9.93934L13.5 9.93934L10.3536 13.0858C10.166 13.2733 9.91169 13.3787 9.64645 13.3787L8.5 13.3787C8.23476 13.3787 7.98045 13.2733 7.79289 13.0858L6.91421 12.2071C6.72665 12.0195 6.62132 11.7652 6.62132 11.5L6.62132 10.3536C6.62132 10.0883 6.72665 9.83399 6.91421 9.64645L10.0607 6.5L10.0607 5.35355C10.0607 5.08831 10.166 4.83401 10.3536 4.64645L13.8536 1.14645ZM15.9749 2.56066C15.5844 2.17014 14.9512 2.17014 14.5607 2.56066L11.5 5.62132L11.5 6.75L8.03553 10.2145L8.03553 11.3787L8.62132 11.9645L12.0858 8.5L13.2145 8.5L17.4393 4.27513C17.8299 3.8846 17.8299 3.25144 17.4393 2.86091L15.9749 2.56066Z"
      />

      {/* 2. Distinct 45-Degree Angled Chisel-Cut Fluorescent Nib */}
      <path
        fill={highlighterColor}
        d="M7.70711 10.7929L9.20711 12.2929L7.20711 14.2929C7.01955 14.4804 6.76524 14.5858 6.5 14.5858L4.25 14.5858L3.25 13.5858L3.25 11.3358C3.25 11.0705 3.35536 10.8162 3.54289 10.6287L5.54289 8.62868L7.04289 10.1287L6.25 10.9216L5.5 11.6716L5.5 12.3358L6.16421 12.3358L6.91421 11.5858L7.70711 10.7929Z"
      />

      {/* 3. Authentic Fluent Base Highlight Swatch Stroke */}
      <rect
        x="2.5"
        y="16.5"
        width="15"
        height="2.5"
        rx="1.25"
        fill={highlighterColor}
        opacity={0.88}
      />
    </svg>
  );
};
