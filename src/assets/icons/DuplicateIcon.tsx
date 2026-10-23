import React from 'react';
import type { IconProps } from './types';

export const DuplicateIcon: React.FC<IconProps> = ({
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
        d="M6 3.5A2.5 2.5 0 0 1 8.5 1h6A2.5 2.5 0 0 1 17 3.5v7a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 6 10.5v-7ZM8.5 2A1.5 1.5 0 0 0 7 3.5v7A1.5 1.5 0 0 0 8.5 12h6a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 2h-6Z"
        fill={color}
      />
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h.25a.5.5 0 0 1 0 1H5.5A1.5 1.5 0 0 0 4 6.5v7A1.5 1.5 0 0 0 5.5 15h6a1.5 1.5 0 0 0 1.5-1.5v-.25a.5.5 0 0 1 1 0v.25a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 3 13.5v-7Z"
        fill={color}
      />
    </svg>
  );
};
