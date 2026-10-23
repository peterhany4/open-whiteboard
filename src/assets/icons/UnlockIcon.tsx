import React from 'react';
import type { IconProps } from './types';

export const UnlockIcon: React.FC<IconProps> = ({
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
        d="M6 8V6C6 3.79086 7.79086 2 10 2C12.2091 2 14 3.79086 14 6M5 8H15C16.1046 8 17 8.89543 17 10V16C17 17.1046 16.1046 18 15 18H5C3.89543 18 3 17.1046 3 16V10C3 8.89543 3.89543 8 5 8ZM10 12V14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
