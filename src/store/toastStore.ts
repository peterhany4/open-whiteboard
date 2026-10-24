/**
 * Open Whiteboard — Reactive Toast Feedback Store
 *
 * Provides application-wide floating acrylic toast notifications with interactive action triggers.
 */

import { useSyncExternalStore } from 'react';

export interface ToastOptions {
  id?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export interface ToastState {
  currentToast: ToastOptions | null;
}

let currentState: ToastState = {
  currentToast: null,
};

const listeners = new Set<() => void>();
let autoDismissTimer: any = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const toastStore = {
  getState: (): ToastState => currentState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  show: (options: ToastOptions) => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }

    const toast: ToastOptions = {
      id: options.id || `toast-${Date.now()}`,
      durationMs: options.durationMs ?? 4000,
      ...options,
    };

    currentState = {
      currentToast: toast,
    };
    emitChange();

    if (toast.durationMs && toast.durationMs > 0) {
      autoDismissTimer = setTimeout(() => {
        toastStore.dismiss();
      }, toast.durationMs);
    }
  },

  dismiss: () => {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
    if (currentState.currentToast !== null) {
      currentState = {
        currentToast: null,
      };
      emitChange();
    }
  },
};

export function useToastStore(): ToastState {
  return useSyncExternalStore(toastStore.subscribe, toastStore.getState);
}
