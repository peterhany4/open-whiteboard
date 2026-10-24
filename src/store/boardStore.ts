/**
 * Open Whiteboard — Multi-Board Persistence Engine & Gallery Store
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 517955 & 179019 (blueboard/chunks/boardpicker.*.js)
 *   -> BoardPickerConnected, Board list persistence, new board creation, board deletion & duplication
 * - Module 795434 (blueboard/chunks/app-router.*.js)
 *   -> Board routing, transition between BoardPicker gallery and active whiteboard canvas
 */

import { useSyncExternalStore } from 'react';
import type { CanvasEntity } from '../canvas/sceneGraph';
import type { GridPatternType } from '../canvas/grid';
import type { CameraMatrix } from '../canvas/camera';
import { sceneStore } from './sceneStore';
import { canvasStore } from './canvasStore';
import { selectionStore } from './selectionStore';
import { inkingStore } from './inkingStore';
import { historyManager } from '../canvas/history';
import { rulerEngine } from '../tools/RulerEngine';
import { ExportEngine } from '../tools/ExportEngine';

export interface BoardRulerData {
  x: number;
  y: number;
  angle: number;
  isVisible: boolean;
}

export interface BoardCanvasData {
  entities: CanvasEntity[];
  gridPattern?: GridPatternType;
  paperColor?: string;
  camera?: CameraMatrix;
  ruler?: BoardRulerData;
}

export interface BoardRecord {
  id: string;
  title: string;
  thumbnailDataUrl: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  canvasData: BoardCanvasData;
}

export type BoardSummary = Omit<BoardRecord, 'canvasData'>;

export interface BoardStoreState {
  boards: BoardSummary[];
  activeBoardId: string | null;
  currentView: 'gallery' | 'board';
  searchQuery: string;
  isSaving: boolean;
  isLoading: boolean;
  lastSavedAt: number | null;
}

const DB_NAME = 'OpenWhiteboardDB';
const LEGACY_DB_NAME = 'MicrosoftWhiteboardDB';
const DB_VERSION = 1;
const STORE_NAME = 'boards';
const LAST_ACTIVE_KEY = 'whiteboard:lastActiveBoardId';
const LOCALSTORAGE_PREFIX = 'whiteboard:board:';
const LOCALSTORAGE_LIST_KEY = 'whiteboard:board_ids';

// ================= IndexedDB Helper =================
class BoardStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;

  private getDB(): Promise<IDBDatabase> {
    if (!this.hasIndexedDB) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  private async tryMigrateLegacy(targetDb: IDBDatabase): Promise<BoardRecord[]> {
    if (!this.hasIndexedDB) return [];
    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(LEGACY_DB_NAME);
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const legacyDb = req.result;
          if (!legacyDb.objectStoreNames.contains(STORE_NAME)) {
            legacyDb.close();
            return resolve([]);
          }
          const tx = legacyDb.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.getAll();
          getReq.onsuccess = async () => {
            const records = (getReq.result as BoardRecord[]) || [];
            legacyDb.close();
            if (records.length > 0) {
              const writeTx = targetDb.transaction(STORE_NAME, 'readwrite');
              const writeStore = writeTx.objectStore(STORE_NAME);
              for (const rec of records) {
                writeStore.put(rec);
              }
            }
            resolve(records);
          };
          getReq.onerror = () => {
            legacyDb.close();
            resolve([]);
          };
        };
      } catch {
        resolve([]);
      }
    });
  }

  public async getAllSummaries(): Promise<BoardSummary[]> {
    if (this.hasIndexedDB) {
      try {
        const db = await this.getDB();
        let records = await new Promise<BoardRecord[]>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as BoardRecord[]) || []);
          req.onerror = () => reject(req.error);
        });

        if (records.length === 0) {
          // Attempt legacy migration once
          const migrated = await this.tryMigrateLegacy(db);
          if (migrated.length > 0) {
            records = migrated;
          }
        }

        records.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        return records.map(({ id, title, thumbnailDataUrl, createdAt, updatedAt }) => ({
          id,
          title,
          thumbnailDataUrl,
          createdAt,
          updatedAt,
        }));
      } catch (err) {
        console.warn('[BoardStorage] IndexedDB getAll error, falling back to LocalStorage', err);
      }
    }

    // LocalStorage Fallback
    try {
      const idsRaw = localStorage.getItem(LOCALSTORAGE_LIST_KEY);
      const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
      const summaries: BoardSummary[] = [];
      for (const id of ids) {
        const raw = localStorage.getItem(LOCALSTORAGE_PREFIX + id);
        if (raw) {
          const { id: bId, title, thumbnailDataUrl, createdAt, updatedAt } = JSON.parse(raw);
          summaries.push({ id: bId, title, thumbnailDataUrl, createdAt, updatedAt });
        }
      }
      summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return summaries;
    } catch {
      return [];
    }
  }

  public async getBoard(id: string): Promise<BoardRecord | null> {
    if (this.hasIndexedDB) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('[BoardStorage] IndexedDB get error, falling back to LocalStorage', err);
      }
    }

    // LocalStorage Fallback
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public async saveBoard(board: BoardRecord): Promise<void> {
    if (this.hasIndexedDB) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(board);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('[BoardStorage] IndexedDB save error, falling back to LocalStorage', err);
      }
    }

    // LocalStorage Fallback
    try {
      localStorage.setItem(LOCALSTORAGE_PREFIX + board.id, JSON.stringify(board));
      const idsRaw = localStorage.getItem(LOCALSTORAGE_LIST_KEY);
      const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
      if (!ids.includes(board.id)) {
        ids.push(board.id);
        localStorage.setItem(LOCALSTORAGE_LIST_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.error('[BoardStorage] Failed to save board in fallback storage:', e);
    }
  }

  public async deleteBoard(id: string): Promise<void> {
    if (this.hasIndexedDB) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('[BoardStorage] IndexedDB delete error, falling back to LocalStorage', err);
      }
    }

    // LocalStorage Fallback
    try {
      localStorage.removeItem(LOCALSTORAGE_PREFIX + id);
      const idsRaw = localStorage.getItem(LOCALSTORAGE_LIST_KEY);
      if (idsRaw) {
        const ids: string[] = JSON.parse(idsRaw);
        const filtered = ids.filter((bId) => bId !== id);
        localStorage.setItem(LOCALSTORAGE_LIST_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('[BoardStorage] Failed to delete board in fallback storage:', e);
    }
  }
}

