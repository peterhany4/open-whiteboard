import React from 'react';
import type { IconProps } from './types';

export const ExportIcon: React.FC<IconProps> = ({
  size = 20,
  color = 'currentColor',
  className = '',
  style = {},
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M10 3V13M10 3L6 7M10 3L14 7M4 11V16C4 16.5523 4.44772 17 5 17H15C15.5523 17 16 16.5523 16 16V11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
