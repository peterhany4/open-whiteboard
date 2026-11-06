# Open Whiteboard — REA Investigation & Full Recreation Master Plan (`plan.md`)

## 1. Agent Operating Rules (STRICT QUOTA & STATE MACHINE PROTOCOL)
You are an AI coding agent connected to **REA (`morluto/rea`)** via MCP/CLI. Your mission is to reverse-engineer and build a pixel-accurate, full-featured local clone of **Microsoft Whiteboard** (including exact UI/UX, original SVG icons, Dark Mode, all inking/canvas tools, and local Image/PDF annotation).

**CRITICAL RULES FOR EVERY SESSION:**

### Part A: User-Mandated Development Lifecycle & Permission Gate (STRICT ENFORCEMENT)
- **Zero Unsolicited Implementation:** NEVER implement or modify code without explicit, written permission from the user.
- **Step 1 (Milestone Definition):** Propose or write the new milestone and its sub-tasks directly in `Plan.md`.
- **Step 2 (User Evaluation):** Stop and wait for the user to read, review, and evaluate the proposed milestone in `Plan.md`.
- **Step 3 (Prompt Generation):** When the user approves and specifies which milestone to proceed with, generate a complete, self-contained implementation prompt for that milestone. Always include GitHub commit and push as the standard final step (unless the user explicitly states otherwise).
- **Step 4 (User Prompt Review):** Stop and wait for the user to evaluate and approve the prompt.
- **Step 5 (Execution):** Only start implementing code after the user sends the prompt back or explicitly commands execution.

### Part B: Persistent Memory, Token Quota & REA Reverse-Engineering Protocol
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
| **Sticky Notes, Text & Shapes** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `8854.*.js`, `821516.*.js` | Modules 93425, 8854, 770023, 821516, 887699 | Sticky notes (200x200px, 8 Fluent pastel swatches: Yellow, Green, Blue, Pink, Purple, Orange, Grey, Charcoal, folded corner dog-ear shadow, inline textarea, reaction stamps), NoteGrid (editable title, responsive 3-column card flow, dynamic "+" Add Note button with automatic height expansion), PlainText (resizable, auto-wrapping, adaptive Light/Dark contrast), Geometric shapes (Rectangle, Circle, Diamond, Triangle, Parallelogram, Arrow, Line with cardinal border anchor dots and inline double-click text editing), Reactions & stickers (Like, Heart, Check, Question, Celebrate with entrance bounce) |
| **Image & PDF Layer Locking & Export** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `40049.*.js`, `8854.*.js`, `770023.*.js` | Modules 93425, 560673, 8854, 770023 | ImageWidget with authentic "Lock to Background" behavior (zIndex: 50, below inking layer, immune to accidental lasso/click selection and eraser clipping, acrylic unlock chip), file input/drag-and-drop/clipboard paste (Ctrl+V) for PNG, JPG, WEBP, SVG, Local PDF Importer & Page Picker Modal (pdfjs-dist, crisp 2x DPI thumbnails, Select/Deselect All, horizontal side-by-side / grid / vertical layout), spatial document anchoring (moving unlocked PDF/image translates all overlapping ink strokes, highlighters, and sticky notes), ExportEngine (High-Res 2x and Super-Res 3x PNG rasterization, standalone Vector SVG, and Annotated PDF binary export) |
| **Board Picker & Welcome Gallery** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/boardpicker.12301e16597e2cf06401.js`, `boardpicker-appbar.1bb2fcd98920ca196d3d.js`, `app-router.2afacb1fd044797c70a6.js` | Modules 517955, 796936, 179019, 795434, F.J | Board repository (IndexedDB/local multi-board persistence, auto-save, canvas snapshot serialization), BoardPicker gallery (recent boards grid, "+ Create new whiteboard" hero tile, card thumbnail preview, last modified timestamp, rename/duplicate/delete/export context menu), TopBar "< Back to My Whiteboards" navigation |
| **Select / Pan Navigation & Global Shortcuts** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/40049.7fda10c837609f18159b.js`, `91464.7aeadf3b6ddc55b8cdc3.js`, `BoardEditorComponent-84781932.a42f38c8c9aa0e756cd7.js` | Modules 179019, 40049, 804397, 84781932 | Select Tool (Arrow cursor, default mode on board entry, interactive clicks on canvas objects without ink stroke collision), Hand / Pan Tool (left-drag pan mode), comprehensive keyboard shortcuts engine (V/S=Select, H=Hand, P/1-5=Pens, X=Highlighter, E=Eraser, L=Lasso, R=Ruler, N=Note, T=Text, Ctrl+Z/Y, Ctrl+D, Ctrl+A, Delete, Esc, +/- zoom), shortcut badge tooltips |
| **Electron Desktop Packaging & Native Windows Integration** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/startup-nativewindows.bd7de3895048f6c0aadd.js`, `blueboard/chunks/appwrapper.14452b135005dd7a8466.js` | Modules startup-nativewindows, appwrapper, 939487 | Electron main/preload bridge, frameless acrylic/mica window styling with native Windows caption buttons (Minimize, Maximize/Restore, Close), AI image generation (`generate_image`) for custom app & installer branding + multi-resolution icon generation (.ico 16-256px from signature SVG), local filesystem save/load (.whiteboard project files), production packaging (electron-builder, NSIS Windows installer & portable exe) |
| **Selection Engine, Action Bar, Native Dialogs & UX Polish** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `BoardEditorComponent-84781932.*.js`, `boardpicker.*.js`, `appwrapper.*.js` | Modules 84781932, 179019, 517955 | Select Tool single-click hit testing & rectangular marquee group selection, floating context menu event propagation fix, native Electron file import without focus traps / ESC key, default launch to Board Picker, dark mode context menu contrast |
| **Interactive PDF Document Viewer** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `40049.*.js` | Modules 93425, 560673 | PDF.js continuous vertical multi-page viewer widget on canvas (full vertical height across all pages without internal scroll traps), selectable text layer with native copy-paste, coordinate-synchronized inking layer across all pages, spatial document anchoring |
| **Tool Cursors & Chisel Highlighter Icon** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/65345.*.js`, `45330.*.js` | Modules 65345, 807952 | Wide-body chisel-cut fluorescent marker icon, dynamic tool cursors (precision crosshair dot for pen, chisel nib bounding box for highlighter, rings for eraser) |
| **Laser Active Tracking & Glow Physics** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/65345.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 65345, 272120, 84781932 | Continuous hover tracking laser focal bead with radial Gaussian glow halo, decaying trail ribbon physics |
| **Adaptive Canvas Paper Theme & Grid Contrast** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/theme/tokens.ts`, `src/canvas/grid.ts` | Modules 517955 | Automatic Mode-Driven Canvas Surface (#FFFFFF in Light, #1E1E1E in Dark), crisp contrast grid lines (#D2D0CE Light, #3B3A39 Dark), removal of redundant paper color swatches |
| **Pro Navigation & Quick Inking Gestures** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/canvas/CanvasViewport.tsx`, `src/canvas/camera.ts` | Modules 84781932, 40049 | Right-click drag viewport pan with context menu suppression, middle-click (wheel) drag quick erase without tool switching |
| **Shortcuts & TopBar Action Cleanup** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/tools/ShortcutEngine.ts`, `src/components/header/TopBar.tsx` | Modules 40049 | Ergonomic shortcuts (Alt+W for Pen 1, Alt+X for Eraser), removal of unused mockup buttons (Copilot, Share) |
| **Enhance Inked Shapes (Ink-to-Shape)** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/45330.*.js`, `8854.*.js`, `93425.*.js` | Modules 40049, 45330, 8854, 84781932 | Geometric stroke classification (Circle, Ellipse, Rectangle, Square, Triangle, Diamond, Line), Settings toggle, conversion to mathematically straightened beautified InkStrokeEntity (AddBeautifiedInk) directly erasable with Stroke/Point eraser, dual-mode ShapeEntity hit-testing and in-shape text editing |
| **Board Session Isolation & Reset** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/store/boardStore.ts`, `src/store/inkingStore.ts` | Modules 517955, 795434 | Per-board ruler coordinates and camera matrix persistence, pristine initial state on new board creation (Select tool default, ruler hidden & centered, camera reset) |
| **Clear Canvas Action & History Integration** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `src/components/toolbar/EraserPopover.tsx`, `src/canvas/history.ts` | Modules 40049, 804397 | Clear Canvas action directly connected to sceneStore with undoable ClearCanvasCommand in history.ts |
| **Locked Object Selection & Unlock Action** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 93425, 84781932 | Inking mode pointerEvents isolation, Select mode locked entity selection state, one-click Unlock context action |
| **Sticky Note & Text Direct Inline Editing** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `8854.*.js` | Modules 93425, 8854, 770023 | Selection box interior pointer pass-through, click-to-edit focus lifecycle, textarea auto-expand, Escape blur |
| **Smart PDF Text Highlighting & Quick Bar** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/93425.*.js`, `65345.*.js` | Modules 93425, 65345 | PDF.js text layer selection coordinates, floating Fluent highlight/copy mini-bar, proximity snap-to-text line highlights |
| **PdfCraft Text Selection & Reading-Order Engine** | `C:\Program Files\PdfCraft\pdfcraft.exe` & `storytold/pdfcraft` | `crates/ui-egui/src/canvas.rs`, `crates/render/src/text.rs` | Magnetic line-lock with 3.0x vertical penalty (`nearest(x, y)`), continuous line rect merging (`merged_rects`), progressive multi-click expansion (1=char, 2=word, 3=line, 4=page), block/column select (`Alt` key), clean text reconstruction without ragged DOM artifacts |
| **Responsive Mobile UI & Graphic Tablet Inking Engine** | Microsoft Whiteboard Touch & Stylus Spec, W3C Pointer Events Level 3 | `CanvasViewport.tsx`, `PenTool.ts`, `InkToolbar.tsx`, `TopBar.tsx` | Touch-Action CSS Spec (`touch-action: none`), pointerType discrimination (`pen` vs `touch`), hardware palm rejection, two-finger pinch-to-zoom & pan, dynamic stylus pressure sensitivity (`p^0.75` stroke width modulation), horizontally scrollable mobile ink ribbon, collision-free HUD layout |
| **Toolbar Popovers Portals & Milestone 16 Shortcuts Restoration** | Microsoft Whiteboard Module 40049, 127580, 852bcd1f | `PenPopover.tsx`, `EraserPopover.tsx`, `InkToolbar.tsx`, `ShortcutEngine.ts` | React Portals to document.body, dynamic bounds clamping (shiftX), international keycode matching (e.code KeyZ/KeyY/KeyA), Alt+W (Pen 1) & Alt+X (Eraser), strict blocking of single-key shortcuts |
| **Universal Canvas Object Copy & Paste Engine** | Module 517955 & 84781932, W3C Async Clipboard API | `ShortcutEngine.ts`, `CanvasViewport.tsx`, `SelectionOverlay.tsx`, `selectionStore.ts` | Universal JSON entity clipboard serialization (`Ctrl+C`), spatial offset paste (`Ctrl+V`), atomic undoable duplicate/paste command groups, input isolation |
| **Galaxy & Rainbow Inking Robustness & Pattern Shading** | Module 133066, 4101 (`effectFile`, `userSpaceOnUse`, `fallbackColor`) | `CanvasEntities.tsx`, `CanvasViewport.tsx`, `PenTool.ts` | Persistent SVG defs, `userSpaceOnUse` gradient/pattern units eliminating 0-width vertical stroke invisibility, authentic fallback colors, translation color preservation |
| **Ink-to-Shape Precision Engine & Rounded Fillet Corners** | Module 40049 (`AddBeautifiedInk`, `WetShapeRecognitionHappened`) | `ShapeRecognitionEngine.ts`, `PenTool.ts` | Circle-first classification priority, removal of circle-hijacking rectangle heuristics, smooth circular corner fillet generation (`rx, ry` rounded heads) |
| **Microsoft Whiteboard Inking & Bezier Restoration** | Module 834265, 170887, 805859, 726577 | `PenTool.ts`, `CanvasEntities.tsx`, `CanvasViewport.tsx` | Pure Catmull-Rom cubic Bezier splines (C1 = P1 + (P2-P0)/6, C2 = P2 - (P3-P1)/6), elimination of jagged linear outline regression from Milestone 29, clean mouse/standard pen uniform width preservation, smooth Bezier pressure dynamics |
| **Natural Handwriting Engine (Bitangent Envelopes, Segment Folding & Velocity Calligraphy)** | `ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de` | `blueboard/chunks/45330.*.js`, `46977.*.js`, `BoardEditorComponent-84781932.*.js` | Modules 188610, 357044, 917068, 316556, 317294, 946193, 170887, 154175 | Authentic linear pressure affine curve R(p) = R_base * (1.5*p + 0.25) (Module 188610), circle bitangent envelope algorithm with circular joints (Module 357044), Schneider least-squares Bezier segment folding with scale-adaptive tolerance (Module 316556), collinear point simplifier (Module 317294), dynamic velocity calligraphy modulation for mouse/touch, velocity extrapolation stroke tip predictor (Module 170887), direct requestAnimationFrame inking render loop (Module 154175) |


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

