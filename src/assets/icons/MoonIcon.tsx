import React from 'react';
import type { IconProps } from './types';

export const MoonIcon: React.FC<IconProps> = ({
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
      <path d="M12.025 2.052A7.999 7.999 0 0 0 9.5 17.5a8.03 8.03 0 0 0 8.005-7.552 8.033 8.033 0 0 1-5.48-7.896ZM8.5 16.5A6.999 6.999 0 0 1 11.025 3.06a9.034 9.034 0 0 0 5.467 7.962A7.03 7.03 0 0 1 8.5 16.5Z" />
    </svg>
  );
};
