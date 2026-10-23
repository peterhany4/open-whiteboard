import React from 'react';
import type { IconProps } from './types';

export const EditIcon: React.FC<IconProps> = ({
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
        d="M13.887 2.113a2.25 2.25 0 0 1 3.182 3.182l-9.043 9.043a1.5 1.5 0 0 1-.62.378l-4.148 1.276a.5.5 0 0 1-.625-.625l1.276-4.148a1.5 1.5 0 0 1 .378-.62l9.043-9.043l.957-.043Zm2.475.707a1.25 1.25 0 0 0-1.768 0l-1.02 1.02l1.768 1.768l1.02-1.02a1.25 1.25 0 0 0 0-1.768Zm-3.495 2.495L4.475 13.707a.5.5 0 0 0-.126.207l-.986 3.208l3.208-.987a.5.5 0 0 0 .207-.126l8.392-8.392l-2.303-2.302Z"
        fill={color}
      />
    </svg>
  );
};