### Milestone 11: Interactive Canvas PDF Document Viewer (Continuous Multi-Page Flow, Select, Copy & Ink Anchoring)
- [x] **11.1 Embedded PDF Document Canvas Entity & Continuous Multi-Page Renderer:**
  - Create `PDFDocumentEntity` in `src/canvas/sceneGraph.ts` with `{ id, type: 'pdf_document', x, y, width, height, title, pdfUrl, pdfData, currentPage, totalPages, isLocked, zIndex, bounds }`.
  - Implement `src/components/canvas/PDFDocumentWidget.tsx`: render all PDF pages vertically in a continuous layout directly on the canvas without internal scroll clipping or wheel traps; scrolling/panning the whiteboard naturally navigates through all pages; includes modern Fluent Acrylic header (title, PDF badge, total page count, fit/expand width toggle between 600px and 900px, lock/unlock, delete).
  - Compute total vertical height across all pages up-front in `insertPdfDocument` (`src/canvas/CanvasViewport.tsx`) and dynamically synchronize height upon rendering.
- [x] **11.2 Selectable & Copyable PDF.js Text Layer Overlay:**
  - Embed transparent PDF.js `textLayer` overlay on each page aligned with rendered PDF canvas coordinates.
  - Enable native text selection, clipboard copy (`Ctrl+C`), and sentence highlighting when the `Select` tool is active.
  - Tool-Mode Isolation: Apply `pointer-events: isSelectTool ? 'auto' : 'none'` on each page sheet so inking tools (`Pen`, `Highlighter`, `Laser`, `Eraser`) draw smoothly across pages without text selection interference.
- [x] **11.3 Synchronized Inking & Multi-Page Coordinate Anchoring:**
  - Support inking over any PDF page directly in canvas world coordinates without offset drift, with highlighters blending over document content (`multiply` in Light mode, `screen` in Dark mode).
  - Multi-Page Spatial Anchoring: Extend spatial document anchoring in `SelectionOverlay.tsx` to `pdf_document` entities so translating the document automatically detects and moves all overlapping ink strokes, highlighters, and notes across all pages in lockstep with full Undo/Redo integration.
- [x] **11.4 Multi-Page Selection, TextLayer Scale Alignment & Non-Blocking Overlay Fix:**
  - Fixed out-of-sync document bounds by measuring all page aspect ratios up front upon loading the document, immediately updating `height` and `bounds` in `sceneStore` so that `SelectTool` hit-testing and marquee selection accurately enclose all pages.
  - Eliminated the cancel loop in `PDFPageItem` by decoupling height measurement from page item effects, passing `height` directly as a prop with stable dependencies `[pdfDoc, pageNumber, width]`, ensuring all pages render their canvas and `TextLayer` without cancellation.
  - Configured required PDF.js v6 CSS variables (`--total-scale-factor`, `--min-font-size`, `--text-scale-factor`) on `.textLayer` in `index.css` and `PDFPageItem` for pixel-accurate font scaling and highlight dimensions.
  - Set `pointerEvents: 'none'` on `#wb-selection-box` when a PDF document is selected so the selection box does not shield pointer events from the text layer, enabling seamless text selection across all pages while keeping the acrylic header draggable for moving the document.

### Milestone 12: Distinct Inking Icons & Tool-Specific Custom Cursors
- [x] **12.1 Distinct Chisel Highlighter & Refined Pen SVG Icons:**
  - Replace the generic highlighter icon with an authentic wide-body, chisel-cut fluorescent marker icon (`HighlighterIcon.tsx`).
  - Refine `PenIcon.tsx` with a distinct fine-point technical pen nib to prevent visual confusion between Pen and Highlighter slots.
- [x] **12.2 Real-Time Dynamic Inking Cursors:**
  - Implement tool-specific cursors on the canvas:
    - **Pen**: Precision crosshair dot with a live ring matching the active pen's color swatch and thickness.
    - **Highlighter**: Semi-transparent rectangular chisel nib showing true stroke thickness & highlight color.
    - **Laser**: Glowing focal bead with pulsating core.
    - **Eraser**: Polish dynamic circular ring matching current velocity eraser radius.

### Milestone 13: Laser Pointer Active Tracking Cursor & Trail Glow Physics (REA Trace)
- [x] **13.1 & 13.2 (Retained & Settled in Milestone 12):**
  - Retained the responsive, instant 1:1 single-path laser trail with 3-pass Fluent glow (`feGaussianBlur` neon blur halo, bright neon core, white center highlight, leading focal bead, and 60fps decay animation loop over 1000ms with smoothstep easing) and live hover bead from Milestone 12.2.

### Milestone 14: Dynamic Theme Paper Color & High-Contrast Grid Patterns
- [x] **14.1 Automatic Mode-Driven Canvas Surface & Palette Cleanup:**
  - Remove redundant "Canvas Paper Color" palette picker from `TopBar.tsx` Settings menu.
  - Automatically bind canvas surface to active Theme mode: pure crisp White (`#FFFFFF`) in Light Mode, deep slate (`#1E1E1E`) in Dark Mode.
