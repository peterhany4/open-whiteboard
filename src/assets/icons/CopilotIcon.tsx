import React from 'react';
import type { IconProps } from './types';

export const CopilotIcon: React.FC<IconProps> = ({
  size = 20,
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
        fill="url(#CopilotColorful_svg__a)"
        d="M14.144 3.35a1.875 1.875 0 0 0-1.8-1.35h-.601c-.896 0-1.667.634-1.84 1.513L8.853 8.85l.298-.959c.243-.785.97-1.32 1.79-1.32h3.294l1.4 1.172 1.247-1.172h-.392c-.833 0-1.566-.55-1.8-1.349l-.546-1.873Z"
      />
      <path
        fill="url(#CopilotColorful_svg__b)"
        d="M6.05 16.643A1.875 1.875 0 0 0 7.85 18h1.224c1.01 0 1.838-.8 1.874-1.808l.18-5.05-.287.953a1.875 1.875 0 0 1-1.795 1.333H5.734l-1.384-.885-1.022.885h.385c.836 0 1.571.554 1.802 1.357l.534 1.858Z"
      />
      <path
        fill="url(#CopilotColorful_svg__c)"
        d="M12.25 2H5.686c-1.875 0-3 2.397-3.75 4.795-.889 2.84-2.051 6.64 1.312 6.64H6.11c.833 0 1.564-.547 1.8-1.345.494-1.67 1.354-4.568 2.03-6.776.345-1.126.632-2.092 1.072-2.694.247-.337.66-.62 1.237-.62Z"
      />
      <path
        fill="url(#CopilotColorful_svg__e)"
        d="M7.748 18h6.562c1.876 0 3-2.397 3.75-4.794.889-2.84 2.052-6.637-1.312-6.637h-2.861c-.832 0-1.564.547-1.8 1.344a798.705 798.705 0 0 1-2.03 6.774c-.344 1.125-.631 2.091-1.072 2.693-.247.337-.659.62-1.237.62Z"
      />
      <defs>
        <radialGradient
          id="CopilotColorful_svg__a"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="rotate(-129.141 9.971 .712) scale(7.20751 6.76953)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.096" stopColor="#00AEFF" />
          <stop offset="0.773" stopColor="#2253CE" />
          <stop offset="1" stopColor="#0736C4" />
        </radialGradient>
        <radialGradient
          id="CopilotColorful_svg__b"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(4.0792 5.17124 -5.02078 3.9605 4.743 13.4)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFB657" />
          <stop offset="0.634" stopColor="#FF5F3D" />
          <stop offset="0.923" stopColor="#C02B3C" />
        </radialGradient>
        <radialGradient
          id="CopilotColorful_svg__e"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-5.18437 14.3365 -17.62744 -6.37443 17.085 5.45)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.066" stopColor="#8C48FF" />
          <stop offset="0.5" stopColor="#F2598A" />
          <stop offset="0.896" stopColor="#FFB152" />
        </radialGradient>
        <linearGradient
          id="CopilotColorful_svg__c"
          x1="5.294"
          x2="6.171"
          y1="3.385"
          y2="13.87"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.156" stopColor="#0D91E1" />
          <stop offset="0.487" stopColor="#52B471" />
          <stop offset="0.652" stopColor="#98BD42" />
          <stop offset="0.937" stopColor="#FFC800" />
        </linearGradient>
      </defs>
    </svg>
  );
};
