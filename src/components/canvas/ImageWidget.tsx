/**
 * Open Whiteboard — Image & Document Canvas Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 93425 (blueboard/chunks/93425.*.js, lines 67-68)
 *   -> Canvas child stamp type: Image
 *   -> "Lock to Background" (isLockedToBackground) anchor below inking layer (zIndex: 50)
 *   -> Immunity to lasso selection & eraser clipping while allowing seamless drawing over diagrams
 * - Module 84781932 (chunks/BoardEditorComponent-84781932.*.js)
 *   -> Selection handles, aspect-ratio scaling, and contextual action bar
 */

import React, { memo, useState } from 'react';
import type { ImageEntity } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { historyManager } from '../../canvas/history';
import { LockIcon, UnlockIcon } from '../../assets/icons';

interface ImageWidgetProps {
  image: ImageEntity;
}

export const ImageWidget: React.FC<ImageWidgetProps> = memo(({ image }) => {
  const { isSelected: checkIsSelected } = useSelectionStore();
  const isSelected = checkIsSelected(image.id);
  const [isHovered, setIsHovered] = useState(false);

  const isLocked = Boolean(image.isLockedToBackground || image.isLocked);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) {
      // In locked mode, pointer clicks pass through so drawing over the image is effortless
      return;
    }

    if (e.button === 0) {
      e.stopPropagation();
      const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
      selectionStore.select(image.id, isShift);
    }
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const willBeLocked = !isLocked;
    const prevLocked = isLocked;
    const prevZIndex = image.zIndex;
    const newZIndex = willBeLocked ? 50 : 100;

    historyManager.execute({
      name: willBeLocked ? 'Lock to Background' : 'Unlock from Background',
      execute: () => {
        sceneStore.updateEntity(
          image.id,
          {
            isLockedToBackground: willBeLocked,
            isLocked: willBeLocked,
            zIndex: newZIndex,
          },
          true
        );
        if (willBeLocked) {
          selectionStore.deselect(image.id);
        } else {
          selectionStore.select(image.id);
        }
      },
      undo: () => {
        sceneStore.updateEntity(
          image.id,
          {
            isLockedToBackground: prevLocked,
            isLocked: prevLocked,
            zIndex: prevZIndex,
          },
          true
        );
        if (prevLocked) {
          selectionStore.deselect(image.id);
        } else {
          selectionStore.select(image.id);
        }
      },
    });
  };

  return (
    <div
      id={`image-${image.id}`}
      style={{
        position: 'absolute',
        left: `${image.x}px`,
        top: `${image.y}px`,
        width: `${image.width}px`,
        height: `${image.height}px`,
        zIndex: isLocked ? 50 : (image.zIndex || 100),
        pointerEvents: isLocked ? (isHovered ? 'auto' : 'none') : 'auto',
        borderRadius: '6px',
        userSelect: 'none',
        boxShadow: isLocked
          ? '0 1px 3px rgba(0, 0, 0, 0.08)'
          : isSelected
          ? 'none'
          : 'var(--shadow8, 0 4px 12px rgba(0, 0, 0, 0.12))',
        border: isLocked
          ? '1px dashed rgba(0, 0, 0, 0.15)'
          : isSelected
          ? 'none'
          : '1px solid rgba(0, 0, 0, 0.06)',
        backgroundColor: '#FFFFFF',
        transition: 'box-shadow 0.15s ease',
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        handleToggleLock(e);
      }}
    >
      <img
        src={image.src}
        alt={image.fileName || 'Canvas Image'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
          borderRadius: '5px',
        }}
        draggable={false}
      />

      {/* Locked to Background indicator badge & quick unlock button */}
      {isLocked && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            fontSize: '11px',
            fontWeight: 600,
            color: '#323130',
            pointerEvents: 'auto',
            cursor: 'default',
            animation: 'wbFadeIn 0.12s ease',
          }}
        >
          <LockIcon size={14} color="#0078D4" />
          <span>Locked to Background</span>
          <button
            onClick={handleToggleLock}
            title="Unlock from background to move, resize, or delete"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0078D4',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#106EBE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0078D4')}
          >
            <UnlockIcon size={12} color="#FFFFFF" />
            <span>Unlock</span>
          </button>
        </div>
      )}

      {/* Unlocked quick "Lock to Background" badge when hovered and not selected */}
      {!isLocked && isHovered && !isSelected && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={handleToggleLock}
            title="Lock to Background: Anchor below ink layer and draw effortlessly over this image"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#323130',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0078D4';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.92)';
              e.currentTarget.style.color = '#323130';
            }}
          >
            <LockIcon size={13} />
            <span>Lock to Background</span>
          </button>
        </div>
      )}
    </div>
  );
});
ImageWidget.displayName = 'ImageWidget';