const storage = new BoardStorage();

// ================= Reactive Board Store =================
class BoardStore {
  private state: BoardStoreState = {
    boards: [],
    activeBoardId: null,
    currentView: 'gallery',
    searchQuery: '',
    isSaving: false,
    isLoading: true,
    lastSavedAt: null,
  };

  private listeners = new Set<() => void>();
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor() {
    this.setupAutoSaveSubscriptions();
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): BoardStoreState => {
    return this.state;
  };

  public getState = (): BoardStoreState => {
    return this.state;
  };

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(partial: Partial<BoardStoreState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Initializes multi-board repository on application start.
   * Seamlessly seeds an initial board if none exists.
   */
  public async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.setState({ isLoading: true });

    try {
      const summaries = await storage.getAllSummaries();

      if (summaries.length === 0) {
        // No boards saved in storage — start cleanly at the board picker
        sceneStore.loadEntities([]);
        canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
        rulerEngine.reset(0, 0, 0, false);
        historyManager.clear();
        selectionStore.clearSelection();
        inkingStore.resetToDefaults();
        localStorage.removeItem(LAST_ACTIVE_KEY);
        this.setState({
          boards: [],
          activeBoardId: null,
          isLoading: false,
          currentView: 'gallery',
        });
      } else {
        // Boards exist — preload target record in background
        const lastActiveId = localStorage.getItem(LAST_ACTIVE_KEY);
        const targetId =
          lastActiveId && summaries.some((b) => b.id === lastActiveId)
            ? lastActiveId
            : summaries[0].id;

        const targetRecord = await storage.getBoard(targetId);
        if (targetRecord) {
          sceneStore.loadEntities(targetRecord.canvasData.entities || []);
          canvasStore.setBoardTitle(targetRecord.title);
          if (targetRecord.canvasData.gridPattern) {
            canvasStore.setGridPattern(targetRecord.canvasData.gridPattern);
          }
          if (targetRecord.canvasData.camera) {
            canvasStore.setCamera(targetRecord.canvasData.camera);
          } else {
            canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
          }
          if (targetRecord.canvasData.ruler) {
            rulerEngine.restoreState(targetRecord.canvasData.ruler);
          } else {
            rulerEngine.reset(0, 0, 0, false);
          }
        }

        this.setState({
          boards: summaries,
          activeBoardId: targetId,
          isLoading: false,
          currentView: 'gallery', // Always start at Whiteboard Picker
        });
      }
    } catch (err) {
      console.error('[BoardStore] Initialization error:', err);
      this.setState({ isLoading: false });
    }
  }

