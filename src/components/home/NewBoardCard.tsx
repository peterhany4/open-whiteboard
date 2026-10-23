import React, { useState } from 'react';
import { boardStore } from '../../store/boardStore';
import { useTheme } from '../../theme';

export const NewBoardCard: React.FC = () => {
  const { mode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await boardStore.createNewBoard();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Create new whiteboard"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '240px',
        borderRadius: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        backgroundColor:
          mode === 'Dark'
            ? isHovered
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(255, 255, 255, 0.04)'
            : isHovered
            ? '#FFFFFF'
            : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isHovered
          ? '2px solid var(--wb-color-brand, #0078D4)'
          : mode === 'Dark'
          ? '1.5px dashed rgba(255, 255, 255, 0.18)'
          : '1.5px dashed rgba(0, 0, 0, 0.18)',
        boxShadow: isHovered
          ? '0 8px 24px rgba(0, 120, 212, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)'
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: '20px',
        boxSizing: 'border-box',
        outline: 'none',
      }}
    >
      {/* Plus Outside Circle (Module 305331: newBoardButtonPlusOutside) */}
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: isHovered
            ? 'var(--wb-color-brand, #0078D4)'
            : mode === 'Dark'
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(0, 120, 212, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: isHovered
            ? '0 4px 12px rgba(0, 120, 212, 0.35)'
            : 'none',
          transition: 'all 0.2s ease',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            fill: isHovered
              ? '#FFFFFF'
              : mode === 'Dark'
              ? 'rgba(255, 255, 255, 0.9)'
              : 'var(--wb-color-brand, #0078D4)',
            transition: 'fill 0.2s ease',
          }}
        >
          {/* Authentic MS Whiteboard Add Icon path */}
          <path d="M21 10H12V1C12 0.447 11.553 0 11 0C10.447 0 10 0.447 10 1V10H1C0.447 10 0 10.447 0 11C0 11.553 0.447 12 1 12H10V21C10 21.553 10.447 22 11 22C11.553 22 12 21.553 12 21V12H21C21.553 12 22 11.553 22 11C22 10.447 21.553 10 21 10Z" />
        </svg>
      </div>

      {/* Caption (Module 305331: newBoardButtonCaption) */}
      <span
        style={{
          fontSize: '14.5px',
          fontWeight: 600,
          color: isHovered ? 'var(--wb-color-brand, #0078D4)' : 'var(--wb-text-primary)',
          letterSpacing: '-0.1px',
          transition: 'color 0.2s ease',
        }}
      >
        {isCreating ? 'Creating whiteboard...' : 'Create new whiteboard'}
      </span>

      <span
        style={{
          fontSize: '12px',
          color: 'var(--wb-text-secondary)',
          marginTop: '6px',
        }}
      >
        Start from a blank canvas
      </span>
    </div>
  );
};
