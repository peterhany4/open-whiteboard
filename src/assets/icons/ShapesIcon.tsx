import React from 'react';
import type { IconProps } from './types';

export const ShapesIcon: React.FC<IconProps> = ({
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
        <>
          <path d="M2 7.5C2 4.46243 4.46243 2 7.5 2C10.369 2 12.725 4.19675 12.9776 7H10.5C8.567 7 7 8.567 7 10.5V12.9776C4.19675 12.725 2 10.369 2 7.5Z" />
          <path d="M10.5 8C9.11929 8 8 9.11929 8 10.5V15.5C8 16.8807 9.11929 18 10.5 18H15.5C16.8807 18 18 16.8807 18 15.5V10.5C18 9.11929 16.8807 8 15.5 8H10.5Z" />
        </>
      ) : (
        <>
          <path d="M7.5 3a4.5 4.5 0 014.47 4h1A5.5 5.5 0 107 12.98v-1A4.5 4.5 0 017.5 3z" />
          <path d="M10.5 8A2.5 2.5 0 008 10.5v5a2.5 2.5 0 002.5 2.5h5a2.5 2.5 0 002.5-2.5v-5A2.5 2.5 0 0015.5 8h-5zM9 10.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-5A1.5 1.5 0 019 15.5v-5z" />
        </>
      )}
    </svg>
  );
};
