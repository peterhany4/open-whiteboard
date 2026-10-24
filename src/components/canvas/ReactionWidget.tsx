/**
 * Open Whiteboard — Reactions & Canvas Stickers Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 93425 (chunks/93425.*.js, line 67): u.Y.Sticker, Like, Heart, Check, Question, Celebrate
 *   - Module 821516 & 887699: Stamp placement, sizing, and bounce animations
 */

import React, { useCallback } from 'react';
import type { ReactionEntity, ReactionKind } from '../../canvas/sceneGraph';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { ThumbLikeIcon, HeartIcon, CheckmarkIcon } from '../../assets/icons';

interface ReactionWidgetProps {
  reaction: ReactionEntity;
}

export const ReactionWidget: React.FC<ReactionWidgetProps> = ({ reaction }) => {
  const { isSelected } = useSelectionStore();
  const selected = isSelected(reaction.id);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const isAdditive = e.shiftKey || e.ctrlKey || e.metaKey;
      if (isAdditive && selected) {
        selectionStore.deselect(reaction.id);
      } else {
        selectionStore.select(reaction.id, isAdditive);
      }
    },
    [reaction.id, selected]
  );

  const { size, reactionType } = reaction;

  const renderIcon = (type: ReactionKind) => {
    const iconSize = Math.max(20, size * 0.65);
    switch (type) {
      case 'like':
        return <ThumbLikeIcon size={iconSize} color="#0078D4" />;
      case 'heart':
        return <HeartIcon size={iconSize} color="#E71224" />;
      case 'check':
        return <CheckmarkIcon size={iconSize} color="#00B44B" />;
      case 'question':
        return (
          <span
            style={{
              fontSize: `${iconSize}px`,
              fontWeight: 800,
              color: '#8F349E',
              lineHeight: 1,
            }}
          >
            ?
          </span>
        );
      case 'celebrate':
        return (
          <span
            style={{
              fontSize: `${iconSize}px`,
              lineHeight: 1,
            }}
          >
            🎉
          </span>
        );
      default:
        return <ThumbLikeIcon size={iconSize} color="#0078D4" />;
    }
  };

  return (
    <div
      id={`wb-reaction-${reaction.id}`}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (e.button === 0) {
          e.stopPropagation();
          const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
          if (!selected) {
            selectionStore.select(reaction.id, isShift);
          }
        }
      }}
      style={{
        position: 'absolute',
        left: `${reaction.x}px`,
        top: `${reaction.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: '#FFFFFF',
        boxShadow: selected
          ? '0 0 0 2px #0078D4, 0 6px 16px rgba(0,0,0,0.18)'
          : '0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        pointerEvents: 'auto',
        zIndex: reaction.zIndex,
        animation: 'wbBounceIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <style>{`
        @keyframes wbBounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
      {renderIcon(reactionType)}
    </div>
  );
};
