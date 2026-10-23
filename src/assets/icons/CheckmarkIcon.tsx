import React from 'react';
import type { IconProps } from './types';

export const CheckmarkIcon: React.FC<IconProps> = ({
  size = 20,
  color = 'currentColor',
  className,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 2048 2048"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M1837 557 768 1627l-557-558 90-90 467 466 979-978 90 90z" />
    </svg>
  );
};
