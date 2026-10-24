import React from 'react';
import { useToastStore, toastStore } from '../../store/toastStore';
import { UndoIcon, DismissIcon } from '../../assets/icons';

export const Toast: React.FC = () => {
  const { currentToast } = useToastStore();

  if (!currentToast) return null;

  return (
    <aside
      id="wb-toast-banner"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 12px 6px 16px',
        borderRadius: '24px',
        backgroundColor: 'var(--wb-acrylic-background)',
        backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
        border: '1px solid var(--colorNeutralStroke1)',
        boxShadow: 'var(--shadow16)',
        color: 'var(--colorNeutralForeground1)',
        fontSize: '13px',
        fontWeight: 500,
        userSelect: 'none',
        animation: 'wbToastSlideIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <UndoIcon size={16} color="var(--themePrimary)" />
        <span>{currentToast.message}</span>
      </div>

      {currentToast.actionLabel && (
        <button
          onClick={() => {
            currentToast.onAction?.();
            toastStore.dismiss();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '14px',
            border: 'none',
            backgroundColor: 'var(--themePrimary)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--themeDark)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--themePrimary)';
          }}
        >
          {currentToast.actionLabel}
        </button>
      )}

      <button
        onClick={() => toastStore.dismiss()}
        title="Dismiss"
        aria-label="Dismiss notification"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--colorNeutralForeground3)',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
          e.currentTarget.style.color = 'var(--colorNeutralForeground1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--colorNeutralForeground3)';
        }}
      >
        <DismissIcon size={14} />
      </button>
    </aside>
  );
};
