import React from 'react';
import type { IconProps } from './types';

export const ImageIcon: React.FC<IconProps> = ({
  size = 20,
  color = 'currentColor',
  filled = false,
  className,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {filled ? (
        <path d="M4 6c0-1.1.9-2 2-2h8a2 2 0 012 2v8a2 2 0 01-.99 1.73l-4.66-4.58a.5.5 0 00-.7 0l-4.66 4.58A1.99 1.99 0 004 14V6zm9 1.5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      ) : (
        <path d="M14 7.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-1 0a.5.5 0 10-1 0 .5.5 0 001 0zM3 6a3 3 0 013-3h8a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm3-2a2 2 0 00-2 2v8c0 .37.1.72.28 1.02l4.67-4.59a1.5 1.5 0 012.1 0l4.67 4.59c.18-.3.28-.65.28-1.02V6a2 2 0 00-2-2H6zm0 12h8a2 2 0 001.01-.27l-4.66-4.58a.5.5 0 00-.7 0l-4.66 4.58A2 2 0 006 16z" />
      )}
    </svg>
  );
};
