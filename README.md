# OpenWhiteboard 🎨

> A modern, local-first, open-source Microsoft Whiteboard reconstruction engineered with Fluent UI, GPU-accelerated inking, PDF annotation, and native desktop integration.

[![Release](https://img.shields.io/badge/release-v0.1.0-0078D4.svg)](https://github.com/peterhany4/open-whiteboard/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web-blue.svg)](https://github.com/peterhany4/open-whiteboard)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ Features

### 🖋️ Inking & Precision Tools
- **5 Customizable Pen Slots**: 15 Fluent palette swatches, Rainbow & Galaxy effects, thicknesses from 1px to 12px, and single/double arrowheads.
- **Catmull-Rom Bezier Smoothing**: Micro-batch pointer deduplication and velocity-sensitive stroke width modulation.
- **Chisel-Tip Highlighter**: Transparent ink blending (multiply in Light mode, screen in Dark mode) anchored beneath ink layers.
- **Ephemeral Laser Pointer**: High-visibility glow trail with real-time decaying tail.
- **Dual-Mode Eraser**: Velocity-sensitive Stroke Eraser and fine Point Eraser with dynamic cursor ring.
- **Interactive Ruler Widget**: 960px magnetic ruler with 360° protractor dial and 5° magnetic angle snapping.

### 📐 Objects, Notes & Canvas Entities
- **Folded-Corner Sticky Notes**: 8 authentic Fluent pastel colors with emoji reaction stamps and auto-expanding note grids.
- **Rich Typography & Text**: Clean vector text boxes with responsive bounds.
- **Vector Geometric Shapes**: Rectangles, circles, diamonds, triangles, arrows, and lines with cardinal anchor snaps.
- **Selection & Marquee Engine**:
  - Single-click hit-testing across strokes, shapes, and notes.
  - Live rectangular marquee box drag for multi-object group selection.
  - Floating action pill (Color picker, Duplicate, Bring to Front, Send to Back, Lock, Delete).

### 📄 Local PDF & Photo Annotation
- **Local PDF Importer**: Fast, client-side PDF rendering with page preview cards, selective page insertion, and high-DPI rasterization.
- **Lock to Background**: Pin images or documents beneath ink layers without accidental dragging or erasing.
- **Spatial Document Anchoring**: Moving unlocked pages automatically translates all overlapping ink strokes and sticky notes.

### 🗂️ Multi-Board Hub & Infinite Canvas
- **Whiteboard Picker Gallery**: Searchable board gallery, auto-save, high-DPI thumbnails, and board CRUD (create, rename, duplicate, export, delete).
- **Infinite 2D Camera Matrix**: Smooth pan (middle-click, spacebar, or Hand tool) and cursor-centered pinch-to-zoom (0.1x to 10.0x).
- **Adaptive Vector Grid**: 9 paper grid styles (Dot, Cubic, Graph, Rule, Triangular, etc.) with Moiré suppression.

### 💻 Native Desktop Integration (Electron)
- **Frameless Acrylic / Mica Styling**: Native Windows titlebar controls (Minimize, Maximize/Restore, Close) adhering to Fitts's Law.
- **Direct Disk Persistence**: Save and open native `.whiteboard` project bundles.
- **High-Res Export**: Instant export to 2x/3x crisp PNG, vector SVG, and annotated PDF.

---

## 🚀 Download & Installation

### Pre-Built Binaries (Windows x64)
Grab the latest release from the [Releases](https://github.com/peterhany4/open-whiteboard/releases) page:
- **`Microsoft Whiteboard-Setup-0.1.0.exe`**: Standard Windows NSIS Installer (adds desktop & start menu shortcuts).
- **`Microsoft Whiteboard-Portable-0.1.0.exe`**: Standalone executable (runs immediately without installation).

---

## 🛠️ Development & Building from Source

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/peterhany4/open-whiteboard.git
cd open-whiteboard

# Install dependencies
npm install

# Run Web Development Server (Vite)
npm run dev

# Run Electron Desktop Application (Dev Mode)
npm run electron:dev
```

### Production Build
```bash
# Build web renderer and electron main/preload
npm run build

# Package Windows NSIS Installer and Portable Executable
npm run electron:build
```
Packaged binaries will be located in the `release/` directory.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` / `S` | Select Tool (default cursor) |
| `H` | Hand / Pan Tool |
| `P` / `1`–`5` | Pen Tool (Slots 1 to 5) |
| `X` | Highlighter Tool |
| `E` | Eraser Tool |
| `L` | Freeform Lasso Tool |
| `R` | Toggle Interactive Ruler |
| `N` | Insert Sticky Note |
| `T` | Insert Text Box |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+D` | Duplicate Selected Objects |
| `Delete` / `Backspace` | Delete Selected Objects |
| `Ctrl+A` | Select All Objects |
| `Escape` | Clear Selection / Return to Select Tool |
| `+` / `-` / `Ctrl+0` | Zoom In / Zoom Out / Reset Zoom (100%) |

---

## 📜 License
MIT License. Crafted with precision for high-performance visual thinking.
