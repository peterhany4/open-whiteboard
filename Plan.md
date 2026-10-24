# Open Whiteboard — REA Investigation & Full Recreation Master Plan (`plan.md`)

## 1. Agent Operating Rules (STRICT QUOTA & STATE MACHINE PROTOCOL)
You are an AI coding agent connected to **REA (`morluto/rea`)** via MCP/CLI. Your mission is to reverse-engineer and build a pixel-accurate, full-featured local clone of **Microsoft Whiteboard** (including exact UI/UX, original SVG icons, Dark Mode, all inking/canvas tools, and local Image/PDF annotation).

**CRITICAL RULES FOR EVERY SESSION:**
1. **Read Persistent Memory First:** Always read **Section 2 (REA Evidence Registry)** and **Section 4 (Session Handoff Tracker)** before calling any tools. If `ROOT_EVIDENCE_ID` or a local `--snapshot` / `--evidence-bundle` already exists in Section 2, **DO NOT** re-run `analyze_javascript_application` on the entire bundle folder. Query the cached evidence using `inspect_analysis_view`.
2. **One Micro-Task at a Time:** To protect context limits and token quotas, execute **ONLY ONE sub-task checkbox (`[ ]`)** per turn unless explicitly instructed otherwise.
3. **Mandatory 3-Step Loop (`Inspect -> Trace -> Recreate`):**
   - **Step A (Inspect & Trace):** Use REA (`search`, `inspect_analysis_view`, `trace_javascript_semantics`, or passive CDP) to locate the exact CSS tokens, SVG paths, or algorithm for the active micro-task. Record the Evidence ID and file/line ranges in Section 2.
   - **Step B (Recreate):** Implement the clean TypeScript/React module in `src/` matching the verified evidence.
   - **Step C (Checkpoint Update):** Mark the task `[x]` in Section 3, update Section 4 with the next task ID, and stop for user review.
4. **Never Dump Raw Minified Bundles:** Never read raw multi-megabyte `.js` bundles directly into chat context. Always use REA's bounded pagination (`inspect_analysis_view` with `retained-evidence`).

---

## 2. Cached REA Evidence & Snapshot Registry (Persistent Memory)
> **Agent Note:** Update this section immediately after completing Milestone 0.1 and after every new feature trace.

- **Target Bundles Path:** `d:/Programming/whiteboard-REA/targets/whiteboard-bundles`
- **Cached Snapshot / Evidence Bundle Path:** `./rea-artifacts/whiteboard-evidence.json`
- **Root Application Evidence ID (`ROOT_EVIDENCE_ID`):** `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de`
- **Active Analysis Provider:** `javascript-static` (and `cdp` if live browser attached)

