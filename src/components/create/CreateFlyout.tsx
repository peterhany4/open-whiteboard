import React, { useRef, useEffect } from 'react';
import { useCanvasStore, canvasStore } from '../../store/canvasStore';
import type { CreateCategory } from '../../store/canvasStore';
import {
  AddIcon,
  DismissIcon,
  ChevronLeftIcon,
  StickyNoteIcon,
  TextIcon,
  ShapesIcon,
  ReactionsIcon,
  ImageIcon,
  DocumentPDFIcon,
  HeartIcon,
  ThumbLikeIcon,
  CheckmarkIcon,
} from '../../assets/icons';

export const CreateFlyout: React.FC = () => {
  const { isCreatePanelOpen, activeCreateCategory } = useCanvasStore();
  const flyoutRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('#wb-create-toggle-button')
      ) {
        canvasStore.closeCreatePanel();
      }
    }
    if (isCreatePanelOpen) {
      window.addEventListener('pointerdown', handlePointerDown);
    }
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isCreatePanelOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isCreatePanelOpen) {
        canvasStore.closeCreatePanel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatePanelOpen]);

  const handleInsertItem = (type: string, payload?: any) => {
    window.dispatchEvent(
      new CustomEvent('wb-insert-object', {
        detail: { type, payload, timestamp: Date.now() },
      })
    );
    canvasStore.closeCreatePanel();
  };

  const handleSelectImageClick = async () => {
    // 1. Electron native dialog (zero-focus-lock, instant)
    if (typeof window !== 'undefined' && window.electronAPI?.openImage) {
      canvasStore.closeCreatePanel();
      const res = await window.electronAPI.openImage();
      if (res.success && res.dataUrl) {
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || 360;
          let h = img.naturalHeight || 270;
          const maxDim = 480;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          handleInsertItem('image', { url: res.dataUrl, name: res.fileName || 'Image', width: w, height: h });
        };
        img.src = res.dataUrl;
      }
      return;
    }

    // 2. Web browser fallback: click hidden input programmatically
    imageInputRef.current?.click();
  };

  const handleSelectPdfClick = async () => {
    // 1. Electron native dialog
    if (typeof window !== 'undefined' && window.electronAPI?.openDocument) {
      canvasStore.closeCreatePanel();
      const res = await window.electronAPI.openDocument();
      if (res.success && res.arrayBuffer) {
        const file = new File([res.arrayBuffer], res.fileName || 'Document.pdf', { type: 'application/pdf' });
        window.dispatchEvent(
          new CustomEvent('wb-open-pdf-picker', {
            detail: { file },
          })
        );
      }
      return;
    }

    // 2. Web browser fallback
    pdfInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      canvasStore.closeCreatePanel();
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || 360;
          let h = img.naturalHeight || 270;
          const maxDim = 480;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          handleInsertItem('image', { url: dataUrl, name: file.name, width: w, height: h });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      canvasStore.closeCreatePanel();
      window.dispatchEvent(
        new CustomEvent('wb-open-pdf-picker', {
          detail: { file },
        })
      );
      e.target.value = '';
    }
  };

  const mainCategories = [
    {
      id: 'Notes' as CreateCategory,
      title: 'Notes (N)',
      subtitle: 'Sticky notes & note grids',
      icon: <StickyNoteIcon size={24} color="#F2C80F" />,
    },
    {
      id: 'Text' as CreateCategory,
      title: 'Text (T)',
      subtitle: 'Add typography & headings',
      icon: <TextIcon size={24} color="var(--themePrimary)" />,
    },
    {
      id: 'Shapes' as CreateCategory,
      title: 'Shapes',
      subtitle: 'Polygons, lines & connectors',
      icon: <ShapesIcon size={24} color="#00B44B" />,
    },
    {
      id: 'Reactions' as CreateCategory,
      title: 'Reactions',
      subtitle: 'Stickers & voting stamps',
      icon: <ReactionsIcon size={24} color="#CF1278" />,
    },
    {
      id: 'Images' as CreateCategory,
      title: 'Images',
      subtitle: 'Paste or upload local photos',
      icon: <ImageIcon size={24} color="#0069BF" />,
    },
    {
      id: 'Documents' as CreateCategory,
      title: 'Documents',
      subtitle: 'Insert & annotate PDF pages',
      icon: <DocumentPDFIcon size={24} color="#E71224" />,
    },
  ];

  const noteColors = [
    { name: 'Yellow', color: '#FFF1A8' },
    { name: 'Green', color: '#D4F5B0' },
    { name: 'Blue', color: '#C8EBFA' },
    { name: 'Pink', color: '#FED8E4' },
    { name: 'Purple', color: '#E9D6F7' },
    { name: 'Orange', color: '#FEE2C3' },
    { name: 'Gray', color: '#EDEBE9' },
    { name: 'Dark Gray', color: '#3B3A39' },
  ];

  const shapeList = [
    { id: 'rectangle', name: 'Rectangle', icon: <div style={{ width: '22px', height: '16px', border: '2px solid currentColor', borderRadius: '2px' }} /> },
    { id: 'circle', name: 'Circle', icon: <div style={{ width: '18px', height: '18px', border: '2px solid currentColor', borderRadius: '50%' }} /> },
    { id: 'triangle', name: 'Triangle', icon: <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '16px solid currentColor' }} /> },
    { id: 'diamond', name: 'Diamond', icon: <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', transform: 'rotate(45deg)' }} /> },
    { id: 'arrow', name: 'Arrow', icon: <svg width="22" height="12" viewBox="0 0 22 12" fill="none"><path d="M1 6H19M19 6L14 1.5M19 6L14 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> },
    { id: 'line', name: 'Line', icon: <div style={{ width: '20px', height: '2px', backgroundColor: 'currentColor' }} /> },
  ];

  const reactionsList = [
    { id: 'like', name: 'Thumbs Up', icon: <ThumbLikeIcon size={24} color="#185ABD" /> },
    { id: 'heart', name: 'Heart', icon: <HeartIcon size={24} color="#E71224" /> },
    { id: 'check', name: 'Checkmark', icon: <CheckmarkIcon size={24} color="#00B44B" /> },
    { id: 'smile', name: 'Smile', icon: <span style={{ fontSize: '20px' }}>😊</span> },
    { id: 'star', name: 'Star', icon: <span style={{ fontSize: '20px' }}>⭐</span> },
    { id: 'fire', name: 'Fire', icon: <span style={{ fontSize: '20px' }}>🔥</span> },
  ];

  return (
    <>
      {/* 1. Floating Circular "+" Button Trigger */}
      <button
        id="wb-create-toggle-button"
        onClick={() => canvasStore.toggleCreatePanel()}
        title="Create (Insert notes, text, shapes, documents)"
        aria-label="Create panel"
        aria-expanded={isCreatePanelOpen}
        style={{
          position: 'fixed',
          top: '64px',
          left: '16px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'var(--wb-acrylic-border)',
          backgroundColor: isCreatePanelOpen
            ? 'var(--themePrimary)'
            : 'var(--wb-acrylic-background)',
          backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
          WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
          color: isCreatePanelOpen ? '#FFFFFF' : 'var(--colorNeutralForeground1)',
          boxShadow: 'var(--shadow8, 0 4px 8px rgba(0,0,0,0.12))',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1020,
          transition: 'all 0.18s cubic-bezier(0.25, 0.1, 0.25, 1)',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isCreatePanelOpen) {
            e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
            e.currentTarget.style.transform = 'scale(1.06)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isCreatePanelOpen) {
            e.currentTarget.style.backgroundColor = 'var(--wb-acrylic-background)';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <AddIcon size={22} color="currentColor" />
      </button>

      {/* 2. Slide-in Create Drawer */}
      {isCreatePanelOpen && (
        <aside
          ref={flyoutRef}
          id="wb-create-flyout"
          aria-label="Create Panel Flyout"
          style={{
            position: 'fixed',
            top: '64px',
            left: '68px',
            width: '310px',
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: 'var(--wb-ribbon-border-radius, 12px)',
            backgroundColor: 'var(--wb-acrylic-background)',
            backdropFilter: 'var(--wb-acrylic-backdrop-filter)',
            WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter)',
            border: 'var(--wb-acrylic-border)',
            boxShadow: 'var(--shadow28, 0 14px 28px rgba(0,0,0,0.2))',
            color: 'var(--colorNeutralForeground1)',
            zIndex: 1030,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            animation: 'wbPopoverFadeIn 0.18s cubic-bezier(0.1, 0.9, 0.2, 1)',
            userSelect: 'none',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activeCreateCategory !== 'Content' && (
                <button
                  onClick={() => canvasStore.setCreateCategory('Content')}
                  title="Back to all tools"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--colorNeutralForeground2)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                  }}
                >
                  <ChevronLeftIcon size={18} />
                </button>
              )}
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                {activeCreateCategory === 'Content' ? 'Create' : activeCreateCategory}
              </h2>
            </div>
            <button
              onClick={() => canvasStore.closeCreatePanel()}
              title="Close panel"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--colorNeutralForeground2)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <DismissIcon size={18} />
            </button>
          </div>

          {/* Main Content View (All Categories Grid) */}
          {activeCreateCategory === 'Content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mainCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => canvasStore.setCreateCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    backgroundColor: 'var(--colorNeutralBackground1)',
                    color: 'var(--colorNeutralForeground1)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                    boxShadow: 'var(--shadow2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)';
                    e.currentTarget.style.borderColor = 'var(--colorNeutralStroke1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--colorNeutralBackground2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{cat.title}</span>
                    <span style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>{cat.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Sub-view: Notes (Single & Grid) */}
          {activeCreateCategory === 'Notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colorNeutralForeground3)', textTransform: 'uppercase' }}>
                Single Sticky Note
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {noteColors.map((n) => (
                  <button
                    key={n.name}
                    onClick={() => handleInsertItem('note', { color: n.color, name: n.name })}
                    title={`Insert ${n.name} Note (N)`}
                    style={{
                      height: '46px',
                      borderRadius: '6px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: n.color,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow2)',
                      transition: 'transform 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--colorNeutralStroke1)', margin: '4px 0' }} />

              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colorNeutralForeground3)', textTransform: 'uppercase' }}>
                Note Grid
              </span>
              <button
                onClick={() => handleInsertItem('noteGrid')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--colorNeutralStroke1)',
                  backgroundColor: 'var(--colorNeutralBackground1)',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)')}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '20px', height: '20px' }}>
                  <div style={{ backgroundColor: '#FFF1A8', borderRadius: '1px' }} />
                  <div style={{ backgroundColor: '#D4F5B0', borderRadius: '1px' }} />
                  <div style={{ backgroundColor: '#C8EBFA', borderRadius: '1px' }} />
                  <div style={{ backgroundColor: '#FED8E4', borderRadius: '1px' }} />
                </div>
                <span>Insert 3x3 Note Grid</span>
              </button>
            </div>
          )}

          {/* Sub-view: Text */}
          {activeCreateCategory === 'Text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleInsertItem('text', { fontSize: 24, text: 'Heading' })}
                title="Insert Heading (T)"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--colorNeutralStroke1)',
                  backgroundColor: 'var(--colorNeutralBackground1)',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)')}
              >
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Large Heading</h3>
                <span style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>Insert prominent title text</span>
              </button>

              <button
                onClick={() => handleInsertItem('text', { fontSize: 16, text: 'Click to type...' })}
                title="Insert Body Text (T)"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--colorNeutralStroke1)',
                  backgroundColor: 'var(--colorNeutralBackground1)',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)')}
              >
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 400 }}>Body Text</p>
                <span style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>Insert standard paragraph text</span>
              </button>
            </div>
          )}

          {/* Sub-view: Shapes */}
          {activeCreateCategory === 'Shapes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colorNeutralForeground3)', textTransform: 'uppercase' }}>
                Geometric Shapes & Lines
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {shapeList.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => handleInsertItem('shape', { shapeType: shape.id })}
                    title={`Insert ${shape.name}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 6px',
                      borderRadius: '8px',
                      border: '1px solid var(--colorNeutralStroke1)',
                      backgroundColor: 'var(--colorNeutralBackground1)',
                      color: 'var(--colorNeutralForeground1)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)')}
                  >
                    {shape.icon}
                    <span>{shape.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-view: Reactions */}
          {activeCreateCategory === 'Reactions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colorNeutralForeground3)', textTransform: 'uppercase' }}>
                Reactions & Stamps
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {reactionsList.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => handleInsertItem('reaction', { reactionType: rec.id })}
                    title={`Insert ${rec.name}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 6px',
                      borderRadius: '8px',
                      border: '1px solid var(--colorNeutralStroke1)',
                      backgroundColor: 'var(--colorNeutralBackground1)',
                      color: 'var(--colorNeutralForeground1)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1Hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--colorNeutralBackground1)')}
                  >
                    {rec.icon}
                    <span>{rec.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-view: Images */}
          {activeCreateCategory === 'Images' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSelectImageClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '24px 16px',
                  borderRadius: '8px',
                  border: '2px dashed var(--colorNeutralStroke1)',
                  backgroundColor: 'var(--colorNeutralBackground1)',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--themePrimary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--colorNeutralStroke1)')}
              >
                <ImageIcon size={32} color="var(--themePrimary)" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Local Image</span>
                <span style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
                  PNG, JPG, WEBP, or SVG
                </span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3)', textAlign: 'center' }}>
                Tip: You can also paste images with Ctrl+V
              </span>
            </div>
          )}

          {/* Sub-view: Documents (PDF) */}
          {activeCreateCategory === 'Documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSelectPdfClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '24px 16px',
                  borderRadius: '8px',
                  border: '2px dashed var(--colorNeutralStroke1)',
                  backgroundColor: 'var(--colorNeutralBackground1)',
                  color: 'var(--colorNeutralForeground1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#E71224')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--colorNeutralStroke1)')}
              >
                <DocumentPDFIcon size={32} color="#E71224" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Insert Local PDF Document</span>
                <span style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
                  Annotate PDF pages directly on canvas
                </span>
              </button>
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </aside>
      )}
    </>
  );
};
