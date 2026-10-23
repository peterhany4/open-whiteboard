import React from 'react';
import type { IconProps } from './types';

export const ThumbLikeIcon: React.FC<IconProps> = ({
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
        <path d="M4.5 8.5v8a1 1 0 0 0 1 1h8.2a2 2 0 0 0 1.9-1.4l1.8-5.4a2 2 0 0 0 .1-.7V9a2 2 0 0 0-2-2h-3.8l.6-2.8.1-.4a1.5 1.5 0 0 0-.4-1.1L10.3 2 6.1 6.2A2 2 0 0 0 5.5 7.6V8.5H4.5Z" />
      ) : (
        <path d="M5.5 7.63v8.87H13.7a1.5 1.5 0 0 0 1.42-1.04l1.8-5.4A1 1 0 0 0 17 9.5V9a1 1 0 0 0-1-1h-4.32l.74-3.53a.5.5 0 0 0-.15-.47L10.3 2 6.55 5.75c-.67.67-1.05 1.58-1.05 2.53v-.65ZM4.5 8.5v8H3a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1h1.5Z" />
      )}
    </svg>
  );
};
