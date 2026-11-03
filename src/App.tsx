/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { FolderActionMenu } from './components/FolderActionMenu';
import { FolderDetailView } from './components/FolderDetailView';
import {
  AssignBinderToGroupModal,
  GroupActionMenu,
  GroupFormModal,
  ManageGroupBindersModal,
} from './components/GroupModals';
import { HomeDetailsView } from './components/HomeDetailsView';
import {
  ConfirmDeleteModal,
  FolderFormModal,
  MovePhotosModal,
} from './components/Modals';
import { PhotoLightbox } from './components/PhotoLightbox';
import { SettingsModal } from './components/SettingsModal';
import { TRANSLATIONS } from './i18n/translations';
import { exportFullArchiveZip } from './services/backupService';
import {
  downloadFolderAsZip,
  downloadSelectedPhotos,
  downloadSinglePhoto,
  shareEntireFolder,
  shareSelectedPhotos,
  shareSinglePhoto,
} from './services/shareAndExport';
import {
  clearEntireArchiveDatabase,
  deleteFolderAndPhotosRecord,
  deleteGroupAndUngroupRecord,
  deletePhotoRecords,
  loadInitialArchive,
  replaceEntireArchiveRecords,
  saveFolderRecord,
  saveFolderRecords,
  saveGroupRecord,
  savePhotoRecords,
} from './services/storage';
import type {
  BookFolder,
  FolderSummary,
  GroupFolder,
  GroupSummary,
  Language,
  PhotoItem,
  SortMode,
} from './types/archive';
import {
  computeFolderSummary,
  computeGroupSummary,
  deletePhotosByIds,
  filterAndSortFolders,
  filterAndSortGroups,
  movePhotosToFolder,
  removeGroupAndUngroupBinders,
  syncGroupMembership,
} from './utils/archiveLogic';
import { mergeArchiveData, type ArchiveSnapshot } from './utils/backupLogic';

type PendingDeleteTarget =
  | { kind: 'folder'; summary: FolderSummary }
  | { kind: 'group'; summary: GroupSummary }
  | { kind: 'single_photo'; photo: PhotoItem; pageNumber: number }
  | { kind: 'selected_photos'; folderId: string; count: number }
  | { kind: 'reset_database' };

const THEME_STORAGE_KEY = 'specifications_theme_pref';
const LANG_STORAGE_KEY = 'specifications_lang_pref';

function createUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [groups, setGroups] = useState<GroupFolder[]>([]);
  const [folders, setFolders] = useState<BookFolder[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Language state (Myanmar / English) synced with <html lang> & localStorage
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'my';
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'my';
  });

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'my';
    window.localStorage.setItem(LANG_STORAGE_KEY, language);
  }, [language]);

  const t = TRANSLATIONS[language];

  // Dark mode state controlled via Settings & synced with <html> class + localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDarkMode ? '#0C0C0E' : '#F2F0EA');
    }

    const nativeWin = window as Window & {
      AndroidSystemBars?: { setTheme?: (isDark: boolean) => void };
    };
    nativeWin.AndroidSystemBars?.setTheme?.(isDarkMode);
  }, [isDarkMode]);

  // Navigation & filter state (Default sort = Name A–Z / အမည်စဉ်အလိုက်)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name_asc');

  // Selection mode inside a binder
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Modals & Action Menu state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [menuTargetFolderId, setMenuTargetFolderId] = useState<string | null>(null);
  const [menuTargetGroupId, setMenuTargetGroupId] = useState<string | null>(null);

  const [isCreateBinderModalOpen, setIsCreateBinderModalOpen] = useState(false);
  const [renameTargetFolder, setRenameTargetFolder] = useState<BookFolder | null>(null);

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [renameTargetGroup, setRenameTargetGroup] = useState<GroupFolder | null>(null);
  const [manageBindersGroup, setManageBindersGroup] = useState<GroupFolder | null>(null);
  const [assignGroupTargetBinder, setAssignGroupTargetBinder] = useState<BookFolder | null>(null);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteTarget | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  // Subtle toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  }, []);

  // Load archive from IndexedDB
  useEffect(() => {
    let mounted = true;
    loadInitialArchive()
      .then(({ groups: loadedGroups, folders: loadedFolders, photos: loadedPhotos }) => {
        if (!mounted) return;
        setGroups(loadedGroups);
        setFolders(loadedFolders);
        setPhotos(loadedPhotos);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoadError(err instanceof Error ? err.message : 'Load error');
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Derived summaries
  const allBinderSummaries = useMemo(
    () => folders.map((f) => computeFolderSummary(f, photos)),
    [folders, photos]
  );

  const allGroupSummaries = useMemo(
    () => groups.map((g) => computeGroupSummary(g, allBinderSummaries)),
    [groups, allBinderSummaries]
  );

  const activeGroupSummary = useMemo(
    () =>
      activeGroupId
        ? allGroupSummaries.find((gs) => gs.group.id === activeGroupId) ?? null
        : null,
    [activeGroupId, allGroupSummaries]
  );

  const visibleGroupSummaries = useMemo(
    () => filterAndSortGroups(allGroupSummaries, searchQuery, sortMode),
    [allGroupSummaries, searchQuery, sortMode]
  );

  const visibleBinderSummaries = useMemo(() => {
    const isSearching = searchQuery.trim().length > 0;
    let pool = allBinderSummaries;
    if (activeGroupSummary) {
      pool = allBinderSummaries.filter((s) => s.folder.groupId === activeGroupSummary.group.id);
    } else if (!isSearching) {
      // At Root without search: display ungrouped binders (grouped binders live inside their parent GroupFolder)
      pool = allBinderSummaries.filter((s) => !s.folder.groupId);
    }
    return filterAndSortFolders(pool, searchQuery, sortMode);
  }, [allBinderSummaries, activeGroupSummary, searchQuery, sortMode]);

  const activeFolderSummary = useMemo(
    () =>
      activeFolderId ? allBinderSummaries.find((s) => s.folder.id === activeFolderId) ?? null : null,
    [activeFolderId, allBinderSummaries]
  );

  const activeFolderParentGroupName = useMemo(() => {
    const gId = activeFolderSummary?.folder.groupId;
    if (!gId) return null;
    return groups.find((g) => g.id === gId)?.name ?? null;
  }, [activeFolderSummary, groups]);

  const activeFolderPhotos = useMemo(() => {
    if (!activeFolderId) return [];
    return photos
      .filter((p) => p.folderId === activeFolderId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [activeFolderId, photos]);

  const menuSummary = useMemo(
    () =>
      menuTargetFolderId
        ? allBinderSummaries.find((s) => s.folder.id === menuTargetFolderId) ?? null
        : null,
    [menuTargetFolderId, allBinderSummaries]
  );

  const menuGroupSummary = useMemo(
    () =>
      menuTargetGroupId
        ? allGroupSummaries.find((gs) => gs.group.id === menuTargetGroupId) ?? null
        : null,
    [menuTargetGroupId, allGroupSummaries]
  );

  // Navigation helpers
  const navigateBackFromBinder = useCallback(() => {
    setActiveFolderId(null);
    setIsSelectionMode(false);
    setSelectedPhotoIds(new Set());
    setLightboxIndex(null);
  }, []);

  const openFolder = useCallback((folderId: string, startInSelectMode = false) => {
    setActiveFolderId(folderId);
    setIsSelectionMode(startInSelectMode);
    setSelectedPhotoIds(new Set());
    setLightboxIndex(null);
  }, []);

  // Native Android Hardware Back Button & Gesture Navigation handler
  const backHandlerRef = useRef<() => boolean>(() => false);
  backHandlerRef.current = () => {
    if (pendingDelete !== null) {
      setPendingDelete(null);
      return true;
    }
    if (lightboxIndex !== null) {
      setLightboxIndex(null);
      return true;
    }
    if (isMoveModalOpen) {
      setIsMoveModalOpen(false);
      return true;
    }
    if (assignGroupTargetBinder !== null) {
      setAssignGroupTargetBinder(null);
      return true;
    }
    if (manageBindersGroup !== null) {
      setManageBindersGroup(null);
      return true;
    }
    if (renameTargetFolder !== null) {
      setRenameTargetFolder(null);
      return true;
    }
    if (isCreateBinderModalOpen) {
      setIsCreateBinderModalOpen(false);
      return true;
    }
    if (renameTargetGroup !== null) {
      setRenameTargetGroup(null);
      return true;
    }
    if (isCreateGroupModalOpen) {
      setIsCreateGroupModalOpen(false);
      return true;
    }
    if (menuTargetFolderId !== null) {
      setMenuTargetFolderId(null);
      return true;
    }
    if (menuTargetGroupId !== null) {
      setMenuTargetGroupId(null);
      return true;
    }
    if (isSettingsOpen) {
      if (busyAction === 'backup_export') {
        return true;
      }
      setIsSettingsOpen(false);
      return true;
    }
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedPhotoIds(new Set());
      return true;
    }
    if (activeFolderId !== null) {
      navigateBackFromBinder();
      return true;
    }
    if (activeGroupId !== null) {
      setActiveGroupId(null);
      return true;
    }
    return false;
  };

  useEffect(() => {
    let listenerCleanup: (() => void) | null = null;
    CapacitorApp.addListener('backButton', () => {
      const handled = backHandlerRef.current();
      if (!handled) {
        CapacitorApp.minimizeApp().catch(() => {});
      }
    })
      .then((handle) => {
        listenerCleanup = () => {
          handle.remove().catch(() => {});
        };
      })
      .catch(() => {});

    return () => {
      if (listenerCleanup) listenerCleanup();
    };
  }, []);

  // Binder (ဖိုင်တွဲ) CRUD handlers
  const handleCreateFolder = async (cleanName: string) => {
    const now = Date.now();
    const newFolder: BookFolder = {
      id: createUniqueId('folder'),
      name: cleanName,
      createdAt: now,
      updatedAt: now,
      groupId: activeGroupId ?? null,
    };
    setFolders((prev) => [newFolder, ...prev]);
    setIsCreateBinderModalOpen(false);
    openFolder(newFolder.id, false);
    await saveFolderRecord(newFolder);
    showToast(t.toastBinderCreated(cleanName));
  };

  const handleRenameFolder = async (cleanName: string) => {
    if (!renameTargetFolder) return;
    const updated: BookFolder = {
      ...renameTargetFolder,
      name: cleanName,
      updatedAt: Date.now(),
    };
    setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setRenameTargetFolder(null);
    await saveFolderRecord(updated);
    showToast(t.toastBinderRenamed(cleanName));
  };

  // Parent Group Folder (ဖိုဒါလ်) CRUD & Grouping handlers
  const handleCreateGroup = async (cleanName: string, initialBinderIds: Set<string>) => {
    const now = Date.now();
    const newGroup: GroupFolder = {
      id: createUniqueId('group'),
      name: cleanName,
      createdAt: now,
      updatedAt: now,
    };
    setGroups((prev) => [newGroup, ...prev]);
    setIsCreateGroupModalOpen(false);
    await saveGroupRecord(newGroup);

    if (initialBinderIds.size > 0) {
      const { updatedAll, changedRecords } = syncGroupMembership(
        folders,
        newGroup.id,
        initialBinderIds,
        now
      );
      setFolders(updatedAll);
      await saveFolderRecords(changedRecords);
    }

    showToast(t.toastGroupCreated(cleanName));
  };

  const handleRenameGroup = async (cleanName: string) => {
    if (!renameTargetGroup) return;
    const updated: GroupFolder = {
      ...renameTargetGroup,
      name: cleanName,
      updatedAt: Date.now(),
    };
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setRenameTargetGroup(null);
    await saveGroupRecord(updated);
    showToast(t.toastGroupRenamed(cleanName));
  };

  const handleSaveGroupMembership = async (groupId: string, selectedBinderIds: Set<string>) => {
    const { updatedAll, changedRecords } = syncGroupMembership(
      folders,
      groupId,
      selectedBinderIds
    );
    const grpName = groups.find((g) => g.id === groupId)?.name ?? '';
    setFolders(updatedAll);
    setManageBindersGroup(null);
    await saveFolderRecords(changedRecords);
    showToast(t.toastGroupBindersUpdated(grpName));
  };

  const handleAssignBinderToGroup = async (binderId: string, targetGroupId: string | null) => {
    const target = folders.find((f) => f.id === binderId);
    if (!target) return;
    const updated: BookFolder = {
      ...target,
      groupId: targetGroupId,
      updatedAt: Date.now(),
    };
    setFolders((prev) => prev.map((f) => (f.id === binderId ? updated : f)));
    setAssignGroupTargetBinder(null);
    await saveFolderRecord(updated);
    const gName = targetGroupId ? groups.find((g) => g.id === targetGroupId)?.name ?? null : null;
    showToast(t.toastBinderMovedToGroup(gName));
  };

  const handleCreateGroupAndAssignBinder = async (binderId: string, newGroupName: string) => {
    const now = Date.now();
    const newGroup: GroupFolder = {
      id: createUniqueId('group'),
      name: newGroupName,
      createdAt: now,
      updatedAt: now,
    };
    const target = folders.find((f) => f.id === binderId);
    setGroups((prev) => [newGroup, ...prev]);
    setAssignGroupTargetBinder(null);
    await saveGroupRecord(newGroup);

    if (target) {
      const updatedBinder: BookFolder = { ...target, groupId: newGroup.id, updatedAt: now };
      setFolders((prev) => prev.map((f) => (f.id === binderId ? updatedBinder : f)));
      await saveFolderRecord(updatedBinder);
    }
    showToast(t.toastBinderMovedToGroup(newGroupName));
  };

  // Upload photos
  const handleUploadFilesToFolder = async (targetFolderId: string, fileList: FileList) => {
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name)
    );
    if (files.length === 0) {
      showToast(t.toastInvalidImageType);
      return;
    }

    const baseTime = Date.now();
    const createdItems: PhotoItem[] = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const mimeType = file.type || 'image/jpeg';
      // Copy camera/gallery File bytes into a durable in-memory Blob so Android WebView
      // temporary camera file cleanup never invalidates IndexedDB records.
      const arrayBuf = await file.arrayBuffer();
      const durableBlob = new Blob([arrayBuf], { type: mimeType });

      createdItems.push({
        id: createUniqueId('photo'),
        folderId: targetFolderId,
        name: file.name || `page-${idx + 1}.jpg`,
        mimeType,
        createdAt: baseTime + idx,
        size: durableBlob.size,
        blob: durableBlob,
        previewUrl: URL.createObjectURL(durableBlob),
      });
    }

    setPhotos((prev) => [...prev, ...createdItems]);
    await savePhotoRecords(createdItems);
    showToast(t.toastPhotosAdded(createdItems.length));
  };

  // Binder Share & ZIP Download
  const handleShareFolder = async (summary: FolderSummary) => {
    const folderPhotos = photos.filter((p) => p.folderId === summary.folder.id);
    if (folderPhotos.length === 0) return;

    setBusyAction('share');
    try {
      const outcome = await shareEntireFolder(summary.folder, folderPhotos);
      setMenuTargetFolderId(null);
      if (outcome === 'shared_native') {
        showToast(t.toastFolderSharedNative);
      } else if (outcome === 'shared_zip_fallback') {
        showToast(t.toastFolderSharedZip);
      } else if (outcome === 'downloaded_fallback') {
        showToast(t.toastFolderDownloadedFallback);
      }
    } catch {
      showToast(t.toastShareError);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadFolderZip = async (summary: FolderSummary) => {
    const folderPhotos = photos.filter((p) => p.folderId === summary.folder.id);
    if (folderPhotos.length === 0) return;

    setBusyAction('zip');
    try {
      const outcome = await downloadFolderAsZip(summary.folder, folderPhotos);
      setMenuTargetFolderId(null);
      if (outcome.status === 'saved') {
        showToast(t.toastZipDownloaded(outcome.displayPath));
      }
    } catch {
      showToast(t.toastZipError);
    } finally {
      setBusyAction(null);
    }
  };

  // Single photo Share & Download
  const handleShareSinglePhoto = async (photo: PhotoItem, pageNumber: number) => {
    if (!activeFolderSummary) return;
    try {
      const outcome = await shareSinglePhoto(photo, activeFolderSummary.folder.name, pageNumber);
      if (outcome === 'downloaded_fallback') {
        showToast(t.toastSingleDownloadedFallback);
      } else if (outcome === 'shared_native') {
        showToast(t.toastSingleSharedNative);
      }
    } catch {
      showToast(t.toastShareError);
    }
  };

  const handleDownloadSinglePhoto = async (photo: PhotoItem, pageNumber: number) => {
    if (!activeFolderSummary) return;
    try {
      const outcome = await downloadSinglePhoto(photo, activeFolderSummary.folder.name, pageNumber);
      if (outcome.status === 'saved') {
        showToast(t.toastSingleDownloaded(pageNumber));
      }
    } catch {
      showToast(t.toastDownloadError);
    }
  };

  // Long-press & Multi-select photo toggle, Batch Share, Batch Download & Move
  const handleLongPressPhoto = (photoId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedPhotoIds(new Set([photoId]));
      return;
    }
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleTogglePhotoSelect = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleSelectAllOrClear = () => {
    if (selectedPhotoIds.size === activeFolderPhotos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(activeFolderPhotos.map((p) => p.id)));
    }
  };

  const handleShareSelectedPhotos = async () => {
    if (!activeFolderSummary || selectedPhotoIds.size === 0) return;
    const chosen = activeFolderPhotos.filter((p) => selectedPhotoIds.has(p.id));
    if (chosen.length === 0) return;

    setBusyAction('share_selected');
    try {
      const outcome = await shareSelectedPhotos(
        activeFolderSummary.folder,
        chosen,
        activeFolderPhotos
      );
      if (outcome === 'shared_native') {
        showToast(t.toastSelectedSharedNative(chosen.length));
      } else if (outcome === 'shared_zip_fallback') {
        showToast(t.toastFolderSharedZip);
      } else if (outcome === 'downloaded_fallback') {
        showToast(
          chosen.length === 1
            ? t.toastSingleDownloadedFallback
            : t.toastFolderDownloadedFallback
        );
      }
    } catch {
      showToast(t.toastShareError);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadSelectedPhotos = async () => {
    if (!activeFolderSummary || selectedPhotoIds.size === 0) return;
    const chosen = activeFolderPhotos.filter((p) => selectedPhotoIds.has(p.id));
    if (chosen.length === 0) return;

    setBusyAction('download_selected');
    try {
      const outcome = await downloadSelectedPhotos(
        activeFolderSummary.folder,
        chosen,
        activeFolderPhotos
      );
      if (outcome.status === 'saved') {
        if (chosen.length === 1) {
          const pageNum = activeFolderPhotos.findIndex((p) => p.id === chosen[0].id) + 1;
          showToast(t.toastSingleDownloaded(pageNum || 1));
        } else {
          showToast(t.toastSelectedDownloaded(outcome.displayPath));
        }
      }
    } catch {
      showToast(t.toastDownloadError);
    } finally {
      setBusyAction(null);
    }
  };

  const handleMoveSelectedToExisting = async (targetFolderId: string) => {
    if (selectedPhotoIds.size === 0) return;
    const count = selectedPhotoIds.size;
    const updatedPhotos = movePhotosToFolder(photos, selectedPhotoIds, targetFolderId);
    const movedRecords = updatedPhotos.filter((p) => selectedPhotoIds.has(p.id));

    setPhotos(updatedPhotos);
    setSelectedPhotoIds(new Set());
    setIsSelectionMode(false);
    setIsMoveModalOpen(false);

    await savePhotoRecords(movedRecords);
    const destName = folders.find((f) => f.id === targetFolderId)?.name ?? '';
    showToast(t.toastPhotosMoved(count, destName));
  };

  const handleCreateFolderAndMoveSelected = async (newFolderName: string) => {
    const now = Date.now();
    const newFolder: BookFolder = {
      id: createUniqueId('folder'),
      name: newFolderName,
      createdAt: now,
      updatedAt: now,
      groupId: activeFolderSummary?.folder.groupId ?? null,
    };
    const count = selectedPhotoIds.size;
    const updatedPhotos = movePhotosToFolder(photos, selectedPhotoIds, newFolder.id);
    const movedRecords = updatedPhotos.filter((p) => selectedPhotoIds.has(p.id));

    setFolders((prev) => [newFolder, ...prev]);
    setPhotos(updatedPhotos);
    setSelectedPhotoIds(new Set());
    setIsSelectionMode(false);
    setIsMoveModalOpen(false);

    await saveFolderRecord(newFolder);
    await savePhotoRecords(movedRecords);
    showToast(t.toastBinderCreatedAndMoved(newFolderName, count));
  };

  // Confirmed Deletions (Database Reset, Group, Binder, Single Photo, Selected Photos)
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    if (pendingDelete.kind === 'reset_database') {
      for (const p of photos) {
        if (p.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(p.previewUrl);
        }
      }

      setGroups([]);
      setFolders([]);
      setPhotos([]);
      setActiveGroupId(null);
      setActiveFolderId(null);
      setSearchQuery('');
      setIsSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLightboxIndex(null);
      setPendingDelete(null);
      setIsSettingsOpen(false);

      await clearEntireArchiveDatabase();
      showToast(t.toastDatabaseReset);
      return;
    }

    if (pendingDelete.kind === 'group') {
      const targetGroupId = pendingDelete.summary.group.id;
      const targetGroupName = pendingDelete.summary.group.name;
      const { nextGroups, nextFolders, ungroupedFolders } = removeGroupAndUngroupBinders(
        groups,
        folders,
        targetGroupId
      );

      setGroups(nextGroups);
      setFolders(nextFolders);
      if (activeGroupId === targetGroupId) {
        setActiveGroupId(null);
      }
      setPendingDelete(null);

      await deleteGroupAndUngroupRecord(targetGroupId, ungroupedFolders);
      showToast(t.toastGroupDeleted(targetGroupName));
      return;
    }

    if (pendingDelete.kind === 'folder') {
      const targetId = pendingDelete.summary.folder.id;
      const targetName = pendingDelete.summary.folder.name;
      const folderPhotos = photos.filter((p) => p.folderId === targetId);
      const photoIds = folderPhotos.map((p) => p.id);

      for (const p of folderPhotos) {
        if (p.blob && p.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(p.previewUrl);
        }
      }

      setFolders((prev) => prev.filter((f) => f.id !== targetId));
      setPhotos((prev) => prev.filter((p) => p.folderId !== targetId));
      if (activeFolderId === targetId) {
        navigateBackFromBinder();
      }
      setPendingDelete(null);

      await deleteFolderAndPhotosRecord(targetId, photoIds);
      showToast(t.toastBinderDeleted(targetName));
      return;
    }

    if (pendingDelete.kind === 'single_photo') {
      const targetPhoto = pendingDelete.photo;
      const currentList = activeFolderPhotos;
      const currentIdx = currentList.findIndex((p) => p.id === targetPhoto.id);

      if (targetPhoto.blob && targetPhoto.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(targetPhoto.previewUrl);
      }

      const nextPhotos = deletePhotosByIds(photos, new Set([targetPhoto.id]));
      setPhotos(nextPhotos);

      const remainingCount = currentList.length - 1;
      if (remainingCount <= 0) {
        setLightboxIndex(null);
      } else if (lightboxIndex !== null && currentIdx !== -1) {
        setLightboxIndex(Math.min(currentIdx, remainingCount - 1));
      }

      setPendingDelete(null);
      await deletePhotoRecords([targetPhoto.id]);
      showToast(t.toastSinglePhotoDeleted);
      return;
    }

    if (pendingDelete.kind === 'selected_photos') {
      const idsArray = Array.from(selectedPhotoIds);
      for (const p of photos) {
        if (selectedPhotoIds.has(p.id) && p.blob && p.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(p.previewUrl);
        }
      }

      setPhotos((prev) => deletePhotosByIds(prev, selectedPhotoIds));
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);
      setPendingDelete(null);

      await deletePhotoRecords(idsArray);
      showToast(t.toastSelectedPhotosDeleted(idsArray.length));
    }
  };

  // Full Archive Backup Export & Restore (Import) handlers
  const handleExportBackup = async () => {
    try {
      setBusyAction('backup_export');
      setExportProgress(null);
      const outcome = await exportFullArchiveZip({ groups, folders, photos }, (pct) => {
        setExportProgress(pct);
      });
      if (outcome.status === 'cancelled') {
        return;
      }
      setIsSettingsOpen(false);
      showToast(t.toastBackupExported(outcome.displayPath));
    } catch {
      showToast(t.toastBackupExportError);
    } finally {
      setBusyAction(null);
      setExportProgress(null);
    }
  };

  const handleApplyBackup = async (incoming: ArchiveSnapshot, mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      for (const oldPhoto of photos) {
        if (oldPhoto.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(oldPhoto.previewUrl);
        }
      }
      setGroups(incoming.groups);
      setFolders(incoming.folders);
      setPhotos(incoming.photos);
      setActiveFolderId(null);
      setActiveGroupId(null);
      setIsSelectionMode(false);
      setSelectedPhotoIds(new Set());
      setLightboxIndex(null);

      await replaceEntireArchiveRecords(incoming.groups, incoming.folders, incoming.photos);
      setIsSettingsOpen(false);
      showToast(
        t.toastBackupReplaced(
          incoming.groups.length,
          incoming.folders.length,
          incoming.photos.length
        )
      );
      return;
    }

    const { merged, addedGroups, addedFolders, addedPhotos } = mergeArchiveData(
      { groups, folders, photos },
      incoming
    );
    // Revoke any incoming blob URLs that were deduplicated out during merge
    const keptIds = new Set(merged.photos.map((p) => p.id));
    for (const incPhoto of incoming.photos) {
      if (!keptIds.has(incPhoto.id) || photos.some((cur) => cur.id === incPhoto.id)) {
        if (incPhoto.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(incPhoto.previewUrl);
        }
      }
    }

    setGroups(merged.groups);
    setFolders(merged.folders);
    setPhotos(merged.photos);
    await replaceEntireArchiveRecords(merged.groups, merged.folders, merged.photos);
    setIsSettingsOpen(false);
    showToast(t.toastBackupMerged(addedGroups, addedFolders, addedPhotos));
  };

  return (
    <div className="min-h-dvh text-stone-900 dark:text-stone-100">
      {/* Main Content Area */}
      {isLoading ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-3 animate-pulse">
            <div className="h-28 w-full glass-panel rounded-[2px]" />
            <div className="h-16 w-full glass-panel rounded-[2px]" />
            <div className="h-16 w-full glass-panel rounded-[2px]" />
          </div>
        </div>
      ) : loadError ? (
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="glass-panel rounded-[2px] p-6 text-center">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {loadError || t.loadErrorFallback}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-medium"
            >
              {t.retryBtn}
            </button>
          </div>
        </div>
      ) : activeFolderSummary ? (
        <FolderDetailView
          summary={activeFolderSummary}
          backDestinationLabel={activeGroupSummary ? activeGroupSummary.group.name : t.backToAllSpecs}
          groupSubtitleName={activeFolderParentGroupName}
          photos={activeFolderPhotos}
          isSelectionMode={isSelectionMode}
          selectedPhotoIds={selectedPhotoIds}
          t={t}
          busyAction={busyAction}
          onBack={navigateBackFromBinder}
          onShareFolder={handleShareFolder}
          onOpenSettings={() => {
            setToastMessage(null);
            setIsSettingsOpen(true);
          }}
          onOpenFolderMenu={(s) => setMenuTargetFolderId(s.folder.id)}
          onUploadFiles={(files) => handleUploadFilesToFolder(activeFolderSummary.folder.id, files)}
          onOpenPhotoAtIndex={(idx) => setLightboxIndex(idx)}
          onLongPressPhoto={handleLongPressPhoto}
          onTogglePhotoSelect={handleTogglePhotoSelect}
          onSelectAllOrClear={handleSelectAllOrClear}
          onExitSelectionMode={() => {
            setIsSelectionMode(false);
            setSelectedPhotoIds(new Set());
          }}
          onShareSelected={handleShareSelectedPhotos}
          onDownloadSelected={handleDownloadSelectedPhotos}
          onRequestMoveSelected={() => setIsMoveModalOpen(true)}
          onRequestDeleteSelected={() =>
            setPendingDelete({
              kind: 'selected_photos',
              folderId: activeFolderSummary.folder.id,
              count: selectedPhotoIds.size,
            })
          }
        />
      ) : (
        <HomeDetailsView
          activeGroupSummary={activeGroupSummary}
          groupSummaries={visibleGroupSummaries}
          binderSummaries={visibleBinderSummaries}
          allGroups={groups}
          totalGroupCount={groups.length}
          totalBinderCount={folders.length}
          totalPhotoCount={photos.length}
          searchQuery={searchQuery}
          sortMode={sortMode}
          t={t}
          onSearchChange={setSearchQuery}
          onSortChange={setSortMode}
          onOpenSettings={() => {
            setToastMessage(null);
            setIsSettingsOpen(true);
          }}
          onCreateGroupClick={() => setIsCreateGroupModalOpen(true)}
          onCreateBinderClick={() => setIsCreateBinderModalOpen(true)}
          onOpenGroup={(gId) => {
            setActiveGroupId(gId);
            setSearchQuery('');
          }}
          onExitGroup={() => setActiveGroupId(null)}
          onOpenGroupMenu={(gs) => setMenuTargetGroupId(gs.group.id)}
          onManageGroupBinders={(grp) => setManageBindersGroup(grp)}
          onOpenFolder={(id) => openFolder(id, false)}
          onOpenFolderMenu={(s) => setMenuTargetFolderId(s.folder.id)}
        />
      )}

      {/* Settings Modal (Language, Appearance, and Full ZIP Backup Export/Import) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        isDarkMode={isDarkMode}
        totalGroupCount={groups.length}
        totalBinderCount={folders.length}
        totalPhotoCount={photos.length}
        isExportingBackup={busyAction === 'backup_export'}
        exportProgress={exportProgress}
        t={t}
        onClose={() => setIsSettingsOpen(false)}
        onChangeLanguage={setLanguage}
        onChangeDarkMode={setIsDarkMode}
        onExportBackup={handleExportBackup}
        onApplyBackup={handleApplyBackup}
        onRequestResetDatabase={() => setPendingDelete({ kind: 'reset_database' })}
      />

      {/* Binder (ဖိုင်တွဲ) ⋯ Action Menu */}
      <FolderActionMenu
        summary={menuSummary}
        groups={groups}
        busyAction={busyAction}
        t={t}
        onClose={() => setMenuTargetFolderId(null)}
        onShareFolder={handleShareFolder}
        onDownloadZip={handleDownloadFolderZip}
        onSelectPhotos={(s) => {
          setMenuTargetFolderId(null);
          openFolder(s.folder.id, true);
        }}
        onAssignGroup={(s) => {
          setMenuTargetFolderId(null);
          setAssignGroupTargetBinder(s.folder);
        }}
        onRenameFolder={(s) => {
          setMenuTargetFolderId(null);
          setRenameTargetFolder(s.folder);
        }}
        onDeleteFolder={(s) => {
          setMenuTargetFolderId(null);
          setPendingDelete({ kind: 'folder', summary: s });
        }}
      />

      {/* Parent Group Folder (ဖိုဒါလ်) ⋯ Action Menu */}
      <GroupActionMenu
        summary={menuGroupSummary}
        t={t}
        onClose={() => setMenuTargetGroupId(null)}
        onManageBinders={(gs) => {
          setMenuTargetGroupId(null);
          setManageBindersGroup(gs.group);
        }}
        onRenameGroup={(gs) => {
          setMenuTargetGroupId(null);
          setRenameTargetGroup(gs.group);
        }}
        onDeleteGroup={(gs) => {
          setMenuTargetGroupId(null);
          setPendingDelete({ kind: 'group', summary: gs });
        }}
      />

      {/* Create Binder Modal */}
      <FolderFormModal
        mode="create"
        isOpen={isCreateBinderModalOpen}
        existingFolders={folders}
        language={language}
        t={t}
        onClose={() => setIsCreateBinderModalOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* Rename Binder Modal */}
      <FolderFormModal
        mode="rename"
        isOpen={renameTargetFolder !== null}
        initialName={renameTargetFolder?.name ?? ''}
        excludeFolderId={renameTargetFolder?.id}
        existingFolders={folders}
        language={language}
        t={t}
        onClose={() => setRenameTargetFolder(null)}
        onSubmit={handleRenameFolder}
      />

      {/* Create Parent Group Folder (ဖိုဒါလ်) Modal */}
      <GroupFormModal
        mode="create"
        isOpen={isCreateGroupModalOpen}
        existingGroups={groups}
        allBinders={folders}
        language={language}
        t={t}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onSubmit={handleCreateGroup}
      />

      {/* Rename Parent Group Folder (ဖိုဒါလ်) Modal */}
      <GroupFormModal
        mode="rename"
        isOpen={renameTargetGroup !== null}
        initialName={renameTargetGroup?.name ?? ''}
        excludeGroupId={renameTargetGroup?.id}
        existingGroups={groups}
        allBinders={folders}
        language={language}
        t={t}
        onClose={() => setRenameTargetGroup(null)}
        onSubmit={(cleanName) => handleRenameGroup(cleanName)}
      />

      {/* Manage Binders inside a Group Folder Modal */}
      <ManageGroupBindersModal
        group={manageBindersGroup}
        allBinders={folders}
        t={t}
        onClose={() => setManageBindersGroup(null)}
        onSaveMembership={handleSaveGroupMembership}
      />

      {/* Assign Single Binder to a Group Folder Modal */}
      <AssignBinderToGroupModal
        binder={assignGroupTargetBinder}
        groups={groups}
        language={language}
        t={t}
        onClose={() => setAssignGroupTargetBinder(null)}
        onAssignGroup={handleAssignBinderToGroup}
        onCreateGroupAndAssign={handleCreateGroupAndAssignBinder}
      />

      {/* Move Selected Photos Modal */}
      {activeFolderSummary && (
        <MovePhotosModal
          isOpen={isMoveModalOpen}
          selectedCount={selectedPhotoIds.size}
          currentFolderId={activeFolderSummary.folder.id}
          folders={folders}
          language={language}
          t={t}
          onClose={() => setIsMoveModalOpen(false)}
          onMoveToExisting={handleMoveSelectedToExisting}
          onCreateAndMove={handleCreateFolderAndMoveSelected}
        />
      )}

      {/* Full-Screen Swipeable Photo Lightbox */}
      {activeFolderSummary && (
        <PhotoLightbox
          folderName={activeFolderSummary.folder.name}
          photos={activeFolderPhotos}
          currentIndex={lightboxIndex}
          t={t}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={(nextIdx) => setLightboxIndex(nextIdx)}
          onSharePhoto={handleShareSinglePhoto}
          onDownloadPhoto={handleDownloadSinglePhoto}
          onRequestDeletePhoto={(photo, pageNumber) =>
            setPendingDelete({ kind: 'single_photo', photo, pageNumber })
          }
        />
      )}

      {/* Confirmation Dialog for Deleting Group, Binder, Photos, or Resetting Database */}
      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'reset_database'
            ? t.confirmResetDbTitle
            : pendingDelete?.kind === 'group'
            ? t.confirmDeleteGroupTitle(pendingDelete.summary.group.name)
            : pendingDelete?.kind === 'folder'
            ? t.confirmDeleteBinderTitle(pendingDelete.summary.folder.name)
            : pendingDelete?.kind === 'selected_photos'
            ? t.confirmDeleteSelectedPhotosTitle(pendingDelete.count)
            : pendingDelete?.kind === 'single_photo'
            ? t.confirmDeleteSinglePhotoTitle(pendingDelete.pageNumber)
            : ''
        }
        description={
          pendingDelete?.kind === 'reset_database'
            ? t.confirmResetDbDesc(groups.length, folders.length, photos.length)
            : pendingDelete?.kind === 'group'
            ? t.confirmDeleteGroupDesc(pendingDelete.summary.binderCount)
            : pendingDelete?.kind === 'folder'
            ? t.confirmDeleteBinderDesc(pendingDelete.summary.photoCount)
            : t.confirmDeletePhotosDesc
        }
        cancelLabel={t.cancelDeleteBtn}
        confirmLabel={
          pendingDelete?.kind === 'reset_database' ? t.confirmResetDbBtn : t.confirmDeleteBtn
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Non-intrusive Glass Status Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-[70] w-max max-w-[calc(100vw-2rem)] sm:max-w-lg px-4 py-2.5 rounded-[2px] bg-stone-900/90 dark:bg-stone-100/92 backdrop-blur-xl border border-white/15 dark:border-stone-900/15 text-stone-50 dark:text-stone-950 text-xs sm:text-sm font-medium leading-relaxed text-center break-words shadow-xl transition-[bottom] duration-150 ${
            lightboxIndex !== null
              ? 'bottom-[calc(var(--safe-bottom)+4.75rem)]'
              : isSelectionMode
              ? 'bottom-[calc(var(--safe-bottom)+6.75rem)] sm:bottom-[calc(var(--safe-bottom)+5rem)]'
              : 'bottom-[calc(var(--safe-bottom)+1.25rem)]'
          }`}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
