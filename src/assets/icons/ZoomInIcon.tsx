import React from 'react';
import type { IconProps } from './types';

export const ZoomInIcon: React.FC<IconProps> = ({
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
      <path d="M8.5 5.5c.28 0 .5.22.5.5v2h2a.5.5 0 0 1 0 1H9v2a.5.5 0 0 1-1 0V9H6a.5.5 0 0 1 0-1h2V6c0-.28.22-.5.5-.5Zm0-3.5a6.5 6.5 0 0 1 4.94 10.73l3.41 3.42a.5.5 0 0 1-.63.76l-.07-.06-3.42-3.41A6.5 6.5 0 1 1 8.5 2Zm0 1a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
    </svg>
  );
};