- [x] **14.2 Adaptive High-Contrast Grid Math:**
  - Update `src/canvas/grid.ts` and `GridBackground.tsx` to ensure all 9 grid patterns (Dot, Cubic, Graph, Rule, Triangular, etc.) have crisp, legible contrast:
    - Light Mode: `#D2D0CE` lines / dots (never washed out).
    - Dark Mode: `#3B3A39` lines / dots (never dim or muddy).

### Milestone 15: Natural Navigation & Inking Gestures (Right-Click Pan & Middle-Click Erase)
- [x] **15.1 Right-Click Hold & Drag Viewport Pan:**
  - In `src/canvas/CanvasViewport.tsx`, intercepted `pointerdown` with `e.button === 2` (right click): captures pointer, enters panning mode (`canvasStore.setIsPanning(true)`), updates cursor feedback to `'grabbing'`, and translates the camera matrix smoothly on drag without needing to switch to the Hand tool.
  - Suppressed the native browser context menu on the canvas surface and during/following right-click pan drags (`e.preventDefault()`).
- [x] **15.2 Middle-Click (Scroll Wheel) Hold & Drag Quick Erase:**
  - In `src/canvas/CanvasViewport.tsx`, intercepted `pointerdown` with `e.button === 1` (middle click / scroll wheel): saves the previously active tool, activates Quick Erase mode, and forwards pointer events directly to `eraserTool`.
  - Updated `src/tools/EraserTool.ts` to allow middle-click (`e.button === 1`) in `onPointerDown`, displaying the live velocity eraser ring overlay and erasing overlapping strokes/segments in real time with Undo/Redo integration.
  - Automatically commits erased strokes, cleanly dismisses the eraser ring overlay, and restores the user's previously active inking tool upon releasing the middle mouse button.

### Milestone 16: Refined Keyboard Shortcuts (`Alt+W`, `Alt+X`) & TopBar Header Cleanup
- [x] **16.1 Re-map Ergonomic Shortcuts (`Alt+W` Pen 1, `Alt+X` Eraser) & Strict Shortcut Whitelist:**
  - Update `src/tools/ShortcutEngine.ts`: register `Alt+W` to activate Pen 1 (`inkingStore.selectPen('Pen1')`) and `Alt+X` to activate Eraser (`inkingStore.setSelectedTool('Eraser')`), with `e.preventDefault()`. Removed all non-whitelisted single-key shortcuts (V, S, H, P, 1-5, X, E, L, Q, R, N, T) and removed Ctrl+0 and bare +/-. Strictly preserved Ctrl++ / Ctrl+- (zoom), Ctrl+Z / Ctrl+Y (undo/redo), Ctrl+D (duplicate), Ctrl+A (select all), Delete / Backspace, and Escape.
  - Update shortcut badge tooltips in `InkToolbar.tsx`, `ZoomHUD.tsx`, and documentation table in `README.md`.
- [x] **16.2 TopBar Header Action Pruning:**
  - Remove dead/unused mockup buttons (`Copilot` and `Share`) and unused `CopilotIcon` import from `src/components/header/TopBar.tsx`.
  - Streamline header right section: Export menu ➔ Settings / Theme button ➔ Window caption controls with consistent gap and vertical centering.

### Milestone 17: "Enhance Inked Shapes" Engine & Settings Toggle (Inspect ➔ Trace ➔ Recreate)
- [x] **17.1 REA Investigation & Evidence Trace for Shape Recognition:**
  - Inspected Blueboard bundle modules (Module 40049 and Module 84781932: `WetShapeRecognitionHappened`, `DrawAndHoldRecognitionHappened`, `AddBeautifiedInk`, `InkToShape`). Implemented a 100% offline, zero-latency client-side geometric recognition engine running instantly on `onPointerUp`.
- [x] **17.2 Geometric Stroke Classification Engine:**
  - Implemented `src/tools/ShapeRecognitionEngine.ts`:
    - Contour pre-filtering (point count, path length, and endpoint closure heuristics).
    - Ramer-Douglas-Peucker (RDP) adaptive polygon simplification.
    - Geometric classifiers for Circle / Ellipse (circularity $\ge 0.70$, low radial variance), Rectangle / Square (4 corners, $90^\circ \pm 25^\circ$ angles, aspect ratio square snap), Triangle (3 corners, angle sum $\approx 180^\circ$), Diamond (4 corners at cardinal midpoints), and Straight Line (straightness $\ge 0.92$, $7^\circ$ magnetic horizontal/vertical snapping).
- [x] **17.3 Settings Toggle & Beautified Ink Stroke Replacement:**
  - Added `isEnhanceInkedShapesEnabled` in `src/store/canvasStore.ts` (persisted in `localStorage` under `'wb-enhance-inked-shapes'`).
  - Added Fluent "Enhance inked shapes" toggle row in `TopBar.tsx` Settings popover.
  - In `src/tools/PenTool.ts` (`onPointerUp`), when enabled and ruler is inactive, recognized geometric strokes (confidence $\ge 0.85$) are automatically converted into mathematically straightened `InkStrokeEntity` strokes (Module 40049: `AddBeautifiedInk` / `LineModeStrokeCreated`) matching pen color and thickness. This ensures drawn shapes render on the SVG ink layer and are erased by both `StrokeEraser` and `PointEraser` just like normal pen handwriting.
  - In `src/tools/EraserTool.ts`, added boundary and area hit-testing for `ShapeEntity` widgets (e.g. shapes placed via the Create `+` menu), ensuring all shapes can be cleanly erased with the eraser.
  - In `src/components/canvas/ShapeWidget.tsx`, added double-click inline text editing with tool-mode pointer-event isolation (`pointerEvents: 'none'` during inking so pen strokes across shapes draw without interference).

### Milestone 18: Individual Board Session Isolation & Pristine Board Initialization
- [x] **18.1 Clean New Board Initialization:**
  - Added `rulerEngine.reset(x, y, angle, isVisible)` to reset ruler position, angle (0°), and visibility (`false`) in `src/tools/RulerEngine.ts`.
  - Updated `createNewBoard` in `src/store/boardStore.ts` to ensure creating a new board opens in a pristine default state: Select tool default (`inkingStore.selectTool('Select')`), active popovers closed (`inkingStore.closePopover()`), entity selection cleared (`selectionStore.clearSelection()`), ruler hidden and centered at angle 0° (`rulerEngine.reset(0, 0, 0, false)`), camera matrix reset to 100% `{ scale: 1.0, positionX: 0, positionY: 0 }`, and history stacks cleared (`historyManager.clear()`).
- [x] **18.2 Per-Board Canvas State Isolation:**
  - Defined `BoardRulerData` and extended `BoardCanvasData` in `src/store/boardStore.ts` to persist per-board ruler coordinates (`{ x, y, angle, isVisible }`) and camera matrix (`{ scale, positionX, positionY }`).
  - Updated `flushSave` and `beforeunload` to persist current camera and ruler state alongside entities and grid pattern.
  - Updated `openBoard(id)` to save current board before switching, clear selection/history/popovers, reset tool to `'Select'`, and restore the target board's isolated camera, ruler, grid pattern, and entities.
  - Updated `duplicateBoard(id)` and `importBoard(title, canvasData)` to clone/isolate camera and ruler configurations.
  - Updated `deleteBoard` to reset camera, ruler, history, selection, and tools to pristine default when no boards remain.

### Milestone 19: Clear Canvas Action & Undo History Integration
- [x] **19.1 Connect Clear Canvas in EraserPopover:**
  - Fix `handleClearCanvas` in `src/components/toolbar/EraserPopover.tsx`: clear active selection with `selectionStore.clearSelection()`, call `sceneStore.clearEntities(true)`, immediately flush save to storage via `boardStore.flushSave()`, close popover, and trigger the feedback notification banner with an interactive Undo button.
- [x] **19.2 Undo/Redo Command History Integration & Fluent Toast Banner:**
  - Implement dedicated `ClearCanvasCommand` in `src/canvas/history.ts` storing the complete snapshot of cleared entities, ensuring invoking Undo (`Ctrl+Z`, TopBar Undo, or toast Undo button) flawlessly restores all previous canvas entities.
  - Implement reactive `toastStore` in `src/store/toastStore.ts` and floating Fluent Acrylic toast component in `src/components/common/Toast.tsx` mounted in `src/App.tsx`.

### Milestone 20: Locked Object Selection, Visual Feedback & One-Click Unlock
- [x] **20.1 Fix Locked Pointer Trap & Transparent Image Rendering:**
  - In `src/components/canvas/ImageWidget.tsx`:
    - Fix the CSS pointer-events trap: in inking modes (`Pen`, `Highlighter`, `Laser`, `Eraser`), apply `pointerEvents: 'none'` so drawing over locked photos/diagrams has zero interference.
    - In `Select` mode, keep `pointerEvents: 'auto'` on the widget container so hovering and clicking are always detected.
    - Removed intrusive badge overlays ("Locked to Background" / "Lock to Background" message pills) from the image surface; locking and unlocking are controlled cleanly via the top selection context bar (`#wb-context-lock`) and right-click context menu.
    - Eliminated white background and letterbox bars on image resize by setting `backgroundColor: 'transparent'` and `objectFit: 'fill'`, and adding proportional aspect ratio preservation on corner handle resize in `SelectionOverlay.tsx`.
