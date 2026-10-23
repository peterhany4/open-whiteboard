import { useEffect } from 'react';
import { ThemeProvider } from './theme';
import { CanvasViewport } from './canvas';
import { TopBar } from './components/header';
import { CreateFlyout } from './components/create';
import { InkToolbar } from './components/toolbar';
import { ZoomHUD } from './components/hud';
import { BoardGallery } from './components/home';
import { useBoardStore, boardStore } from './store/boardStore';
import { shortcutEngine } from './tools/ShortcutEngine';

function WhiteboardCanvas() {
  return (
    <div
      className="whiteboard-app-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Top Board Header (Milestone 1.4 & 7.3) */}
      <TopBar />

      {/* 2. Left "Create" Flyout Panel (Milestone 1.4) */}
      <CreateFlyout />

      {/* 3. Interactive Infinite Canvas with Camera Matrix (Milestone 2.1) */}
      <CanvasViewport>
        <div
          id="whiteboard-canvas-root"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </CanvasViewport>

      {/* 4. Floating Ink Ribbon Bar (Milestone 1.3) */}
      <InkToolbar />

      {/* 5. Bottom-Right Zoom & Dark Mode HUD Pill (Milestone 1.4) */}
      <ZoomHUD />
    </div>
  );
}

function MainShell() {
  const { currentView } = useBoardStore();

  useEffect(() => {
    boardStore.initialize();
    shortcutEngine.start();
    return () => {
      shortcutEngine.stop();
    };
  }, []);

  return currentView === 'gallery' ? <BoardGallery /> : <WhiteboardCanvas />;
}

export function App() {
  return (
    <ThemeProvider>
      <MainShell />
    </ThemeProvider>
  );
}
