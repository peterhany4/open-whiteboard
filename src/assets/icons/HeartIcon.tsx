import React from 'react';
import type { IconProps } from './types';

export const HeartIcon: React.FC<IconProps> = ({
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
        <path d="M10 4.15c-1.35-2.2-4.5-2.2-6.1-.6-1.6 1.6-1.6 4.2 0 5.8l6.1 6.1 6.1-6.1c1.6-1.6 1.6-4.2 0-5.8-1.6-1.6-4.75-1.6-6.1.6Z" />
      ) : (
        <path d="M10 4.88c-1.2-1.95-3.9-1.95-5.38-.47-1.48 1.48-1.48 3.9 0 5.38l5.38 5.38 5.38-5.38c1.48-1.48 1.48-3.9 0-5.38-1.48-1.48-4.18-1.48-5.38.47Zm-.7-1.18a4.8 4.8 0 0 1 6.78 0c1.87 1.87 1.87 4.9 0 6.78l-5.74 5.74a.5.5 0 0 1-.7 0l-5.74-5.74a4.8 4.8 0 0 1 0-6.78 4.8 4.8 0 0 1 6.78 0l.31.31.31-.31Z" />
      )}
    </svg>
  );
};