  /**
   * Generates a unique board identifier matching Open Whiteboard naming style
   */
  private generateId(): string {
    return `board_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Sets search filter query for gallery
   */
  public setSearchQuery(query: string) {
    this.setState({ searchQuery: query });
  }

  /**
   * Gets filtered list of boards matching current search query
   */
  public getFilteredBoards(): BoardSummary[] {
    const q = this.state.searchQuery.trim().toLowerCase();
    if (!q) return this.state.boards;
    return this.state.boards.filter((b) => b.title.toLowerCase().includes(q));
  }

  /**
   * Navigates between Gallery ('gallery') and Canvas ('board')
   */
  public async navigateTo(view: 'gallery' | 'board') {
    if (this.state.currentView === 'board' && view === 'gallery') {
      // Flush save before leaving canvas
      await this.flushSave();
    }
    this.setState({ currentView: view });
  }

  /**
   * Creates a new blank whiteboard and transitions immediately to canvas
   */
  public async createNewBoard(customTitle?: string): Promise<string> {
    // Flush current board if any
    await this.flushSave();

    const newId = this.generateId();
    const title = customTitle || 'Untitled whiteboard';
    const now = new Date().toISOString();

    // Pristine board initialization (Milestone 18.1)
    sceneStore.loadEntities([]);
    canvasStore.setBoardTitle(title);
    canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
    rulerEngine.reset(0, 0, 0, false);
    historyManager.clear();
    selectionStore.clearSelection();
    inkingStore.resetToDefaults();

    const emptyThumbnail = await ExportEngine.generateThumbnail([]);

    const newBoard: BoardRecord = {
      id: newId,
      title,
      thumbnailDataUrl: emptyThumbnail,
      createdAt: now,
      updatedAt: now,
      canvasData: {
        entities: [],
        gridPattern: canvasStore.getState().gridPattern,
        camera: { scale: 1.0, positionX: 0, positionY: 0 },
        ruler: { x: 0, y: 0, angle: 0, isVisible: false },
      },
    };

    await storage.saveBoard(newBoard);
    localStorage.setItem(LAST_ACTIVE_KEY, newId);

    const newSummary: BoardSummary = {
      id: newId,
      title,
      thumbnailDataUrl: emptyThumbnail,
      createdAt: now,
      updatedAt: now,
    };

    this.setState({
      boards: [newSummary, ...this.state.boards],
      activeBoardId: newId,
      currentView: 'board',
    });

    return newId;
  }

  /**
   * Imports an external .whiteboard or JSON bundle into the repository and opens it
   */
  public async importBoard(title: string, canvasData: any): Promise<string> {
    await this.flushSave();

    const newId = this.generateId();
    const entities = canvasData?.entities || [];
    const thumbnail = await ExportEngine.generateThumbnail(entities);
    const now = new Date().toISOString();
    const boardTitle = title || 'Imported Whiteboard';

    const camera = canvasData?.camera || { scale: 1.0, positionX: 0, positionY: 0 };
    const ruler = canvasData?.ruler || { x: 0, y: 0, angle: 0, isVisible: false };

    const record: BoardRecord = {
      id: newId,
      title: boardTitle,
      thumbnailDataUrl: thumbnail,
      createdAt: now,
      updatedAt: now,
      canvasData: {
        entities,
        gridPattern: canvasData?.gridPattern || 'Dot',
        camera,
        ruler,
      },
    };

    await storage.saveBoard(record);
    localStorage.setItem(LAST_ACTIVE_KEY, newId);

    const summary: BoardSummary = {
      id: newId,
      title: boardTitle,
      thumbnailDataUrl: thumbnail,
      createdAt: now,
      updatedAt: now,
    };

    sceneStore.loadEntities(entities);
    canvasStore.setBoardTitle(boardTitle);
    if (record.canvasData.gridPattern) {
      canvasStore.setGridPattern(record.canvasData.gridPattern);
    }
    canvasStore.setCamera(camera);
    if (canvasData?.ruler) {
      rulerEngine.restoreState(canvasData.ruler);
    } else {
      rulerEngine.reset(0, 0, 0, false);
    }

    historyManager.clear();
    selectionStore.clearSelection();
    inkingStore.selectTool('Select');
    inkingStore.closePopover();

    this.setState({
      boards: [summary, ...this.state.boards],
      activeBoardId: newId,
      currentView: 'board',
    });

    return newId;
  }

  /**
   * Opens an existing board by ID
   */
  public async openBoard(id: string): Promise<void> {
    if (this.state.activeBoardId === id && this.state.currentView === 'board') {
      return;
    }

    // Flush current board save
    await this.flushSave();

    const record = await storage.getBoard(id);
    if (!record) {
      console.error('[BoardStore] Board not found:', id);
      return;
    }

    // Isolate per-board canvas state (Milestone 18.2)
    selectionStore.clearSelection();
    historyManager.clear();
    inkingStore.closePopover();
    inkingStore.selectTool('Select');

    // Load board contents
    sceneStore.loadEntities(record.canvasData.entities || []);
    canvasStore.setBoardTitle(record.title);
    if (record.canvasData.gridPattern) {
      canvasStore.setGridPattern(record.canvasData.gridPattern);
    }

    // Restore isolated camera matrix
    if (record.canvasData.camera) {
      canvasStore.setCamera(record.canvasData.camera);
    } else {
      canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
    }

    // Restore isolated ruler state
    if (record.canvasData.ruler) {
      rulerEngine.restoreState(record.canvasData.ruler);
    } else {
      rulerEngine.reset(0, 0, 0, false);
    }

    localStorage.setItem(LAST_ACTIVE_KEY, id);

    this.setState({
      activeBoardId: id,
      currentView: 'board',
    });
  }

  /**
   * Renames a whiteboard
   */
  public async renameBoard(id: string, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim() || 'Untitled whiteboard';
    const record = await storage.getBoard(id);
    if (!record) return;

    record.title = trimmed;
    record.updatedAt = new Date().toISOString();
    await storage.saveBoard(record);

    if (id === this.state.activeBoardId) {
      canvasStore.setBoardTitle(trimmed);
    }

    const updatedBoards = this.state.boards.map((b) =>
      b.id === id ? { ...b, title: trimmed, updatedAt: record.updatedAt } : b
    );

    this.setState({ boards: updatedBoards });
  }

  /**
   * Duplicates an existing whiteboard
   */
  public async duplicateBoard(id: string): Promise<string> {
    const original = await storage.getBoard(id);
    if (!original) throw new Error('Original board not found');

    const newId = this.generateId();
    const now = new Date().toISOString();
    const clonedTitle = `${original.title} (Copy)`;

    // Clone all canvas entities with new IDs to prevent collisions
    const clonedEntities: CanvasEntity[] = (original.canvasData.entities || []).map((ent) => ({
      ...ent,
      id: `${ent.id}_copy_${Math.random().toString(36).substring(2, 6)}`,
    }));

    const clonedThumbnail = await ExportEngine.generateThumbnail(clonedEntities);

    const duplicatedRecord: BoardRecord = {
      id: newId,
      title: clonedTitle,
      thumbnailDataUrl: clonedThumbnail,
      createdAt: now,
      updatedAt: now,
      canvasData: {
        ...original.canvasData,
        entities: clonedEntities,
        camera: original.canvasData.camera
          ? { ...original.canvasData.camera }
          : { scale: 1.0, positionX: 0, positionY: 0 },
        ruler: original.canvasData.ruler
          ? { ...original.canvasData.ruler }
          : { x: 0, y: 0, angle: 0, isVisible: false },
      },
    };

    await storage.saveBoard(duplicatedRecord);

    const duplicatedSummary: BoardSummary = {
      id: newId,
      title: clonedTitle,
      thumbnailDataUrl: clonedThumbnail,
      createdAt: now,
      updatedAt: now,
    };

    this.setState({
      boards: [duplicatedSummary, ...this.state.boards],
    });

    return newId;
  }

  /**
   * Deletes a whiteboard by ID
   */
  public async deleteBoard(id: string): Promise<void> {
    await storage.deleteBoard(id);

    const remaining = this.state.boards.filter((b) => b.id !== id);
    const wasActive = this.state.activeBoardId === id;
    const isGallery = this.state.currentView === 'gallery';

    if (remaining.length === 0) {
      // No boards left — clear canvas state and stay in (or return to) board picker gallery
      sceneStore.loadEntities([]);
      canvasStore.setBoardTitle('Untitled whiteboard');
      canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
      rulerEngine.reset(0, 0, 0, false);
      historyManager.clear();
      selectionStore.clearSelection();
      inkingStore.resetToDefaults();
      localStorage.removeItem(LAST_ACTIVE_KEY);

      this.setState({
        boards: [],
        activeBoardId: null,
        currentView: 'gallery',
      });
      return;
    }

    // Remaining boards exist
    if (isGallery) {
      // Stay in gallery; if the deleted board was active, point activeBoardId to the first remaining
      const newActiveId = wasActive ? remaining[0].id : this.state.activeBoardId;
      if (wasActive && newActiveId) {
        localStorage.setItem(LAST_ACTIVE_KEY, newActiveId);
      }
      this.setState({
        boards: remaining,
        activeBoardId: newActiveId,
        currentView: 'gallery',
      });
    } else {
      // In 'board' view: switch to next available board
      if (wasActive) {
        this.setState({ boards: remaining });
        await this.openBoard(remaining[0].id);
      } else {
        this.setState({ boards: remaining });
      }
    }
  }

  /**
   * Immediately saves the currently active board to storage
   */
  public async flushSave(): Promise<void> {
    if (!this.state.activeBoardId) return;
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    const boardId = this.state.activeBoardId;
    const title = canvasStore.getState().boardTitle || 'Untitled whiteboard';
    const entities = sceneStore.serializeEntities();
    const currentCamera = canvasStore.getState().camera;
    const currentRuler = rulerEngine.getState();
    const rulerData: BoardRulerData = {
      x: currentRuler.x,
      y: currentRuler.y,
      angle: currentRuler.angle,
      isVisible: currentRuler.isActive,
    };
    const now = new Date().toISOString();

    this.setState({ isSaving: true });

    try {
      const thumbnail = await ExportEngine.generateThumbnail(entities);
      const existing = await storage.getBoard(boardId);

      const record: BoardRecord = {
        id: boardId,
        title,
        thumbnailDataUrl: thumbnail,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        canvasData: {
          entities,
          gridPattern: canvasStore.getState().gridPattern,
          camera: currentCamera,
          ruler: rulerData,
        },
      };

      await storage.saveBoard(record);

      const updatedBoards = this.state.boards.map((b) =>
        b.id === boardId
          ? { ...b, title, thumbnailDataUrl: thumbnail, updatedAt: now }
          : b
      );

      // Re-sort boards so most recently updated is first
      updatedBoards.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      this.setState({
        boards: updatedBoards,
        isSaving: false,
        lastSavedAt: Date.now(),
      });
    } catch (err) {
      console.error('[BoardStore] Failed to flush save:', err);
      this.setState({ isSaving: false });
    }
  }

  /**
   * Schedules debounced auto-save (1200ms) on user inking or entity modification
   */
  public scheduleAutoSave() {
    if (this.state.currentView !== 'board' || !this.state.activeBoardId) return;

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.flushSave().catch((err) =>
        console.error('[BoardStore] Auto-save failed:', err)
      );
    }, 1200);
  }

  private setupAutoSaveSubscriptions() {
    // Listen to changes in sceneStore
    sceneStore.subscribe(() => {
      this.scheduleAutoSave();
    });

    // Listen to title, camera & grid changes in canvasStore
    let prevCamera = canvasStore.getState().camera;
    let prevGrid = canvasStore.getState().gridPattern;
    canvasStore.subscribe(() => {
      const state = canvasStore.getState();
      const activeSummary = this.state.boards.find((b) => b.id === this.state.activeBoardId);
      if (activeSummary && activeSummary.title !== state.boardTitle) {
        this.scheduleAutoSave();
      }
      if (state.camera !== prevCamera || state.gridPattern !== prevGrid) {
        prevCamera = state.camera;
        prevGrid = state.gridPattern;
        this.scheduleAutoSave();
      }
    });

    // Listen to ruler changes
    rulerEngine.subscribe(() => {
      this.scheduleAutoSave();
    });

    // Save before window unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.state.activeBoardId && this.state.currentView === 'board') {
          // Synchronous fallback save to localStorage
          try {
            const id = this.state.activeBoardId;
            const entities = sceneStore.serializeEntities();
            const currentCamera = canvasStore.getState().camera;
            const currentRuler = rulerEngine.getState();
            const raw = localStorage.getItem(LOCALSTORAGE_PREFIX + id);
            const base = raw ? JSON.parse(raw) : { createdAt: new Date().toISOString() };
            localStorage.setItem(
              LOCALSTORAGE_PREFIX + id,
              JSON.stringify({
                ...base,
                id,
                title: canvasStore.getState().boardTitle,
                updatedAt: new Date().toISOString(),
                canvasData: {
                  entities,
                  gridPattern: canvasStore.getState().gridPattern,
                  camera: currentCamera,
                  ruler: {
                    x: currentRuler.x,
                    y: currentRuler.y,
                    angle: currentRuler.angle,
                    isVisible: currentRuler.isActive,
                  },
                },
              })
            );
          } catch {
            // Best effort
          }
        }
      });
    }
  }
}

export const boardStore = new BoardStore();

export function useBoardStore() {
  return useSyncExternalStore(boardStore.subscribe, boardStore.getSnapshot);
}
