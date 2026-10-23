import React from 'react';
import type { IconProps } from './types';

export const SearchIcon: React.FC<IconProps> = ({
  size = 20,
  color = 'currentColor',
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
      <path
        d="M8.5 3a5.5 5.5 0 0 1 4.227 9.02l4.126 4.127a.75.75 0 0 1-.976 1.133l-.084-.073-4.127-4.126A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
        fill={color}
      />
    </svg>
  );
};