- [x] **20.2 Selection Tool & Overlay Locked State Integration:**
  - In `src/tools/SelectTool.ts`:
    - Allow clicking locked entities in `Select` mode to select them in a designated locked state (`selectionStore.select(entity.id)`).
  - In `src/components/canvas/SelectionOverlay.tsx`:
    - When a selected entity is locked:
      - Hide resize handles and rotation stem.
      - Render a distinct subtle dashed border (`1.5px dashed rgba(0, 120, 212, 0.7)`).
      - In the floating context menu pill, highlight the Lock button as active with a prominent **"Unlock from Background"** action that unlocks the entity and returns it to standard movable/resizable state with full Undo/Redo (`Ctrl+Z`).

### Milestone 21: Sticky Note & Text Box Seamless Editing & Pointer Pass-Through
- [x] **21.1 Selection Overlay Interior Pointer Pass-Through:**
  - In `src/components/canvas/SelectionOverlay.tsx`:
    - When a single text-editable entity (`note`, `text`, or `shape`) is selected, set `pointerEvents: 'none'` on the interior body of `#wb-selection-box` while keeping the outer border and handles interactive (`pointerEvents: 'auto'`).
    - This allows all clicks, text selections, and typing events inside the note/text box to reach the `<textarea>` unimpeded without losing selection.
- [x] **21.2 Natural Click-to-Edit & Textarea Focus Lifecycle:**
  - In `src/components/canvas/StickyNoteWidget.tsx` and `src/components/canvas/TextBoxWidget.tsx`:
    - When an already-selected note or text box is clicked, immediately focus into the `<textarea>` and activate editing mode (`isEditing: true`).
    - Add Escape key listener to exit editing mode cleanly and commit text changes to `sceneStore` with full Undo/Redo history.
    - Ensure dynamic text auto-wrapping and height expansion so multi-line text expands smoothly as the user types.

### Milestone 22: Smart PDF Text Highlighting (Snap-to-Text & Quick Highlight Toolbar)
- [x] **22.1 PDF Text Layer Selection Toolbar (Edge/Acrobat Style):**
  - In `src/components/canvas/PDFDocumentWidget.tsx`:
    - When the user selects text across PDF pages in `Select` mode, calculate the screen bounding box of the selection and display a floating Fluent mini-toolbar.
    - Include:
      - Quick Highlight color pills (Fluorescent Yellow, Green, Cyan, Pink).
      - "Copy Text" button (`Ctrl+C`).
    - Clicking a highlight color automatically generates a straight, aligned `InkStrokeEntity` or highlight segment matching the exact line bounds of the selected words.
- [x] **22.2 Smart Snap-to-Text when Drawing with Highlighter Tool:**
  - In `src/tools/HighlighterTool.ts`:
    - When drawing over a PDF document, check if the stroke intersects PDF text lines within a proximity tolerance ($\approx 12\text{px}$).
    - If dragging along a line of text, automatically snap the highlighter trajectory to the exact horizontal baseline and height of the printed text line, producing crisp, professional document highlights while keeping freehand drawing in margins and diagrams.

### Milestone 23: PDF Text Selection Visuals & High-Legibility Highlighter Palette
- [x] **23.1 Fix PDF.js Text Selection Double-Letter Ghosting:**
  - In `src/index.css`:
    - Add `-webkit-text-fill-color: transparent !important` to `.textLayer span`, `.textLayer ::selection`, and `.textLayer span::selection`.
    - Set `caret-color: transparent !important` so dragging selections does not render blinking carats or glyph artifacts.
    - Tune `.textLayer ::selection` background to authentic Fluent translucent selection blue (`rgba(0, 120, 215, 0.22)`).
    - This eliminates browser selection text overdraw and prevents letters from appearing twice or misaligned over the underlying high-DPI PDF canvas.
- [x] **23.2 High-Legibility Edge/Acrobat Pastel Highlighter Palette:**
  - In `src/components/canvas/PDFDocumentWidget.tsx`:
    - Replace the harsh, dark, saturated colors (`#00CC6A`, `#FF007F`, `#00BCF2`) with calibrated, high-luminance Edge/Acrobat pastel highlighter tones:
      - Soft Yellow: `#FFE843`
      - Soft Mint Green: `#95F09B`
      - Soft Sky Cyan: `#7AE3FF`
      - Soft Pastel Pink: `#FF9EC6`
      - Soft Lavender: `#D4B8FF`
    - Update floating toolbar color pills to display these authentic pastel swatches with subtle borders (`1px solid rgba(0, 0, 0, 0.12)`).
  - In `src/canvas/CanvasEntities.tsx`, `src/canvas/CanvasViewport.tsx`, and `src/tools/ExportEngine.ts`:
    - Calibrate highlighter stroke opacity (`0.38` in light mode, `0.55` in dark mode) so black text maintains maximum contrast and remains 100% crystal-clear and effortlessly readable beneath the highlight.

---

### Milestone 24: Inking Layer Hierarchy (Highlighters Behind Words), Viewport-Centered Ruler & Complete Tool Defaults Reset
- [x] **24.1 Highlighters Layer Rendering Behind Words & Text Entities:**
  - In `src/canvas/CanvasEntities.tsx`:
    - Separate highlighter strokes from pen strokes into a dedicated background highlight layer (`#highlighterLayerSvg` with `zIndex: 90` rendered beneath text widgets and text containers), while regular pen strokes remain on `#inkLayerSvg` (`zIndex: 200` above widgets).
    - Apply `mix-blend-mode: multiply` on the highlighter layer and optimize stacking context isolation so that text characters in PDF documents, Sticky Notes, and Text Boxes sit 100% crisp, pure, and untouched on top of the soft pastel highlight without any letter discoloration.
  - In `src/canvas/CanvasViewport.tsx`:
    - Update `#liveHighlighterOverlay` to render with `mix-blend-mode: multiply` at the background highlight layer depth so active highlighter inking immediately appears behind the text without obscuring letter glyphs.
  - In `src/components/canvas/PDFDocumentWidget.tsx`:
    - Ensure both quick selection highlights and pen highlighter strokes over PDF documents render seamlessly behind printed text vectors and characters.
- [x] **24.2 Viewport-Centered Ruler Activation & Toggle:**
  - In `src/tools/RulerEngine.ts`:
    - Implement `centerOnCamera(camera, windowWidth, windowHeight)` to compute the world coordinate center of the active camera viewport:
      $$\text{worldX} = (\text{windowWidth} / 2 - \text{camera.positionX}) / \text{camera.scale}$$
      $$\text{worldY} = (\text{windowHeight} / 2 - \text{camera.positionY}) / \text{camera.scale}$$
    - Update `toggle(camera)` and `reset()` so that whenever the ruler is toggled ON without prior on-screen coordinates, it automatically appears centered directly inside the user's visible screen at angle 0° rather than at world `(0, 0)`.
  - In `src/components/toolbar/InkToolbar.tsx`:
    - Pass current camera state to `rulerEngine.toggle()` so activating the ruler via the toolbar centers it instantly in the user's view.
- [x] **24.3 Complete Inking & Tool Defaults Reset on Pristine Board Creation:**
  - In `src/store/inkingStore.ts`:
    - Add `resetToDefaults()` method to restore all pen slots (Pen1–Pen5, PenEffect colors, thicknesses, arrow modes, recent colors), highlighter (default `#FCFC00`, thickness 16), laser (`#E3182D`, thickness 4), eraser (`PointEraser`), active tool (`Select`), and close any open popover.
  - In `src/store/boardStore.ts`:
    - In `createNewBoard()`, invoke `inkingStore.resetToDefaults()` so every newly created board starts with pristine factory defaults across all tools, pen colors, sizes, and highlighter settings.
    - Also invoke `resetToDefaults()` in `deleteBoard()` when all boards are cleared.

---

### Milestone 25: Custom Vector Selection Overlay, In-Page Highlight Annotations & Granular Undo History
- [x] **25.1 Custom Vector Text Selection Overlay (Acrobat / Google Docs Architecture):**
  - In `src/index.css`:
    - Set `.textLayer ::selection, .textLayer span::selection { background: transparent !important; color: transparent !important; -webkit-text-fill-color: transparent !important; }`.
    - Completely hide native Chromium selection background to prevent Chromium from forcibly overdrawing text characters with fallback system fonts.
  - In `src/components/canvas/PDFDocumentWidget.tsx`:
    - Implement an in-page vector selection overlay rendering Fluent translucent blue boxes (`rgba(0, 120, 215, 0.22)`) over the active selection range rects.
    - Completely eliminate double-letter artifacts and kerning mismatches while keeping native selection, double-click word selection, and clipboard copy (`Ctrl+C`) 100% functional.
