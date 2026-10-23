import React from 'react';
import type { IconProps } from './types';

export const MoreIcon: React.FC<IconProps> = ({
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
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M6 10C6 10.6904 5.44036 11.25 4.75 11.25C4.05964 11.25 3.5 10.6904 3.5 10C3.5 9.30964 4.05964 8.75 4.75 8.75C5.44036 8.75 6 9.30964 6 10Z" />
      <path d="M11.25 10C11.25 10.6904 10.6904 11.25 10 11.25C9.30964 11.25 8.75 10.6904 8.75 10C8.75 9.30964 9.30964 8.75 10 8.75C10.6904 8.75 11.25 9.30964 11.25 10Z" />
      <path d="M15.25 11.25C15.9404 11.25 16.5 10.6904 16.5 10C16.5 9.30964 15.9404 8.75 15.25 8.75C14.5596 8.75 14 9.30964 14 10C14 10.6904 14.5596 11.25 15.25 11.25Z" />
    </svg>
  );
};
