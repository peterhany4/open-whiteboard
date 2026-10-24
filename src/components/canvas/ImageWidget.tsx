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

import React, { memo } from 'react';
import type { ImageEntity } from '../../canvas/sceneGraph';
import { selectionStore } from '../../store/selectionStore';
import { useInkingStore } from '../../store/inkingStore';

interface ImageWidgetProps {
  image: ImageEntity;
}

export const ImageWidget: React.FC<ImageWidgetProps> = memo(({ image }) => {
  const { selectedTool } = useInkingStore();
  const isSelectTool = selectedTool === 'Select';

  const isLocked = Boolean(image.isLockedToBackground || image.isLocked);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isSelectTool) return;

    if (e.button === 0) {
      e.stopPropagation();
      const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
      selectionStore.select(image.id, isShift);
    }
  };

  return (
    <div
      id={`wb-image-${image.id}`}
      style={{
        position: 'absolute',
        left: `${image.x}px`,
        top: `${image.y}px`,
        width: `${image.width}px`,
        height: `${image.height}px`,
        zIndex: isLocked ? 50 : (image.zIndex || 100),
        pointerEvents: isSelectTool ? 'auto' : 'none',
        borderRadius: '4px',
        userSelect: 'none',
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
      onPointerDown={handlePointerDown}
    >
      <img
        src={image.src}
        alt={image.fileName || 'Canvas Image'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
          borderRadius: '4px',
          backgroundColor: 'transparent',
        }}
        draggable={false}
      />
    </div>
  );
});
ImageWidget.displayName = 'ImageWidget';
