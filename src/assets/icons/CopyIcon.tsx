import React from 'react';
import type { IconProps } from './types';

export const CopyIcon: React.FC<IconProps> = ({
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
        d="M6 2.5A1.5 1.5 0 0 1 7.5 1h7A1.5 1.5 0 0 1 16 2.5v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 6 11.5v-9Zm1.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-7Z"
        fill={color}
      />
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h.25a.5.5 0 0 1 0 1H5.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-.25a.5.5 0 0 1 1 0v.25A1.5 1.5 0 0 1 12.5 16h-7A1.5 1.5 0 0 1 4 14.5v-9Z"
        fill={color}
      />
    </svg>
  );
};
