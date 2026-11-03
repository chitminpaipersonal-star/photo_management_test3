import { TRANSLATIONS } from '../i18n/translations';
import type {
  BookFolder,
  FolderSummary,
  GroupFolder,
  GroupSummary,
  Language,
  PhotoItem,
  SortMode,
} from '../types/archive';

/**
 * Formats byte size into clean human-readable KB / MB / GB strings.
 * Returns null when bytes is null or undefined (e.g. legacy pre-update folders).
 */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return null;
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return kb >= 100 ? `${Math.round(kb)} KB` : `${kb.toFixed(1).replace(/\.0$/, '')} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1).replace(/\.0$/, '')} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Formats a timestamp into a clean, vertically aligned tabular date (e.g. "28 Oct 2026").
 */
export function formatArchiveDate(timestamp: number): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/**
 * Computes Details View summary metrics for a single book binder (ဖိုင်တွဲ).
 * File size is computed ONLY from photos that carry post-update `size` metadata.
 */
export function computeFolderSummary(folder: BookFolder, allPhotos: PhotoItem[]): FolderSummary {
  const folderPhotos = allPhotos
    .filter((p) => p.folderId === folder.id)
    .sort((a, b) => a.createdAt - b.createdAt);

  const sizedPhotos = folderPhotos.filter(
    (p): p is PhotoItem & { size: number } => typeof p.size === 'number' && p.size >= 0
  );

  const knownTotalSize =
    sizedPhotos.length > 0 ? sizedPhotos.reduce((acc, item) => acc + item.size, 0) : null;

  return {
    folder,
    photoCount: folderPhotos.length,
    knownTotalSize,
    coverPhoto: folderPhotos.length > 0 ? folderPhotos[0] : null,
  };
}

/**
 * Computes summary metrics for a parent Group Folder (ဖိုဒါလ်) from all binder summaries.
 */
export function computeGroupSummary(
  group: GroupFolder,
  allBinderSummaries: FolderSummary[]
): GroupSummary {
  const childSummaries = allBinderSummaries.filter((s) => s.folder.groupId === group.id);
  const photoCount = childSummaries.reduce((acc, s) => acc + s.photoCount, 0);
  const sizedChildren = childSummaries.filter(
    (s): s is FolderSummary & { knownTotalSize: number } => typeof s.knownTotalSize === 'number'
  );
  const knownTotalSize =
    sizedChildren.length > 0
      ? sizedChildren.reduce((acc, s) => acc + s.knownTotalSize, 0)
      : null;

  return {
    group,
    binderCount: childSummaries.length,
    photoCount,
    knownTotalSize,
  };
}

function compareNames(aName: string, bName: string): number {
  return aName.localeCompare(bName, ['my', 'en'], {
    sensitivity: 'base',
    numeric: true,
  });
}

/**
 * Filters and sorts book binder summaries.
 */
export function filterAndSortFolders(
  summaries: FolderSummary[],
  searchQuery: string,
  sortMode: SortMode
): FolderSummary[] {
  const normalizedQuery = searchQuery.normalize('NFC').trim().toLowerCase();

  const filtered = normalizedQuery
    ? summaries.filter((item) =>
        item.folder.name.normalize('NFC').toLowerCase().includes(normalizedQuery)
      )
    : [...summaries];

  filtered.sort((a, b) => {
    if (sortMode === 'name_asc') {
      const cmp = compareNames(a.folder.name, b.folder.name);
      if (cmp !== 0) return cmp;
      return b.folder.createdAt - a.folder.createdAt;
    }
    const timeDiff = b.folder.createdAt - a.folder.createdAt;
    if (timeDiff !== 0) return timeDiff;
    return compareNames(a.folder.name, b.folder.name);
  });

  return filtered;
}

/**
 * Filters and sorts parent Group Folder summaries (ဖိုဒါလ်များ).
 */
export function filterAndSortGroups(
  groupSummaries: GroupSummary[],
  searchQuery: string,
  sortMode: SortMode
): GroupSummary[] {
  const normalizedQuery = searchQuery.normalize('NFC').trim().toLowerCase();

  const filtered = normalizedQuery
    ? groupSummaries.filter((item) =>
        item.group.name.normalize('NFC').toLowerCase().includes(normalizedQuery)
      )
    : [...groupSummaries];

  filtered.sort((a, b) => {
    if (sortMode === 'name_asc') {
      const cmp = compareNames(a.group.name, b.group.name);
      if (cmp !== 0) return cmp;
      return b.group.createdAt - a.group.createdAt;
    }
    const timeDiff = b.group.createdAt - a.group.createdAt;
    if (timeDiff !== 0) return timeDiff;
    return compareNames(a.group.name, b.group.name);
  });

  return filtered;
}

export interface FolderValidationResult {
  valid: boolean;
  trimmed: string;
  error?: string;
}

/**
 * Validates book binder (ဖိုင်တွဲ) creation / rename input.
 */
export function validateFolderName(
  rawName: string,
  existingFolders: BookFolder[] = [],
  excludeFolderId?: string,
  lang: Language = 'my'
): FolderValidationResult {
  const t = TRANSLATIONS[lang];
  const trimmed = rawName.normalize('NFC').trim();
  if (!trimmed) {
    return { valid: false, trimmed: '', error: t.errEmptyBinderName };
  }
  if (trimmed.length > 120) {
    return { valid: false, trimmed, error: t.errLongName };
  }

  const normalizedTarget = trimmed.toLowerCase();
  const isDuplicate = existingFolders.some(
    (f) => f.id !== excludeFolderId && f.name.normalize('NFC').trim().toLowerCase() === normalizedTarget
  );

  if (isDuplicate) {
    return { valid: false, trimmed, error: t.errDuplicateBinderName };
  }

  return { valid: true, trimmed };
}

/**
 * Validates parent Group Folder (ဖိုဒါလ်) creation / rename input.
 */
export function validateGroupName(
  rawName: string,
  existingGroups: GroupFolder[] = [],
  excludeGroupId?: string,
  lang: Language = 'my'
): FolderValidationResult {
  const t = TRANSLATIONS[lang];
  const trimmed = rawName.normalize('NFC').trim();
  if (!trimmed) {
    return { valid: false, trimmed: '', error: t.errEmptyGroupName };
  }
  if (trimmed.length > 120) {
    return { valid: false, trimmed, error: t.errLongName };
  }

  const normalizedTarget = trimmed.toLowerCase();
  const isDuplicate = existingGroups.some(
    (g) => g.id !== excludeGroupId && g.name.normalize('NFC').trim().toLowerCase() === normalizedTarget
  );

  if (isDuplicate) {
    return { valid: false, trimmed, error: t.errDuplicateGroupName };
  }

  return { valid: true, trimmed };
}

/**
 * Immutably updates the membership of a Group Folder (`targetGroupId`) so that:
 * - binders in `selectedBinderIds` belong to `targetGroupId`
 * - binders previously in `targetGroupId` that were unchecked return to root (`groupId: null`)
 */
export function syncGroupMembership(
  folders: BookFolder[],
  targetGroupId: string,
  selectedBinderIds: ReadonlySet<string>,
  now = Date.now()
): { updatedAll: BookFolder[]; changedRecords: BookFolder[] } {
  const changedRecords: BookFolder[] = [];

  const updatedAll = folders.map((folder) => {
    const shouldBelong = selectedBinderIds.has(folder.id);
    const currentlyBelongs = folder.groupId === targetGroupId;

    if (shouldBelong && !currentlyBelongs) {
      const updated: BookFolder = { ...folder, groupId: targetGroupId, updatedAt: now };
      changedRecords.push(updated);
      return updated;
    }
    if (!shouldBelong && currentlyBelongs) {
      const updated: BookFolder = { ...folder, groupId: null, updatedAt: now };
      changedRecords.push(updated);
      return updated;
    }
    return folder;
  });

  return { updatedAll, changedRecords };
}

/**
 * Immutably deletes a parent Group Folder and safely ungroups any child binders back to root (`groupId: null`).
 */
export function removeGroupAndUngroupBinders(
  groups: GroupFolder[],
  folders: BookFolder[],
  groupIdToDelete: string,
  now = Date.now()
): {
  nextGroups: GroupFolder[];
  nextFolders: BookFolder[];
  ungroupedFolders: BookFolder[];
} {
  const nextGroups = groups.filter((g) => g.id !== groupIdToDelete);
  const ungroupedFolders: BookFolder[] = [];
  const nextFolders = folders.map((f) => {
    if (f.groupId === groupIdToDelete) {
      const updated: BookFolder = { ...f, groupId: null, updatedAt: now };
      ungroupedFolders.push(updated);
      return updated;
    }
    return f;
  });

  return { nextGroups, nextFolders, ungroupedFolders };
}

/**
 * Immutably moves selected photos into a destination binder.
 */
export function movePhotosToFolder(
  photos: PhotoItem[],
  selectedPhotoIds: ReadonlySet<string>,
  targetFolderId: string
): PhotoItem[] {
  if (!targetFolderId || selectedPhotoIds.size === 0) {
    return photos;
  }
  return photos.map((photo) =>
    selectedPhotoIds.has(photo.id) ? { ...photo, folderId: targetFolderId } : photo
  );
}

/**
 * Immutably deletes photos matching the given ID set.
 */
export function deletePhotosByIds(
  photos: PhotoItem[],
  idsToDelete: ReadonlySet<string>
): PhotoItem[] {
  if (idsToDelete.size === 0) {
    return photos;
  }
  return photos.filter((photo) => !idsToDelete.has(photo.id));
}

/**
 * Sanitizes a folder or photo name for safe file / ZIP export while preserving Myanmar Unicode script.
 */
export function sanitizeExportFilename(rawName: string, fallback = 'specifications'): string {
  const cleaned = rawName
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

const LEGACY_SEED_GROUP_IDS = new Set(['seed-group-design']);
const LEGACY_SEED_FOLDER_IDS = new Set(['seed-folder-arch', 'seed-folder-poetry']);
const LEGACY_SEED_PHOTO_IDS = new Set([
  'seed-photo-1',
  'seed-photo-2',
  'seed-photo-3',
  'seed-photo-4',
]);

/**
 * Removes legacy pre-bundled sample records (`seed-*`) while preserving 100% of user-created
 * groups, binders, and photos (keeping any legacy seed binder/group if user items still reference it).
 */
export function stripLegacySeedRecords<TPhoto extends { id: string; folderId: string }>(
  groups: GroupFolder[],
  folders: BookFolder[],
  photos: TPhoto[]
): {
  groups: GroupFolder[];
  folders: BookFolder[];
  photos: TPhoto[];
  removedGroupIds: string[];
  removedFolderIds: string[];
  removedPhotoIds: string[];
} {
  const removedPhotoIds: string[] = [];
  const keptPhotos = photos.filter((p) => {
    if (LEGACY_SEED_PHOTO_IDS.has(p.id)) {
      removedPhotoIds.push(p.id);
      return false;
    }
    return true;
  });

  const folderIdsWithUserPhotos = new Set(keptPhotos.map((p) => p.folderId));
  const removedFolderIds: string[] = [];
  const keptFolders = folders.filter((f) => {
    if (LEGACY_SEED_FOLDER_IDS.has(f.id) && !folderIdsWithUserPhotos.has(f.id)) {
      removedFolderIds.push(f.id);
      return false;
    }
    return true;
  });

  const groupIdsWithUserFolders = new Set(
    keptFolders.map((f) => f.groupId).filter((id): id is string => Boolean(id))
  );
  const removedGroupIds: string[] = [];
  const keptGroups = groups.filter((g) => {
    if (LEGACY_SEED_GROUP_IDS.has(g.id) && !groupIdsWithUserFolders.has(g.id)) {
      removedGroupIds.push(g.id);
      return false;
    }
    return true;
  });

  return {
    groups: keptGroups,
    folders: keptFolders,
    photos: keptPhotos,
    removedGroupIds,
    removedFolderIds,
    removedPhotoIds,
  };
}