### Discovered Module & Evidence Lookup Table
| Feature / Layer | REA Evidence ID | Source Bundle / Module Path | Byte / Line Range | Key Symbols & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Theme & Dark Mode Tokens** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/91115.*.js`, `6076.*.js`, `82132.*.js` | Modules 260008, 922127, 944277 | Fluent UI Light/Dark palettes, canvas `#FFFFFF`/`#1F1F1F`, grid `rgba(64,64,64,.188)`, shadows, acrylic |
| **SVG Icon Sprite / Definitions** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/91464.*.js`, `3644.*.js`, `16494.*.js`, `45173.*.js` | Modules 453072, 667907, 25810, 736830, 181117, 31350, 950686, 865891, 681271 | `Kl` icon resolver, Inking (Pen, Highlighter, Laser, SlideEraser, Ruler, Lasso), Navigation (Undo, Redo, ZoomIn, ZoomOut, FitToScreen), Creation (Note, Text, Shapes, Reactions, Image, Document, PDF), Shell (Settings, Sun, Moon, More, Dismiss, Copilot) |
| **Floating Ink Ribbon & Popovers** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/40049.*.js`, `8854.*.js`, `53113.*.js`, `91464.*.js` | Modules 900158, 804397, 786285, 4101, 12248, 434554, 133066, 578889, 70855 | Inking tools (Pen1..Pen5, Highlighter, Laser, Eraser, Ruler, Lasso), active pen-lift animation (-8px), 15 pen swatches, Rainbow & Galaxy effects, 15 highlighter swatches, 6 laser colors, thicknesses [1,2,4,6,8,12] / [8,12,16,24,28,32], arrow modes (NoArrow, Single, Double), PointEraser/StrokeEraser |
| **Top Bar, Create Flyout & Zoom HUD** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/app-router.*.js`, `8854.*.js`, `40049.*.js`, `46453.*.js` | Modules 795434, 560673, 576456, 891771, 796400 | Header height 48px, editable board title, undo/redo state, Copilot, Settings dropdown with paper colors, Left Create (+) panel (Notes, Text, Shapes, Reactions, Images, Documents), Zoom HUD (0.1x to 10.0x) + Light/Dark mode toggle |
| **Infinite Canvas & Camera Matrix** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/8854.*.js`, `BoardEditorComponent-852bcd1f.*.js` | Modules 891771, 415906, 241369 | Camera matrix { scale, positionX, positionY }, screenToWorld / worldToScreen projection, cursor-centered zoom M(), spacebar/middle-click pan, two-finger pinch-to-zoom |
| **Adaptive Dot-Grid Background** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `BoardEditorComponent-852bcd1f.*.js`, `91464.*.js`, `6076.*.js` | Modules 897381, 922127, lines 10–16 | PaperGrid (9 patterns: Dot, Cubic, Graph, CubicDot, CompactRule, WideRule, SlantedCubic, Triangular, Neutral), Moiré suppression threshold (scale < 0.2 -> Neutral), Module 897381 Dt.z translate3d remainder formula ((i % a) - a - i), dark mode paper contrast (rgba(255,255,255,0.22)) |
| **Scene Graph, Culling & Undo/Redo** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/9114.*.js`, `8854.*.js`, `93425.*.js` | Modules 127580, 770023, 796400, lines 1–16 | UndoRedoStack class U (undoUIStack, redoUIStack, beginUndoGroup, endUndoGroup, performUndo, performRedo), spatial AABB bounds Su() / zX(), 2D viewport frustum culling, framing formula Y() |
| **Inking & Bezier Smoothing** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/45330.*.js`, `17406.*.js`, `8854.*.js` | Modules 135647, 360568, 518266, 726577, 170887, 834265, 805859, 773625, 472657 | `getCoalescedEvents` pointer micro-batching, 0.25px deduplication filter, tremor jitter filter (0.17*curr + 1.33*out1 - 0.5*out2), Catmull-Rom to Cubic Bezier curve fitting (C1 = P1 + (P2-P0)/6, C2 = P2 - (P3-P1)/6), resting pressure 0.5 with velocity/stylus stroke modulation, arrowhead geometry (directionThreshold=5, strokeLengthThreshold=25, arrowLength=max(12, width*3*sqrt(2)), arrowAngle=PI/2), live inking overlay, undo/redo sceneStore integration |
| **Highlighter & Laser Pointer** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/65345.*.js`, `45330.*.js`, `BoardEditorComponent-3257753e.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 65345, 272120, 605051, 807952, 228858, 84781932 | Chisel-tip "rectangle" tip geometry, 15 swatches, thicknesses [8,12,16,24,28,32], mixBlendMode multiply in Light mode and screen/overlay in Dark mode, anchoring zIndex 150 beneath pen ink, Ephemeral laser trail, 6 neon colors, dual-layer drop-shadow blur, requestAnimationFrame tail-shrinking (pointsPerMs=0.045) and 1000ms smoothstep opacity decay |
| **Eraser (Stroke & Partial)** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/40049.*.js`, `45330.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 40049, 804397, 45330 (line 47), 84781932 (classes rt & wt), 501270 | VelocityEraser speed calculation (accumulatedDistance / s, speedSensitivityFactor 350, dynamic radius 14-48px), StrokeEraser (perpendicular point-to-segment distance <= R + width/2 whole-stroke deletion), PointEraser (stroke splitting along eraser circle boundary with atomic sub-stroke replacement), visual cursor ring indicator, full Undo/Redo integration |
| **Ruler & Lasso Selection** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/46977.*.js`, `45330.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 46977, 45330, 57773, 671029, 84781932 (class Kt), 6097 | Ruler geometry (960x120px, halfWidth 60px, snapWidth 32px), compass protractor dial (64px dia, 10° ticks, 0°–360° readout), 5° magnetic angle snap on wheel/drag, snapToEdge magnetic ink projection in PenTool & HighlighterTool, FreeformLasso (fill rgba(0,120,215,0.2), stroke rgb(0,120,215)), ray-casting point-in-polygon containment test, Fluent selection bounding box with 8 resize handles, rotation handle, floating context menu (Color Picker, Bring to Front/Send to Back, Duplicate, Lock, Delete), multi-object drag translation & transforms with atomic Undo/Redo |
| **Sticky Notes, Text & Shapes** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `8854.*.js`, `821516.*.js` | Modules 93425, 8854, 770023, 821516, 887699 | Sticky notes (200x200px, 8 Fluent pastel swatches: Yellow, Green, Blue, Pink, Purple, Orange, Grey, Charcoal, folded corner dog-ear shadow, inline textarea, reaction stamps), NoteGrid (editable title, responsive 3-column card flow, dynamic "+" Add Note button with automatic height expansion), PlainText (resizable, auto-wrapping, adaptive Light/Dark contrast), Geometric shapes (Rectangle, Circle, Diamond, Triangle, Parallelogram, Arrow, Line with cardinal border anchor dots), Reactions & stickers (Like, Heart, Check, Question, Celebrate with entrance bounce | **Image & PDF Layer Locking & Export** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `40049.*.js`, `8854.*.js`, `770023.*.js` | Modules 93425, 560673, 8854, 770023 | ImageWidget with authentic "Lock to Background" behavior (zIndex: 50, below inking layer, immune to accidental lasso/click selection and eraser clipping, acrylic unlock chip), file input/drag-and-drop/clipboard paste (Ctrl+V) for PNG, JPG, WEBP, SVG, Local PDF Importer & Page Picker Modal (pdfjs-dist, crisp 2x DPI thumbnails, Select/Deselect All, horizontal side-by-side / grid / vertical layout), spatial document anchoring (moving unlocked PDF/image translates all overlapping ink strokes, highlighters, and sticky notes), ExportEngine (High-Res 2x and Super-Res 3x PNG rasterization, standalone Vector SVG, and Annotated PDF binary export) |
| **Board Picker & Welcome Gallery** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/boardpicker.12301e16597e2cf06401.js`, `boardpicker-appbar.1bb2fcd98920ca196d3d.js`, `app-router.2afacb1fd044797c70a6.js` | Modules 517955, 796936, 179019, 795434, F.J | Board repository (IndexedDB/local multi-board persistence, auto-save, canvas snapshot serialization), BoardPicker gallery (recent boards grid, "+ Create new whiteboard" hero tile, card thumbnail preview, last modified timestamp, rename/duplicate/delete/export context menu), TopBar "< Back to My Whiteboards" navigation |
| **Select / Pan Navigation & Global Shortcuts** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/40049.7fda10c837609f18159b.js`, `91464.7aeadf3b6ddc55b8cdc3.js`, `BoardEditorComponent-84781932.a42f38c8c9aa0e756cd7.js` | Modules 179019, 40049, 804397, 84781932 | Select Tool (Arrow cursor, default mode on board entry, interactive clicks on canvas objects without ink stroke collision), Hand / Pan Tool (left-drag pan mode), comprehensive keyboard shortcuts engine (V/S=Select, H=Hand, P/1-5=Pens, X=Highlighter, E=Eraser, L=Lasso, R=Ruler, N=Note, T=Text, Ctrl+Z/Y, Ctrl+D, Ctrl+A, Delete, Esc, +/- zoom), shortcut badge tooltips |
| **Electron Desktop Packaging & Native Windows Integration** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/startup-nativewindows.bd7de3895048f6c0aadd.js`, `blueboard/chunks/appwrapper.14452b135005dd7a8466.js` | Modules startup-nativewindows, appwrapper, 939487 | Electron main/preload bridge, frameless acrylic/mica window styling with native Windows caption buttons (Minimize, Maximize/Restore, Close), AI image generation (`generate_image`) for custom app & installer branding + multi-resolution icon generation (.ico 16-256px from signature SVG), local filesystem save/load (.whiteboard project files), production packaging (electron-builder, NSIS Windows installer & portable exe) |
| **Selection Engine, Action Bar, Native Dialogs & UX Polish** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `BoardEditorComponent-84781932.*.js`, `boardpicker.*.js`, `appwrapper.*.js` | Modules 84781932, 179019, 517955 | Select Tool single-click hit testing & rectangular marquee group selection, floating context menu event propagation fix, native Electron file import without focus traps / ESC key, default launch to Board Picker, dark mode context menu contrast |
| **Interactive PDF Document Viewer** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `40049.*.js` | Modules 93425, 560673 | PDF.js continuous scroll viewer widget on canvas, selectable text layer with native copy-paste, coordinate-synchronized inking layer (pen/highlighter strokes track document scrolling) |
| **Tool Cursors & Chisel Highlighter Icon** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/65345.*.js`, `45330.*.js` | Modules 65345, 807952 | Wide-body chisel-cut fluorescent marker icon, dynamic tool cursors (precision crosshair dot for pen, chisel nib bounding box for highlighter, rings for eraser) |
| **Laser Active Tracking & Glow Physics** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/65345.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 65345, 272120, 84781932 | Continuous hover tracking laser focal bead with radial Gaussian glow halo, decaying trail ribbon physics |
| **Adaptive Canvas Paper Theme & Grid Contrast** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/theme/tokens.ts`, `src/canvas/grid.ts` | Modules 517955 | Automatic Mode-Driven Canvas Surface (#FFFFFF in Light, #1E1E1E in Dark), crisp contrast grid lines (#D2D0CE Light, #3B3A39 Dark), removal of redundant paper color swatches |
| **Pro Navigation & Quick Inking Gestures** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/canvas/CanvasViewport.tsx`, `src/canvas/camera.ts` | Modules 84781932, 40049 | Right-click drag viewport pan with context menu suppression, middle-click (wheel) drag quick erase without tool switching |
| **Shortcuts & TopBar Action Cleanup** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/tools/ShortcutEngine.ts`, `src/components/header/TopBar.tsx` | Modules 40049 | Ergonomic shortcuts (Alt+W for Pen 1, Alt+X for Eraser), removal of unused mockup buttons (Copilot, Share) |
| **Enhance Inked Shapes (Ink-to-Shape)** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/45330.*.js`, `8854.*.js`, `93425.*.js` | Modules 45330, 8854 | Geometric stroke classification (Circle, Ellipse, Rectangle, Square, Triangle, Diamond, Line, Arrow), Settings toggle, automatic replacement with clean vector ShapeEntity |
| **Board Session Isolation & Reset** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/store/boardStore.ts`, `src/store/inkingStore.ts` | Modules 517955, 795434 | Per-board ruler coordinates and camera matrix persistence, pristine initial state on new board creation (Select tool default, ruler hidden & centered, camera reset) |
| **Clear Canvas Action & History Integration** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/components/toolbar/EraserPopover.tsx`, `src/canvas/history.ts` | Modules 40049, 804397 | Clear Canvas action directly connected to sceneStore with undoable ClearCanvasCommand in history.ts |

---

## 3. Master Feature & Micro-Milestone Checklist

### Milestone 0: One-Time REA Baseline & Project Scaffolding
- [x] **0.1 Run Baseline REA Static Analysis & Export Bundle:** Run `analyze_javascript_application` once on the target bundles directory, export the canonical Evidence v2 bundle/snapshot to `./rea-artifacts/whiteboard-evidence.json`, and record `ROOT_EVIDENCE_ID` in Section 2.
- [x] **0.2 Scaffold Clean Local App:** Initialize a Vite + React + TypeScript project (`src/components`, `src/canvas`, `src/tools`, `src/theme`, `src/store`, `src/assets/icons`) with zero placeholder bloat.

### Milestone 1: Exact UI Shell, Original SVG Icons & Dark Mode (TOP PRIORITY)
- [x] **1.1 Inspect & Recreate Light/Dark Theme Tokens:** Use REA search/inspection (or CDP styles) to extract the exact Microsoft Whiteboard Fluent UI color variables, elevation shadows, acrylic backdrop-filter values, and canvas surface colors for both **Light Mode** and **Dark Mode**. Implement `src/theme/tokens.ts` and theme provider.
- [x] **1.2 Extract Original Inline SVG Icons:** Locate and extract the exact SVG `<path>` definitions from the Whiteboard bundle/DOM for all toolbar icons (Ballpoint Pens, Highlighter, Laser Pointer, Eraser, Ruler, Lasso Select, Undo, Redo, Sticky Note, Text, Shapes, Reactions, Image/Document, Zoom, Settings/Theme). Save into `src/assets/icons/`.
- [x] **1.3 Build the Floating Ink Ribbon & Tool Popovers:** Recreate the exact bottom/floating Ink Toolbar with pen slot selection, active pen lift animation, and the pop-up thickness + color palette card (including rainbow/galaxy ink swatches if present).
- [x] **1.4 Build Top Bar, Left "Create" Flyout & Zoom/Dark Mode HUD:** Recreate the top board header, the collapsible left `+` Create panel (Notes, Text, Shapes, Reactions, Images, PDFs), and the bottom-right Zoom/Fit-to-Screen pill with an instant **Light/Dark Mode toggle**.

### Milestone 2: Infinite Canvas Core & Spatial Engine
- [x] **2.1 Trace & Recreate Camera Transform Matrix:** Trace how Whiteboard maps screen pointer coordinates `(clientX, clientY)` to world coordinates `(worldX, worldY)`. Implement smooth pan (spacebar+drag, middle-click, two-finger scroll) and cursor-centered zoom (`10%` to `1000%`).
- [x] **2.2 Adaptive Dot-Grid Background:** Implement the zoom-responsive dot/square grid background canvas that adjusts grid density at zoom thresholds and switches contrast automatically in Dark Mode.
- [x] **2.3 Scene Graph, Viewport Culling & Undo/Redo Stack:** Implement the spatial entity store with bounding-box viewport culling (only render visible elements) and a deterministic Command History stack (`Ctrl+Z` / `Ctrl+Y`).

### Milestone 3: Original Inking Engine (Pens, Highlighter, Laser, Eraser)
- [x] **3.1 Ballpoint & Felt-Tip Pen Smoothing:** Trace Whiteboard's pointer event buffer (`pointerdown`, `pointermove`, `getCoalescedEvents`) and curve interpolation (Catmull-Rom / Quadratic Bezier smoothing + velocity/pressure variable stroke width). Recreate in `src/tools/PenTool.ts` including optional arrow-end caps.
- [x] **3.2 Highlighter Tool:** Trace and implement the chisel-tip Highlighter with proper alpha/multiply blending so overlapping strokes don't wash out text or invert poorly in Dark Mode.
- [x] **3.3 Laser Pointer Tool:** Trace and implement the real-time glowing laser trail that holds briefly on pointer movement and smoothly fades out (`opacity` + tail-shrinking decay).
- [x] **3.4 Dual-Mode Eraser (Partial & Entire Stroke):** Trace and implement both "Erase entire stroke" (single touch removes stroke) and "Partial/Point erase" (splits Bezier stroke paths where the eraser circle intersects, with eraser radius scaling dynamically with cursor velocity).

### Milestone 4: Precision & Selection Tools
- [x] **4.1 Interactive Ruler Overlay:** Trace and recreate the semi-transparent draggable Ruler widget with tick marks, center degree readout (`0°–360°`), scroll-wheel/two-finger rotation, and magnetic ink-to-edge projection so drawing near the ruler edge produces a perfectly straight line.
- [x] **4.2 Lasso & Object Selection Tool:** Trace and implement freeform polygonal Lasso selection + click selection. Render the exact Fluent selection bounding box with 8 resize handles, rotation handle, and floating context bar (Color, Copy, Bring to Front/Send to Back, Lock to Background, Delete).

### Milestone 5: Original Canvas Objects (Notes, Text, Shapes, Reactions)
- [x] **5.1 Sticky Notes & Note Grids:** Recreate single Sticky Notes and dynamic Note Grids ("Add note" button) with authentic folded-corner shadow styling, background color picker, auto-scaling handwriting/text layout, and corner reaction stamps.
- [x] **5.2 Rich Text Boxes:** Implement resizable, rotatable canvas text elements with inline editing, font-size scaling, and Light/Dark Mode adaptive text contrast.
- [x] **5.3 Shapes, Lines & Connectors:** Implement geometric shapes (Rectangle, Circle, Diamond, Triangle, Parallelogram) and straight/elbow arrows that snap to object borders.
- [x] **5.4 Reactions / Stickers:** Add draggable thumbs-up, heart, checkmark, question mark, and celebration stickers from the Create menu.

### Milestone 6: Images & Local PDF Annotation Engine
- [x] **6.1 Image Insertion & "Lock to Background":** Support pasting (`Ctrl+V`), dragging-and-dropping, or selecting local photos (`.png`, `.jpg`, `.webp`, `.svg`). Include the **"Lock to Background"** context action so locked images sit beneath the ink layer without accidentally moving while drawing.
- [x] **6.2 Local PDF Importer & Page Picker Modal:** Integrate `pdfjs-dist` locally. When the user selects a `.pdf` file from the Create menu or drops it onto the board, open a clean Page Selection sidebar/modal (preview thumbnails, "Insert Selected Pages" or "Insert All Pages") and rasterize selected pages at high DPI onto the canvas.
- [x] **6.3 Ink-on-Document Grouping & High-Res Export:** Ensure ink strokes, highlighters, and sticky notes placed on top of a PDF page or image remain spatially anchored to that page (so unlocking and moving a PDF page moves its annotations with it), and add board export to high-DPI PNG and annotated PDF.

### Milestone 7: Home / Welcome Page & Multi-Board Hub (BoardPicker)
- [x] **7.1 Multi-Board Persistence Engine:** Trace and implement the multi-board storage repository in `src/store/boardStore.ts` (IndexedDB / LocalStorage) with board metadata (`id`, `title`, `thumbnailDataUrl`, `createdAt`, `updatedAt`, `canvasData`), debounced auto-saving, and board duplication/deletion.
- [x] **7.2 Authentic Whiteboard Home Gallery UI (`BoardPicker`):** Trace and implement `src/components/home/BoardGallery.tsx` matching `boardpicker.js`:
  - Signature "+ Create new whiteboard" card with Fluent acrylic gradient styling.
  - Responsive grid of board cards displaying high-DPI board preview thumbnail, title, relative edit time ("Just now", "2 hours ago"), and "..." card context menu (Open, Rename inline, Duplicate, Export PNG/PDF, Delete).
  - Search filter input to quickly search boards by title.
- [x] **7.3 Shell Route & Navigation Integration:** Trace `app-router.js` and add a TopBar "< Back to My Whiteboards" button beside the logo in `TopBar.tsx`, providing instant client-side routing between the Board Gallery and the active Whiteboard canvas with zero page reloads.

### Milestone 8: Navigation Tools (Select & Pan), Default Cursor & Global Shortcuts
- [x] **8.1 Select Tool & Hand / Pan Tool in Inking Dock:** Trace `toolsDockBaseBar` (Module 179019) and implement `Select` (`CursorIcon`) and `Hand` (`HandIcon`) tool modes in `src/store/inkingStore.ts` and `src/components/toolbar/InkingToolbar.tsx`:
  - **Select Tool as Default**: When entering a whiteboard, default active tool is `Select` so left-clicking buttons (Delete, Lock, Duplicate, Color) and selecting objects feels native and never creates accidental ink lines.
  - **Pan Tool**: Left-clicking and dragging pans the infinite canvas smoothly without requiring `Spacebar` or middle-click.
  - Authentic cursor icons: Arrow cursor for Select, Open/Closed Hand for Pan.
- [x] **8.2 Global Keyboard Shortcuts Engine:** Trace all authentic Microsoft Whiteboard keyboard shortcuts and implement `src/tools/ShortcutEngine.ts`:
  - `V` / `S`: Select Tool (default)
  - `H`: Hand / Pan Tool
  - `P` / `1`–`5`: Switch to Pen slots
  - `X`: Switch to Highlighter
  - `E`: Switch to Eraser
  - `L`: Switch to Lasso
  - `R`: Toggle Interactive Ruler
  - `N`: Insert Sticky Note
  - `T`: Insert Text Box
  - `Delete` / `Backspace`: Delete selected items
  - `Ctrl+D`: Duplicate selected items
  - `Ctrl+A`: Select all items
  - `Esc`: Clear selection / return to Select Tool
  - `+` / `-` / `Ctrl+0`: Zoom In / Zoom Out / Reset Zoom
  - Tooltips with hotkey badges across all UI toolbar buttons.

### Milestone 9: Electron Desktop Packaging, Custom Icon & Native Windows Integration
- [x] **9.1 Electron Main & Preload Process:** Configure Electron main process (`electron/main.ts` / `electron/preload.ts`) with frameless acrylic/mica window styling, window state persistence (position and dimensions), and custom Fluent Windows titlebar controls (Minimize, Maximize/Restore, Close).
- [x] **9.2 Custom App Executable, Installer Branding & AI Icon Assets:**
  - Utilize AI image generation (`generate_image`) and vector compositing to craft high-resolution Fluent-styled Microsoft Whiteboard app icon assets (based on the signature whiteboard frame vector `<svg>...</svg>`) and NSIS installer branding (installer header graphic, wizard welcome banner).
  - Generate multi-resolution `.ico` (16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256) and crisp `.png` assets for `Whiteboard.exe`, Windows taskbar, desktop shortcut, and setup installer.
- [x] **9.3 Desktop Packaging & Native File System Integration:** Configure `electron-builder` for Windows (`x64` NSIS installer and standalone portable executable), and support direct desktop disk operations (saving/opening `.whiteboard` bundle files). Add `npm run electron:dev` and `npm run electron:build` scripts.

### Milestone 10: Canvas Selection Engine, UI Action Bar & Polish
- [x] **10.1 Select Tool Single-Tap Hit-Testing & Rectangular Marquee Group Selection:**
  - Implement full selection engine for the default `Select` tool in `CanvasViewport.tsx` (and `src/tools/SelectTool.ts`):
    - **Single-Click / Tap Hit-Testing**: Clicking any ink stroke or highlighter (distance to polyline segments <= 8px), or box entity (sticky note, text box, shape, reaction, image) selects it; holding `Shift` or `Ctrl` toggles selection. Clicking on empty canvas clears selection.
    - **Live Rectangular Marquee Box**: Dragging on empty canvas renders a live Fluent marquee rectangle (`rgba(0, 120, 215, 0.15)` fill with `1px dashed #0078D4` border).
    - **Group Selection on Release**: On pointer release, all entities enclosed by or intersecting the marquee rectangle are selected via `selectionStore.selectMultiple(ids, isAdditive)`.
- [x] **10.2 Floating Selection Action Bar Event Interception Fix:**
  - Fix premature `clearSelection` in `CanvasViewport.tsx`: update interactive check from `#selection-overlay` to include `#wb-selection-container`, `#wb-selection-context-menu`, `[id^="wb-context-"]`, and `.wb-selection-action-btn`.
  - Add `onPointerDown={(e) => e.stopPropagation()}` on the floating context menu pill and all action buttons (Delete, Duplicate, Bring to Front, Send to Back, Change Color) so clicking them immediately executes the action without unmounting the menu.
- [x] **10.3 Seamless File & PDF Import (Zero-ESC Native Electron Dialogs):**
  - Implement native Electron IPC handlers (`file:open-image`, `file:open-document`) in `electron/main.cts` and `electron/preload.cts` using `dialog.showOpenDialog` to eliminate Chromium `<input type="file">` modal focus locks and focus traps.
  - Refactor `CreateFlyout.tsx`: trigger file pickers programmatically via buttons instead of wrapped `<label>`, auto-close the flyout upon triggering the file dialog, and add `onPointerDown={(e) => e.stopPropagation()}` to `PdfPagePickerModal` with clean Escape and outside-click dismiss.
- [x] **10.4 Whiteboard Picker Default Launch Route & Dark Mode Card Menu Contrast:**
  - Update `src/store/boardStore.ts`: set initial launch route to `currentView: 'gallery'` in `initialize()`, so the application always opens into the Whiteboard Picker (`BoardGallery`) whether boards exist or not.
  - Fix dark mode context menu contrast in `src/components/home/BoardCard.tsx`: define `--wb-menu-background` in `src/theme/tokens.ts` (`#FFFFFF` in light mode, `#252423` in dark mode) and style the dropdown menu with `1px solid var(--colorNeutralStroke1)` and `var(--colorNeutralForeground1)` for crisp readability.
- [x] **10.5 Electron Window Caption Buttons (Fitts's Law Full-Height & DWM No-Drag):**
  - Update `src/components/electron/WindowControls.tsx`: apply explicit `WebkitAppRegion: 'no-drag'` directly to each button.
  - Stretch window controls to the full header height (`height: 100%`, `minHeight: 40px`, `alignSelf: 'stretch'`) and place them flush against the top-right corner in both `TopBar.tsx` and `BoardGalleryHeader.tsx` so clicking the corner always triggers the Close button.
  - Ensure titlebars support double-clicking to toggle maximize/restore.

### Milestone 11: Interactive Canvas PDF Document Viewer (Scroll, Select, Copy & Ink Anchoring)
- [ ] **11.1 Embedded PDF Document Canvas Entity & Renderer:**
  - Create `PDFDocumentEntity` in `src/canvas/sceneGraph.ts` with `{ id, type: 'pdf_document', x, y, width, height, pdfUrl, pdfData, currentPage, totalPages, isLocked, isPinned }`.
  - Implement `src/components/canvas/PDFDocumentWidget.tsx`: render high-DPI PDF pages using `pdfjs-dist` with multi-page continuous vertical scroll or page-flip navigation bar.
- [ ] **11.2 Selectable & Copyable PDF.js Text Layer:**
  - Embed transparent PDF.js `textLayer` overlay aligned with rendered PDF canvas coordinates.
  - Enable native text selection, clipboard copy (`Ctrl+C`), and sentence highlighting when the `Select` tool is active.
- [ ] **11.3 Synchronized Inking & Coordinate Anchoring:**
  - Support inking over the PDF document: while in Pen, Highlighter, or Laser mode, pointer events draw directly on top of the document.
  - Anchor ink strokes to document world coordinates so scrolling or translating the PDF automatically keeps all notes and highlighters perfectly in place.

### Milestone 12: Distinct Inking Icons & Tool-Specific Custom Cursors
- [ ] **12.1 Distinct Chisel Highlighter & Refined Pen SVG Icons:**
  - Replace the generic highlighter icon with an authentic wide-body, chisel-cut fluorescent marker icon (`HighlighterIcon.tsx`).
  - Refine `PenIcon.tsx` with a distinct fine-point technical pen nib to prevent visual confusion between Pen and Highlighter slots.
- [ ] **12.2 Real-Time Dynamic Inking Cursors:**
  - Implement tool-specific cursors on the canvas:
    - **Pen**: Precision crosshair dot with a live ring matching the active pen's color swatch and thickness.
    - **Highlighter**: Semi-transparent rectangular chisel nib showing true stroke thickness & highlight color.
    - **Laser**: Glowing focal bead with pulsating core.
    - **Eraser**: Polish dynamic circular ring matching current velocity eraser radius.

### Milestone 13: Laser Pointer Active Tracking Cursor & Trail Glow Physics (REA Trace)
- [ ] **13.1 Active Hover Tracking Laser Focal Bead:**
  - Update `src/tools/LaserTool.ts` and `src/canvas/CanvasViewport.tsx` so the laser pointer never disappears when idle.
  - Render an active glowing laser focal point at pointer coordinates on hover, using authentic Fluent radial glow (`feGaussianBlur`, bright core `#FFFFFF`, outer saturated neon halo).
- [ ] **13.2 Ribbon Trail Drag Physics & Decaying Animation Sync:**
  - Interpolate pointer micro-batches into smooth ribbons with spring physics on pointer drag.
  - Maintain smooth 60fps decay tail (`requestAnimationFrame`) with automatic fade-out when pointer stops.

### Milestone 14: Dynamic Theme Paper Color & High-Contrast Grid Patterns
- [x] **14.1 Automatic Mode-Driven Canvas Surface & Palette Cleanup:**
  - Remove redundant "Canvas Paper Color" palette picker from `TopBar.tsx` Settings menu.
  - Automatically bind canvas surface to active Theme mode: pure crisp White (`#FFFFFF`) in Light Mode, deep slate (`#1E1E1E`) in Dark Mode.
- [x] **14.2 Adaptive High-Contrast Grid Math:**
  - Update `src/canvas/grid.ts` and `GridBackground.tsx` to ensure all 9 grid patterns (Dot, Cubic, Graph, Rule, Triangular, etc.) have crisp, legible contrast:
    - Light Mode: `#D2D0CE` lines / dots (never washed out).
    - Dark Mode: `#3B3A39` lines / dots (never dim or muddy).

### Milestone 15: Natural Navigation & Inking Gestures (Right-Click Pan & Middle-Click Erase)
- [ ] **15.1 Right-Click Hold & Drag Viewport Pan:**
  - In `src/canvas/CanvasViewport.tsx`, intercept pointerdown with `button === 2` (right click).
  - Suppress context menu during drag (`e.preventDefault()`) and smoothly translate the camera matrix in real time without having to switch to the Hand / Pan tool.
- [ ] **15.2 Middle-Click (Scroll Wheel) Hold & Drag Quick Erase:**
  - Intercept pointerdown with `button === 1` (middle click / scroll wheel).
  - Temporarily activate `EraserTool` at the cursor position and erase overlapping ink strokes/segments on drag.
  - Automatically revert to the previously active tool immediately upon pointer up.

### Milestone 16: Refined Keyboard Shortcuts (`Alt+W`, `Alt+X`) & TopBar Header Cleanup
- [x] **16.1 Re-map Ergonomic Shortcuts (`Alt+W` Pen 1, `Alt+X` Eraser) & Strict Shortcut Whitelist:**
  - Update `src/tools/ShortcutEngine.ts`: register `Alt+W` to activate Pen 1 (`inkingStore.selectPen('Pen1')`) and `Alt+X` to activate Eraser (`inkingStore.setSelectedTool('Eraser')`), with `e.preventDefault()`. Removed all non-whitelisted single-key shortcuts (V, S, H, P, 1-5, X, E, L, Q, R, N, T) and removed Ctrl+0 and bare +/-. Strictly preserved Ctrl++ / Ctrl+- (zoom), Ctrl+Z / Ctrl+Y (undo/redo), Ctrl+D (duplicate), Ctrl+A (select all), Delete / Backspace, and Escape.
  - Update shortcut badge tooltips in `InkToolbar.tsx`, `ZoomHUD.tsx`, and documentation table in `README.md`.
- [x] **16.2 TopBar Header Action Pruning:**
  - Remove dead/unused mockup buttons (`Copilot` and `Share`) and unused `CopilotIcon` import from `src/components/header/TopBar.tsx`.
  - Streamline header right section: Export menu ➔ Settings / Theme button ➔ Window caption controls with consistent gap and vertical centering.

### Milestone 17: "Enhance Inked Shapes" Engine & Settings Toggle (Inspect ➔ Trace ➔ Recreate)
- [ ] **17.1 REA Investigation & Evidence Trace for Shape Recognition:**
  - Inspect Blueboard bundle modules for shape recognition algorithms (`inkToShape`, `shapeRecognition`, corner detection, aspect ratio fitting).
- [ ] **17.2 Geometric Stroke Classification Engine:**
  - Implement `src/tools/ShapeRecognitionEngine.ts`:
    - Polygon vertex simplification (Ramer-Douglas-Peucker) for corner detection.
    - Geometric classifiers for Circle / Ellipse (circularity ratio 4*pi*area/perimeter^2), Rectangle / Square (4 perpendicular corners), Triangle (3 corners), Diamond, Straight Line, and Arrow.
- [ ] **17.3 Settings Toggle & Automatic Vector Shape Replacement:**
  - Add "Enhance inked shapes" toggle switch in `TopBar.tsx` Settings menu (persisted in `canvasStore`).
  - On pen stroke release, if enabled and confidence > 0.85, morph the rough stroke into a clean vector `ShapeEntity` preserving stroke color, thickness, and bounding box.

### Milestone 18: Individual Board Session Isolation & Pristine Board Initialization
- [ ] **18.1 Clean New Board Initialization:**
  - Ensure creating a new board opens in a pristine default state: Select tool default, ruler hidden (`isVisible: false`) and centered at angle 0°, camera matrix reset to `{ x: 0, y: 0, scale: 1.0 }`, and history stacks cleared.
- [ ] **18.2 Per-Board Canvas State Isolation:**
  - Extend `BoardCanvasData` in `src/store/boardStore.ts` to persist per-board ruler coordinates (`{ x, y, angle, isVisible }`) and camera state.
  - When switching between existing boards, restore each board's own isolated ruler and camera state without cross-board contamination.

### Milestone 19: Clear Canvas Action & Undo History Integration
- [x] **19.1 Connect Clear Canvas in EraserPopover:**
  - Fix `handleClearCanvas` in `src/components/toolbar/EraserPopover.tsx`: clear active selection with `selectionStore.clearSelection()`, call `sceneStore.clearEntities(true)`, immediately flush save to storage via `boardStore.flushSave()`, close popover, and trigger the feedback notification banner with an interactive Undo button.
- [x] **19.2 Undo/Redo Command History Integration & Fluent Toast Banner:**
  - Implement dedicated `ClearCanvasCommand` in `src/canvas/history.ts` storing the complete snapshot of cleared entities, ensuring invoking Undo (`Ctrl+Z`, TopBar Undo, or toast Undo button) flawlessly restores all previous canvas entities.
  - Implement reactive `toastStore` in `src/store/toastStore.ts` and floating Fluent Acrylic toast component in `src/components/common/Toast.tsx` mounted in `src/App.tsx`.

---

## 4. Session Handoff & Resume Tracker
> **Agent Note:** Always update these 3 fields before ending your response so the user can resume seamlessly after a rate limit or model switch.

- **Last Completed Sub-Task:** `19.2 Undo/Redo Command History Integration & Fluent Toast Banner (Milestone 19 complete)`
- **Current Active Sub-Task:** `Milestone 19 Complete, Ready for Milestone 11, 12, 13, 15, 17, or 18`
- **Next Recommended Prompt:** `"Read @Plan.md. Execute Milestone 12 (Distinct Inking Icons & Tool-Specific Custom Cursors) sequentially, verify with npm run build, update Section 2 and Section 4 in Plan.md, and stop."`