import React from 'react';
import type { IconProps } from './types';

interface HighlighterIconProps extends IconProps {
  highlighterColor?: string;
}

export const HighlighterIcon: React.FC<HighlighterIconProps> = ({
  size = 20,
  color = 'currentColor',
  highlighterColor = '#FCFC00',
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
      <path
        d="M12.793 2.293a1 1 0 0 1 1.414 0l3.5 3.5a1 1 0 0 1 0 1.414l-7.5 7.5a1 1 0 0 1-.46.263l-5 1.5a1 1 0 0 1-1.25-1.25l1.5-5a1 1 0 0 1 .263-.46l7.533-7.467ZM13.5 4.414L6.914 11l-.893 2.978 2.979-.893L15.586 6.5 13.5 4.414Z"
      />
      <path
        fill={highlighterColor}
        opacity={0.8}
        d="M3 17.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5Z"
      />
    </svg>
  );
};
