import React, { useEffect } from 'react';
import { useBoardStore, boardStore } from '../../store/boardStore';
import { useTheme } from '../../theme';
import { BoardGalleryHeader } from './BoardGalleryHeader';
import { NewBoardCard } from './NewBoardCard';
import { BoardCard } from './BoardCard';
import { SearchIcon } from '../../assets/icons';

export const BoardGallery: React.FC = () => {
  const { searchQuery, isLoading } = useBoardStore();
  const { mode } = useTheme();

  useEffect(() => {
    boardStore.initialize();
  }, []);

  const filteredBoards = boardStore.getFilteredBoards();

  return (
    <div
      className="board-gallery-root"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: mode === 'Dark' ? '#181818' : '#F3F2F1',
        color: 'var(--wb-text-primary)',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* 1. Acrylic Top Bar with Logo & Search */}
      <BoardGalleryHeader />

      {/* 2. Main Gallery Master Content (Module 517955: boardListMaster) */}
      <main
        style={{
          flex: 1,
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '36px 40px 60px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Section Header: "Recent" (Module 517955: boardListHeader) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--wb-acrylic-border)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'var(--wb-text-primary)',
                letterSpacing: '-0.3px',
                margin: 0,
              }}
            >
              Recent Whiteboards
            </h1>
            {searchQuery && (
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--wb-text-secondary)',
                }}
              >
                Filtered by "{searchQuery}" ({filteredBoards.length} found)
              </span>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '320px',
              gap: '12px',
              color: 'var(--wb-text-secondary)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid rgba(0, 120, 212, 0.2)',
                borderTopColor: 'var(--wb-color-brand, #0078D4)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '14px' }}>Loading your whiteboards...</span>
          </div>
        ) : (
          /* Cards Grid (Module 31943 / 341474) */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
              width: '100%',
            }}
          >
            {/* Signature "+ Create new whiteboard" card (always first) */}
            <NewBoardCard />

            {/* Board cards */}
            {filteredBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}

        {/* Empty Search Results State */}
        {!isLoading && filteredBoards.length === 0 && searchQuery && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '16px',
              color: 'var(--wb-text-secondary)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor:
                  mode === 'Dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SearchIcon size={24} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--wb-text-primary)',
                  marginBottom: '4px',
                }}
              >
                No whiteboards found
              </div>
              <div style={{ fontSize: '13px' }}>
                We couldn't find any whiteboard matching "{searchQuery}"
              </div>
            </div>
            <button
              onClick={() => boardStore.setSearchQuery('')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--wb-color-brand, #0078D4)',
                backgroundColor: 'transparent',
                color: 'var(--wb-color-brand, #0078D4)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Clear filter
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