- [x] **25.2 Structured Page-Relative Highlight Annotations (Acrobat / Edge Standard):**
  - In `src/canvas/sceneGraph.ts`:
    - Define `PDFHighlightAnnotation` interface (`id`, `pageNumber`, `color`, `rects: { relX, relY, width, height }[]`, `createdAt`).
    - Add `highlights?: PDFHighlightAnnotation[]` to `PDFDocumentEntity`.
  - In `src/components/canvas/PDFDocumentWidget.tsx`:
    - In `PDFPageItem`, render `<svg className="wb-pdf-page-highlights">` positioned directly between the PDF page canvas and the selectable text layer (`zIndex: 1`, beneath `.textLayer` at `zIndex: 2`) with `mix-blend-mode: multiply`.
    - Ensure highlights are physically underneath the text layer, guaranteeing pure vector black text glyphs with zero discoloration.
    - Because highlights are page-relative child elements of the page card, they move, lock, and scale (600px ↔ 900px) natively with the PDF document with zero offset or drift.
    - Support freehand highlighter drawing over PDF pages by mapping intersecting strokes into page-relative highlight annotations.
- [x] **25.3 Granular One-by-One Undo/Redo (Ctrl+Z / Ctrl+Y) for PDF Highlights:**
  - In `src/components/canvas/PDFDocumentWidget.tsx`:
    - Fix highlight history recording so each highlight addition records an isolated, granular command in `historyManager` (`execute: addHighlight`, `undo: removeHighlight`).
    - Ensure pressing `Ctrl+Z` removes **strictly the last highlight added**, never wiping out all prior highlights on the document.
    - Support full one-by-one redo (`Ctrl+Y`).

---

### Milestone 26: Unified Single-Keydown Undo Engine & Microsoft Whiteboard Layered Objects Architecture
- [x] **26.1 Single Authority Undo/Redo Engine (Eliminate Double Undo on Ctrl+Z):**
  - In `src/canvas/history.ts`:
    - Remove the duplicate global `window.addEventListener('keydown')` listener (lines 74–105).
    - Retain custom window event listeners (`wb-undo` and `wb-redo`) so TopBar buttons, Eraser popover, and `ShortcutEngine` dispatch directly to `historyManager`.
  - In `src/tools/ShortcutEngine.ts`:
    - Confirm `ShortcutEngine` remains the single global authority for keyboard shortcuts, cleanly dispatching `canvasStore.triggerUndo()` and `triggerRedo()` exactly once per keypress while respecting active text inputs.
- [x] **26.2 Microsoft Whiteboard Layered Objects Hit-Testing & Selection Passing:**
  - Reverse-Engineered REA Architecture (`BoardEditorComponent-852bcd1f`, `32660`, `69997`):
    - In Microsoft Whiteboard, overlapping objects are resolved by stacking order (`zIndex`). The selection bounding box does not block pointer events for entities visually on top of the selected object.
    - When clicking within an object's bounding box, hit-testing prioritizes the top-most z-index entity under the cursor. If an unselected entity (e.g., Text, Sticky Note, Shape, Reaction) sits on top of a selected object (e.g., Image), clicking immediately transfers selection to that top entity.
  - In `src/components/canvas/SelectionOverlay.tsx`:
    - In `handleBodyPointerDown`: Perform a spatial hit-test at pointer world coordinates against all scene entities in descending visual order (`a.zIndex - b.zIndex`).
    - If an entity under the cursor has a higher `zIndex` than the currently selected entity, or is an unselected entity on top, immediately transfer selection to it (`selectionStore.select(topEntity.id, isAdditive)`).
    - If the user double-clicks, immediately activate inline editing for editable entities (Text, Notes, Shapes).
    - If the pointerdown hits the selected entity with no overlapping top entity, proceed seamlessly with move/translation dragging.
  - In `src/components/canvas/ImageWidget.tsx`:
    - Fix container element id from `id="image-${image.id}"` to `id="wb-image-${image.id}"` to match `CanvasViewport`'s interactive selector `[id^="wb-image-"]`.
    - Harmonize pointerdown and click event bubbling across all canvas widgets (`ImageWidget`, `TextBoxWidget`, `StickyNoteWidget`, `ShapeWidget`, `ReactionWidget`).
- [x] **26.3 Complete Object Z-Ordering (Bring to Front, Send to Back & Fluent Shortcuts):**
  - Reverse-Engineered REA Evidence (`69997`, `8854`, `BoardEditorComponent-852bcd1f`):
    - Target methods: `bringToFrontMethod` (`bringToFrontAction`), `sendToBackMethod` (`sendToBackAction`), shortcuts: `Ctrl+Shift+]` / `}` (Bring to Front) and `Ctrl+Shift+[` / `{` (Send to Back).
  - In `src/store/sceneStore.ts`:
    - Implement `bringToFront(ids: string[])`: Elevates entities to `maxZ + 1`, recorded in `historyManager` undo groups.
    - Implement `sendToBack(ids: string[])`: Lowers entities to bottom-most unlocked layer (above background/locked entities at `zIndex: 50`, setting minimum `zIndex: 60`), recorded in `historyManager`.
    - Implement `bringForward(ids: string[])` and `sendBackward(ids: string[])` for step-wise layer adjustments.
  - In `src/components/canvas/SelectionOverlay.tsx`:
    - Connect `#wb-context-front` and `#wb-context-back` context menu buttons directly to `sceneStore.bringToFront` and `sceneStore.sendToBack`.
  - In `src/tools/ShortcutEngine.ts`:
    - Add global keyboard shortcuts:
      - `Ctrl+]` and `Ctrl+Shift+]` (or `}`): Bring to Front.
      - `Ctrl+[` and `Ctrl+Shift+[` (or `{`): Send to Back.
- [x] **26.4 Automated Test Verification & Clean Production Build:**
  - Create `scratch/test_milestone26_undo_and_layering.js` validating:
    1. Single Undo on `Ctrl+Z`: exactly 1 action popped per keypress.
    2. Layered Object Hit-Testing: clicking Text over an Image transfers selection directly to Text without needing to lock the image.
    3. Z-order reordering: `bringToFront` and `sendToBack` update stacking order cleanly above locked background items.
  - Run test suite with Node.js and verify `npm run build` passes with 0 TypeScript errors.

---

### Milestone 27: Unified Object Lifecycle (Universal Lock/Unlock Standard & Right-Click Context/Pan Parity)
- [x] **27.1 Microsoft Whiteboard Right-Click Interaction Parity (Single-Click Context Menu vs Drag Panning):**
  - Reverse-Engineered REA Architecture (`BoardEditorComponent-852bcd1f`, `722545`, `731369`):
    - Mouse button 2 (`pointerdown` with `e.button === 2`): Records start pointer coordinates without immediately locking the viewport into drag mode.
    - Pointer move: If the cursor travels beyond the drag threshold (`> 3px`), engage canvas pan with the grabbing hand cursor and update camera matrix coordinates.
    - Pointer up:
      - If dragged $\rightarrow$ cleanly terminates viewport pan; suppresses context menu.
      - If released without dragging (`dist <= 3px`, single right-click tap):
        - Hit-tests the canvas at pointer world coordinates.
        - If an entity is under the cursor: selects that entity (or keeps it selected if already selected) and displays its floating context menu (`#wb-selection-context-menu`).
        - If empty canvas: deselects all objects.
  - In `src/canvas/CanvasViewport.tsx`:
    - Refactor right-click pointer handling to distinguish single right-click tap (select & show context options) from right-click drag pan (viewport navigation).
- [x] **27.2 Universal Object Lock/Unlock Lifecycle (Selectable Locked Objects, Dashed Outline & Unlock Button):**
  - Standardize behavior across ALL canvas entities (Images, Sticky Notes, Text boxes, Shapes, Reactions, Note Grids, Documents):
    - In `src/tools/SelectTool.ts`:
      - Update `findTopEntityAtPoint` to use two-pass hit-testing:
        - Pass 1: Prioritize topmost unlocked entity under the cursor.
        - Pass 2: Fallback to topmost locked entity under cursor if no unlocked entity is present.
    - In `src/components/canvas/SelectionOverlay.tsx`:
      - Remove `selectionStore.clearSelection()` in `handleToggleLock` so locking keeps the object selected.
      - Render locked selection with Fluent dashed outline (`1.5px dashed rgba(0, 120, 212, 0.7)`), hide resize & rotation handles, and disable drag translation.
      - In `#wb-selection-box`, preserve selection when clicking inside a locked object, while allowing selection transfer if an unlocked entity sits on top.
      - Ensure the Unlock button (`<UnlockIcon />`) in the context bar unlocks the object on click.
    - In `src/tools/ShortcutEngine.ts`:
      - Add global `Ctrl+L` shortcut to toggle lock/unlock on all selected entities.
- [x] **27.3 Eliminate ImageWidget-Specific Hacks & Standardize All Canvas Entities:**
  - In `src/components/canvas/ImageWidget.tsx`:
    - Remove the hardcoded, non-standard `onContextMenu={handleToggleLock}`.
    - Remove `if (!isLocked)` in `handlePointerDown` so locked images can be selected with left-click like all other entities.
    - Remove redundant local `handleToggleLock` in favor of universal `SelectionOverlay` and `ShortcutEngine` actions.
