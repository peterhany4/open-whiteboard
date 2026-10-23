import React from 'react';
import type { IconProps } from './types';

export const CursorIcon: React.FC<IconProps> = ({
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
        <path d="M6.63564 2.28741C5.98325 1.75025 5 2.21432 5 3.0594V17.0582C5 17.9843 6.15025 18.4129 6.75622 17.7125L10.2799 13.6401C10.5648 13.3108 10.9788 13.1216 11.4142 13.1216L17.0061 13.1216C17.9444 13.1216 18.3661 11.946 17.6418 11.3496L6.63564 2.28741Z" />
      ) : (
        <path d="M5 3.30934C5 2.46426 5.98325 2.00019 6.63564 2.53735L17.6418 11.5995C18.3661 12.1959 17.9444 13.3715 17.0061 13.3715H11.4142C10.9788 13.3715 10.5648 13.5607 10.2799 13.89L6.75622 17.9625C6.15025 18.6628 5 18.2343 5 17.3081L5 3.30934ZM17.0061 12.3715L6 3.30934L6 17.3081L9.52369 13.2357C9.99856 12.6869 10.6885 12.3715 11.4142 12.3715H17.0061Z" />
      )}
    </svg>
  );
};