- [x] **27.4 Automated Test Verification & Clean Production Build:**
  - Create `scratch/test_milestone27_lock_and_rightclick.js` verifying:
    1. Right-click tap selects an object; right-click drag pans the viewport.
    2. Locking an object retains selection with dashed border and exposes the Unlock action.
    3. Re-selecting a locked object works via left-click or right-click.
    4. Unlock action (context button or `Ctrl+L`) restores unlocked state across all object types.
  - Run test suite with Node.js and verify `npm run build` passes with 0 TypeScript errors.

---

### Milestone 28: PdfCraft-Engineered Reading-Order PDF Selection Engine (Magnetic Line Lock, Multi-Click Expansion & Clean Line Merging)
- [x] **28.1 Target Architecture & Algorithms Extraction (PdfCraft REA Analysis):**
  - Reverse-Engineered from `C:\Program Files\PdfCraft` (PE x86_64, ArtCraft Team) and open-source Rust workbench (`storytold/pdfcraft`):
    - `crates/render/src/text.rs`:
      - `nearest(x, y)` with **3.0x vertical distance penalty**: `dist = dx + 3.0 * dy`. Prevents horizontal text selection drag from jumping erratically to lines above or below when slight pointer vertical jitter occurs.
      - `merged_rects` / `line_rects`: Iterates over selected glyphs on the same line, merging adjacent or consecutive glyphs into single, continuous vector highlight rectangles (`union(rect, &g.rect)`).
      - `word_at(page, idx)` and `line_at(page, idx)`: Resolves word and line boundaries by whitespace and line cluster analysis.
      - `column_text` / `Span::Column`: Spatial bounding-box glyph gathering with tab-separated column formatting.
    - `crates/ui-egui/src/canvas.rs`:
      - `selection_drag` state machine: Tracks `start_glyph`, `current_glyph`, and `click_unit`.
      - Multi-click progression: 1 click = Character, 2 clicks = Word (`word_at`), 3 clicks = Line (`line_at`), 4 clicks = Whole Page. Dragging after double/triple-click expands the selection in units of words or lines rather than raw characters.
- [x] **28.2 Dedicated PDF Text Layout & Hit-Testing Module (`src/components/canvas/pdfTextLayout.ts`):**
  - Implement a high-performance text layout engine for PDF pages:
    - Extract structured glyphs / character tokens from PDF.js `textContent` (`items` with `transform`, `width`, `height`, and `str`).
    - Build normalized character array `PDFGlyphItem[]` with `relX`, `relY`, `width`, `height`, `char`, `lineIndex`, and `wordIndex`.
    - Implement `findNearestGlyph(x, y, glyphs)` applying PdfCraft's exact algorithm:
      - If point is inside glyph quad: direct hit (distance = 0).
      - If outside: compute horizontal distance `dx` and vertical distance `dy`, returning the minimum weighted score `dx + 3.0 * dy`.
    - Implement `computeMergedLineRects(glyphs, startIndex, endIndex)`:
      - Groups selected glyphs by `lineIndex`.
      - Computes exactly ONE unbroken bounding rectangle per line.
    - Implement semantic boundary helpers:
      - `getWordRangeAt(glyphs, index)`: Scans outward to preceding/succeeding whitespace or punctuation.
      - `getLineRangeAt(glyphs, index)`: Returns all glyphs sharing the same `lineIndex`.
      - `extractCleanText(glyphs, startIndex, endIndex)`: Formats clean text with appropriate spacing and newlines for clipboard copy (`Ctrl+C`).
- [x] **28.3 Direct Pointer-Driven Selection Engine & Fluent Overlay in `PDFDocumentWidget.tsx`:**
  - Transition from native DOM browser selection traps to direct canvas-level pointer tracking:
    - In `PDFPageItem`:
      - Wire `onPointerDown`, `onPointerMove`, and `onPointerUp` on the page card when in `Select` mode (`pointerId` capture).
      - Track click timestamps to detect single, double, triple, and quadruple clicks:
        - 1 click: Drag selects character-by-character with 3.0x magnetic line lock.
        - 2 clicks (double-click): Selects word and dragging expands word-by-word.
        - 3 clicks (triple-click): Selects full line and dragging expands line-by-line.
        - 4 clicks: Selects entire page.
      - Option/Alt key support: rectangular block selection across columns.
    - Render in-page vector selection overlay:
      - Render crisp Fluent translucent blue rectangles (`rgba(0, 120, 215, 0.22)`) directly inside the page's SVG/vector layer using the merged line rects.
      - Completely eliminate kerning mismatches, overlapping boxes, and double-letter artifacts.
    - Integrate with Quick Bar & Page Highlights:
      - Floating Quick Bar appears smoothly at selection end with 5 pastel highlight pills, `Copy (Ctrl+C)`, and `Dismiss (Esc)`.
      - Clicking a highlight color creates structured `PDFHighlightAnnotation` rects derived directly from `computeMergedLineRects`, guaranteeing 100% pixel alignment between selection preview and permanent highlight!
    - Clipboard Synchronization:
      - Register document-level `copy` listener (`Ctrl+C`) to copy `extractCleanText` to system clipboard.
- [x] **28.4 Automated Test Verification & Clean Production Build:**
  - Create `scratch/test_milestone28_pdfcraft_selection.js` verifying:
    1. Magnetic Line Lock: vertical jitter of ±5px on a line does not cause premature jump to adjacent line due to 3.0x penalty.
    2. Continuous Line Merging: consecutive glyphs on the same line produce exactly 1 unified rect, not N fragmented rects.
    3. Multi-Click Unit Expansion: double-click extracts word boundaries, triple-click extracts full line boundaries.
    4. Text Extraction & Clipboard: `extractCleanText` reconstructs words and newlines cleanly without missing whitespace.
  - Run test suite with Node.js and verify `npm run build` passes with 0 TypeScript errors.

---

### Milestone 29: Responsive Mobile UI & Graphic Tablet Inking Engine (Stylus Discrimination, Hardware Palm Rejection, Pressure Dynamics & Responsive Ribbon)
- [x] **29.1 Canvas Viewport Touch/Stylus Discrimination & Hardware Palm Rejection:**
  - W3C Pointer Events Level 3 & Mobile Viewport CSS:
    - Add `touchAction: 'none'` across the canvas container and `#whiteboard-canvas-root` to completely block mobile browser pull-to-refresh, address-bar jitter, swipe-navigation, and default pinch-zoom gestures.
    - Set `-webkit-user-select: none; user-select: none; -webkit-touch-callout: none;` on canvas interactions.
  - Pointer Event Routing in `src/canvas/CanvasViewport.tsx`:
    - Track active pointer types: `e.pointerType === 'pen'`, `'touch'`, or `'mouse'`.
    - **Hardware Palm Rejection**: When a `pen` pointer is active (`isPenActive`), discard or suppress all simultaneous `'touch'` pointer events so palms resting on the tablet screen do not trigger stray strokes or accidental canvas panning.
    - **Touch vs Stylus Discrimination**:
      - If `e.pointerType === 'pen'`: Routes directly to the active inking tool (`penTool`, `highlighterTool`, `eraserTool`, etc.).
      - If `e.pointerType === 'touch'`: Respect `inkWithTouch` setting (stored in `inkingStore.ts`).
        - If `inkWithTouch === false` (default for graphic tablet and stylus workflow): Single touch pans the canvas; multi-touch (2+ fingers) pinch-zooms and pans seamlessly.
        - If `inkWithTouch === true`: Single touch draws ink, but if a 2nd touch pointer arrives (`activeTouches.size >= 2`), immediately abort/cancel the in-progress single-touch stroke without leaving stray ink dots, and smoothly transition to two-finger pan/pinch-zoom.
  - In `src/store/inkingStore.ts`:
    - Add `inkWithTouch: boolean` state (default `false` for dedicated stylus/tablet mode with auto-detection).
    - Add `setInkWithTouch(enabled: boolean)` action and persist preference in `localStorage`.
- [x] **29.2 Dynamic Real-Time Pressure Sensitivity for Graphic Tablets:**
  - Hardware Stylus Pressure Tracking:
    - In `src/tools/PenTool.ts`:
      - Extract `e.pressure` from W3C Pointer Events.
      - Apply calibrated power curve: `p_norm = p > 0 ? Math.pow(p, 0.75) : 0.5`.
      - Compute dynamic variable thickness: `width_i = baseWidth * (0.35 + 0.65 * p_norm)`.
      - Store per-point pressure / width in `InkPoint` (`pressure: number`, `width?: number`).
      - Apply smooth calligraphic tapering at stroke entry and exit (velocity & pressure easing).
  - Variable-Width Stroke Rendering:
    - In `src/canvas/CanvasEntities.tsx`:
      - For strokes with variable pressure points, generate dynamic outline polygon geometry or variable-width stroke segments using the smooth Catmull-Rom sampled points, rendering fluid calligraphic lines on graphic tablets (Wacom, Apple Pencil, Surface Pen, S-Pen).
      - Maintain full backward compatibility for static-width strokes and highlighter strokes.
    - In `src/tools/ExportEngine.ts`:
      - Ensure high-res PNG and PDF export accurately preserves variable-thickness pressure strokes.
- [x] **29.3 Horizontally Scrollable Mobile Inking Ribbon & Popover Clamping:**
  - In `src/components/toolbar/InkToolbar.tsx`:
    - Mobile Responsive Layout:
      - Constrain width on small screens: `max-width: calc(100vw - 24px)`.
      - Make toolbar horizontally scrollable on mobile: `overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -webkit-overflow-scrolling: touch;`.
      - Add dynamic gradient edge masks (`mask-image: linear-gradient(...)`) indicating scrollability when content overflows.
      - Ensure 44x44px touch targets compliant with mobile accessibility standards.
  - In `src/components/toolbar/PenPopover.tsx`, `HighlighterPopover.tsx`, `EraserPopover.tsx`:
    - Viewport Clamping:
      - Calculate bounding rect dynamically: ensure popovers are clamped within `window.innerWidth` and `window.innerHeight` with a 12px margin, preventing swatches or sliders from clipping off-screen on phones.
- [x] **29.4 Responsive TopBar, Create Flyout & HUD Collision Avoidance:**
  - In `src/components/header/TopBar.tsx`:
    - Screen width breakpoint (<640px):
      - Truncate board title to fit small screens.
      - Collapse secondary buttons (Settings, Theme, Export) into a compact Fluent mobile overflow menu (`...`).
      - Hide non-essential labels while preserving icon touch buttons.
  - In `src/components/hud/ZoomHUD.tsx`:
    - Collision Avoidance:
      - On screens <640px, reposition the ZoomHUD or elevate it above the bottom toolbar (`bottom: 80px` or top-right below TopBar), preventing the centered mobile toolbar from obscuring the zoom controls.
  - In `src/components/create/CreateFlyout.tsx`:
    - Mobile bottom sheet / responsive drawer styling:
      - On phone screens (<640px), open as a slide-up bottom sheet with swipe-down dismissal instead of a fixed left sidebar that covers half the screen.
- [x] **29.5 Automated Test Verification & Clean Production Build:**
  - Create `scratch/test_milestone29_responsive_and_tablet.js` verifying:
    1. Touch/Stylus pointer discrimination logic: stylus draws while touch pans when `inkWithTouch` is false.
    2. Two-finger touch detection: transitions to pinch-zoom and cancels single-touch stroke without artifacts.
    3. Pressure modulation formula: `p_norm = p^0.75` modulates stroke thickness across `[0.35 * base, base]`.
    4. Viewport clamping helper: clamps popover coordinates within mobile viewport bounds.
  - Run test suite with Node.js and verify `npm run build` succeeds with 0 TypeScript/lint errors.

### Milestone 30: Toolbar Popover Viewport Portals & Milestone 16 Shortcuts Restoration
- [x] **30.1 Pen & Tool Popover React Portal Architecture:**
  - In `src/components/toolbar/PenPopover.tsx` and `src/components/toolbar/EraserPopover.tsx`:
    - Refactored to render into `document.body` via React's `createPortal`, completely decoupling popovers from the horizontal scrolling ribbon `<nav>` and eliminating the `overflowY: 'hidden'` clipping bug.
    - Measure button bounding rect dynamically by anchor element ID (`wb-tool-pen1..5`, `wb-tool-highlighter`, `wb-tool-laser`, `wb-tool-eraser`), positioning popovers precisely 14px above the active button.
    - Maintain dynamic screen bounds clamping (`shiftX`) with a 12px viewport edge margin and counter-shifting pointer chevron so arrows always point to the trigger button on phones, tablets, and desktop.
    - Listen to ribbon scroll events and window resize to update popover coordinates smoothly in real time.
    - Restored complete pen color switching (all 15 Fluent swatches, Rainbow, and Galaxy) across desktop, tablets, and mobile.
- [x] **30.2 Hardware-Independent Keyboard Shortcuts Engine (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+A`, `Ctrl+D`):**
  - In `src/tools/ShortcutEngine.ts`:
    - Add dual key/code matching (`key === 'z' || code === 'KeyZ'`, `key === 'y' || code === 'KeyY'`) ensuring shortcuts execute flawlessly across international keyboard layouts (Arabic, French AZERTY, German QWERTZ, etc.) and graphic tablet express keys (Wacom, Huion, XP-Pen).
    - Attach keydown listener in capture phase (`{ capture: true }`) so global shortcuts are never swallowed by intermediate DOM nodes.
    - Prevent `AltGr` conflicts by isolating `isCtrlOrMeta && !e.altKey`.
- [x] **30.3 Strict Milestone 16 Whitelist Integrity (`Alt+W`, `Alt+X`, and Single-Key Blocking):**
  - In `src/tools/ShortcutEngine.ts`:
    - Strictly honor Milestone 16 whitelist:
      - `Alt+W` activates Pen 1 (`inkingStore.selectPen('Pen1')`).
      - `Alt+X` activates Eraser (`inkingStore.setSelectedTool('Eraser')`).
      - Non-whitelisted single keys (V, S, H, P, 1-5, X, E, L, Q, R, N, T) and bare +/- remain strictly disabled so typing and inking are never accidentally intercepted.
    - Document registered shortcuts in `getRegisteredShortcuts()`.
- [x] **30.4 Stylus Palm Rejection Lifecycle & SVG Arc Hardening:**
  - In `src/canvas/CanvasViewport.tsx`:
    - Reset `isPenActiveRef.current` cleanly on `pointerleave`, `pointercancel`, and window `blur` so resting palm rejection never locks out touch interaction.
    - Blur active text inputs upon canvas pointerdown so shortcuts immediately resume without being trapped.
  - In `src/tools/PenTool.ts`:
    - Guard SVG ribbon outline arc radius with `Math.max(0.5, ...)` preventing zero-radius SVG rendering errors.
- [x] **30.5 Automated Test Verification & Clean Production Build:**
  - Created `scratch/test_milestone30_shortcuts_and_popovers.js` verifying:
    1. Popover anchor calculation & viewport clamping formulas.
    2. International layout shortcut detection: `e.code === 'KeyZ'` triggers `canvasStore.triggerUndo()`.
    3. Redo detection: `Ctrl+Y` and `Ctrl+Shift+Z` trigger `canvasStore.triggerRedo()`.
    4. Milestone 16 Ergonomic shortcuts: `Alt+W` selects Pen 1, `Alt+X` selects Eraser.
    5. Strict whitelist integrity: Bare single keys (V, 1, X, E) are not intercepted.
    6. Stylus palm rejection state reset on pointer leave.
  - All 6 test suites passed and `npm run build` compiled with 0 TypeScript/lint errors.

---

### Milestone 31: Universal Canvas Object Copy & Paste Engine (`Ctrl+C` / `Ctrl+V`)
- [x] **31.1 Universal Canvas Object Serialization & Clipboard Copy (`Ctrl+C`):**
  - Implement canvas object clipboard serializer supporting all entity types (`stroke`, `note`, `noteGrid`, `text`, `shape`, `reaction`, `image`, `pdf_document`).
  - Wire `Ctrl+C` / `Cmd+C` in `src/tools/ShortcutEngine.ts` when canvas objects are selected, strictly isolating text inputs (typing in note/text/PDF text selection preserves native text copy).
  - Write serialized JSON to system clipboard (`navigator.clipboard.writeText`) with format metadata and fallback internal clipboard cache.
  - Add "Copy (Ctrl+C)" button to the selection context bar (`#wb-context-copy`) in `src/components/canvas/SelectionOverlay.tsx`.
- [x] **31.2 Clipboard Deserialization, Spatial Offset & Paste Engine (`Ctrl+V`):**
  - Extend paste handler in `src/canvas/CanvasViewport.tsx` to detect whiteboard JSON payload in clipboard data.
  - Deserialize entities, generate fresh UUIDs, apply standard duplicate offset (+24px, +24px) or cursor-centered positioning.
  - Group additions into a single atomic undoable command (`historyManager.inUndoGroup('Paste Objects')`).
  - Add to `sceneStore` and automatically select newly pasted entities (`selectionStore.selectMultiple(newIds)`).
- [x] **31.3 Automated Test Verification & Clean Production Build:**
  - Create test script `scratch/test_milestone31_copy_paste.js` verifying copy/paste serialization, offset math, ID regeneration, undo/redo integration, and input isolation.
  - Run test suite with Node.js and verify `npm run build` passes with 0 TypeScript errors.

---

### Milestone 32: Galaxy & Rainbow Inking Robustness & Viewport Pattern Shading
- [x] **32.1 Root Cause Elimination: UserSpaceOnUse & Persistent Effect Pattern Shaders:**
  - In `src/canvas/CanvasEntities.tsx` and `src/canvas/CanvasViewport.tsx`:
    - Fix the SVG gradient clipping bug where vertical strokes (0px width in `objectBoundingBox`) or small dots turn completely invisible.
    - Switch gradient / pattern definitions to `gradientUnits="userSpaceOnUse"` or SVG `<pattern>` (Module 133066 spec) with persistent `<defs>` in root SVG layers.
    - Provide robust fallback stroke color (`#FF4E00` for Rainbow, `#AE198D` for Galaxy) so strokes always render reliably.
- [x] **32.2 Trajectory Alignment & Consistent Color Rendering During Translation:**
  - Ensure galaxy and rainbow strokes maintain consistent, vibrant appearance during live drawing, selection, and translation dragging without sudden color jumps or distortion.
  - Harmonize color picker popover to handle effect-based strokes cleanly without stripping or corrupting effect properties.
- [x] **32.3 Automated Test Verification & Clean Production Build:**
  - Create test script `scratch/test_milestone32_galaxy_rainbow.js` verifying stroke visibility on vertical lines/dots, gradient units, and translation preservation.
  - Run test suite with Node.js and verify `npm run build` passes with 0 TypeScript errors.

---

### Milestone 33: Ink-to-Shape Precision Engine (Circle vs Rectangle Discrimination & Rounded Heads)
- [x] **33.1 Circle / Ellipse Priority Classification & Rectangle Metric Hardening:**
  - In `src/tools/ShapeRecognitionEngine.ts`:
    - Reorder closed-stroke classification: evaluate Circle / Ellipse (`circularity >= 0.80 && normRsd <= 0.08`) BEFORE 4-corner polygons.
    - Remove overly permissive `circularity >= 0.6` condition from Rectangle / Square detection that was hijacking hand-drawn circles.
    - Require true right-angle corner detection and circularity ceiling (`circularity < 0.85`) for 4-corner polygons.
- [x] **33.2 Rounded Corner Fillets ("Heads") for Rectangles & Squares:**
  - In `src/tools/ShapeRecognitionEngine.ts` (`generateBeautifiedPoints`):
    - Eliminate duplicated corner points that caused Catmull-Rom spline loops/pinch knots ("weird heads").
    - Generate smooth circular arc fillets at each corner with radius $r = \min(10, \max(3, \min(\text{width}, \text{height}) \times 0.08))$.
    - Sample intermediate arc points so Catmull-Rom smoothly curves around corners without knotting or sharp bulbous artifacts.
- [x] **33.3 Automated Test Verification & Clean Production Build:**
  - Create test script `scratch/test_milestone33_shape_recognition.js` verifying circle classification on imperfect circles, rectangle corner angle checks, and rounded corner fillet geometry.
  - Run test suite with Node.js and verify `npm run build` passes with 0 TypeScript errors.

---

### Milestone 34: Microsoft Whiteboard REA Inking & Bezier Spline Restoration (Undo Milestone 29 Regression)
- [x] **34.1 REA Deep-Dive on Target Inking Smoothing (Modules 834265, 170887, 805859):**
  - Verify exact Microsoft Whiteboard cubic Bezier spline formulation ($C_1 = P_1 + \frac{P_2 - P_0}{6}$, $C_2 = P_2 - \frac{P_3 - P_1}{6}$).
  - Restore pure Catmull-Rom Bezier spline paths as the primary rendering engine for all standard pen drawing with round caps and round joins (`strokeLinecap="round" strokeLinejoin="round"`).
- [x] **34.2 Eliminate Milestone 29 Jittery Linear Outline Regression & Unwanted Tapering:**
  - Remove forced entry/exit width tapering on standard pen strokes that was triggering `hasVariation = true` across all mouse and default strokes.
  - Remove the linear polyline ribbon generator (`L ${leftPts[i].x} ${leftPts[i].y}`) that replaced smooth Bezier curves with jagged straight lines.
  - Ensure standard mouse and pen drawing renders with pristine uniform width and buttery-smooth curves identical to Microsoft Whiteboard.
- [x] **34.3 Smooth Bezier Variable Pressure for Graphic Tablets Only:**
  - For true graphic tablet / stylus input (`e.pointerType === 'pen'` with variable pressure), interpolate variable width smoothly along the Bezier curve without breaking into jagged linear polyline segments.
  - Maintain calligraphic elegance while ensuring standard mouse/stylus inking remains silky-smooth.
- [x] **34.4 Automated Test Verification & Clean Production Build:**
  - Create test script `scratch/test_milestone34_bezier_inking.js` verifying smooth Catmull-Rom Bezier output, uniform width on mouse/standard pen strokes, absence of jagged linear polygons, and build passing with 0 errors.

---

### Milestone 35: Microsoft Whiteboard REA Natural Handwriting Engine (PC & Graphic Tablet Parity)
- [x] **35.1 REA Bitangent Envelope Ribbon Engine & Authentic Pressure Calibration (Modules 357044, 188610 & 917068):**
  - Implement Microsoft Whiteboard's exact circle bitangent outer envelope algorithm (`Module 357044`) in `src/tools/PenTool.ts` and `src/canvas/CanvasEntities.tsx`:
    - For consecutive variable-radius circles $(C_1, C_2)$ with centers $(x_1, y_1), (x_2, y_2)$ and radii $r_1, r_2$, calculate exact outer bitangent coordinates $(t_{1a}, t_{1b})$ and $(t_{2a}, t_{2b})$ via direction cosine and distance ratio $d = (r_2 - r_1) / \text{dist}$.
    - Connect bitangents with circular arc joints and tangent intersection points (`h(outgoing, incoming)`), completely eliminating self-intersecting ribbons, twisted bowtie artifacts, and polygon spikes.
    - Implement authentic linear affine stylus pressure scaling: $R(p) = R_{\text{base}} \times (1.5 \times p + 0.25)$ (`Module 188610`), providing natural dynamic range from $0.25\times$ to $1.75\times$ with resting pressure $0.5$ at exactly $1.0\times$.
- [x] **35.2 PC & Mouse Dynamic Velocity-to-Thickness Calligraphy Engine (Modules 946193 & 45330):**
  - In `src/tools/PenTool.ts`:
    - When drawing with `mouse` or non-pressure pointers, track instantaneous inter-point velocity: $v = \text{dist} / \Delta t$.
    - Apply exponential smoothing to velocity: $v_{\text{smooth}} = 0.35 \times v + 0.65 \times v_{\text{prev}}$.
    - Modulate stroke thickness calligraphically: $w(v) = w_{\text{base}} \times (1.18 - 0.36 \times \min(1.0, v / v_{\text{ref}}))$, producing authentic ballpoint/fountain pen behavior on PC where deliberate slow curves are fuller and fast flicks taper smoothly.
- [x] **35.3 Dual-Stage Post-Processing: Collinear Simplification & Bezier Segment Folding (Modules 317294 & 316556):**
  - In `src/tools/PenTool.ts` (`onPointerUp`):
    - Implement collinear micro-point simplifier (`Module 317294` / `class j`) with scale-adaptive threshold $b = (8 \times 10^{-4}) / \text{scale}$, stripping redundant collinear micro-jitter points.
    - Implement Schneider least-squares Bezier segment folding (`Module 316556` / `class o`, `TryGetFoldInSegment`) with tolerance $M = 0.035 \times (0.1 + 1/\text{scale}) / 100$:
      - Parameterize candidate micro-segments at chord distances $t = 0.25, 0.5, 0.75$.
      - Solve the $2 \times 2$ least-squares system ($480429 d f - 281961 g^2$) to fit a single continuous cubic Bezier curve.
      - If residual error $\le M$, fold segments together into a single unified Bezier arc, eliminating jagged staircase steps and micro-wobbles from mouse and tablet writing.
- [x] **35.4 Real-Time Velocity Extrapolation Predictor & Direct RAF Inking Loop (Modules 170887 & 154175):**
  - Implement stroke tip velocity predictor (`Module 170887` / `class d`):
    - When `supportsPrediction()` is true (standard pens without ruler), extrapolate the stroke tip forward along the instantaneous velocity tangent by $\approx 1.2 \times \Delta t$ during live drawing.
    - Projects ink directly beneath the physical pen/cursor tip, eliminating perceived input lag.
  - In `src/canvas/CanvasViewport.tsx`:
    - Implement dedicated `requestAnimationFrame` render loop (`Module 154175` / `class k`) for the live inking overlay:
    - Update the live SVG path directly via DOM reference (`setAttribute('d', ...)`) instead of triggering React state reconciliation on every pointer move, ensuring locked 60Hz/120Hz rendering without stutter.
- [x] **35.5 Automated Test Verification, Clean Production Build & Git Commit / Push:**
  - Create test script `scratch/test_milestone35_handwriting.js` verifying:
    1. Bitangent outer envelope calculations and circular arc cap joints.
    2. Linear affine pressure curve $R(p) = R_{\text{base}} \times (1.5p + 0.25)$ matching Module 188610.
    3. Dynamic velocity-to-thickness modulation for mouse/touch inputs.
    4. Collinear simplification and Bezier segment folding fitting precision.
    5. Velocity extrapolation tip predictor math.
  - Run test suite with Node.js and verify `npm run build` succeeds with 0 TypeScript/lint errors.

---

## 4. Session Handoff & Resume Tracker
> **Agent Note:** Always update these 3 fields before ending your response so the user can resume seamlessly after a rate limit or model switch.

- **Last Completed Sub-Task:** `35.5 Automated Test Verification, Clean Production Build & Git Commit / Push (Milestone 35 Complete)`
- **Current Active Sub-Task:** `Milestone 35 Complete — Standing by for Next Direction`
- **Next Recommended Prompt:** `"Standing by for next user request or feature milestone"`
