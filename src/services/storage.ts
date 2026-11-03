import type { BookFolder, GroupFolder, PhotoItem } from '../types/archive';
import { stripLegacySeedRecords } from '../utils/archiveLogic';

const DB_NAME = 'specifications_book_archive_v1';
const DB_VERSION = 2;
const STORE_GROUPS = 'groups';
const STORE_FOLDERS = 'folders';
const STORE_PHOTOS = 'photos';
const STORE_META = 'meta';

interface StoredPhotoRecord {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  createdAt: number;
  size?: number;
  blob?: Blob;
  staticUrl?: string;
}

function openArchiveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GROUPS)) {
        db.createObjectStore(STORE_GROUPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const photoStore = db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        photoStore.createIndex('folderId', 'folderId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('IndexedDB error'));
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

function getMetaValue(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
}

export async function loadInitialArchive(): Promise<{
  groups: GroupFolder[];
  folders: BookFolder[];
  photos: PhotoItem[];
}> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
  const db = await openArchiveDb();
  const isInitialized = await getMetaValue(db, 'initialized');
  const isSampleSeedPurgedV3 = await getMetaValue(db, 'sample_seed_purged_v3');

  if (!isInitialized) {
    // Fresh install: initialize clean empty database with zero sample data
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const mStore = tx.objectStore(STORE_META);
      mStore.put({ key: 'initialized', value: true });
      mStore.put({ key: 'groups_seeded_v2', value: true });
      mStore.put({ key: 'sample_seed_purged_v3', value: true });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  let groups = await getAllFromStore<GroupFolder>(db, STORE_GROUPS);
  let rawFolders = await getAllFromStore<BookFolder>(db, STORE_FOLDERS);
  let rawPhotos = await getAllFromStore<StoredPhotoRecord>(db, STORE_PHOTOS);

  if (!isSampleSeedPurgedV3) {
    const stripped = stripLegacySeedRecords(groups, rawFolders, rawPhotos);
    groups = stripped.groups;
    rawFolders = stripped.folders;
    rawPhotos = stripped.photos;

    await new Promise<void>((resolve) => {
      const tx = db.transaction(
        [STORE_GROUPS, STORE_FOLDERS, STORE_PHOTOS, STORE_META],
        'readwrite'
      );
      const gStore = tx.objectStore(STORE_GROUPS);
      const fStore = tx.objectStore(STORE_FOLDERS);
      const pStore = tx.objectStore(STORE_PHOTOS);
      const mStore = tx.objectStore(STORE_META);

      for (const gid of stripped.removedGroupIds) {
        gStore.delete(gid);
      }
      for (const fid of stripped.removedFolderIds) {
        fStore.delete(fid);
      }
      for (const pid of stripped.removedPhotoIds) {
        pStore.delete(pid);
      }
      mStore.put({ key: 'sample_seed_purged_v3', value: true });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // Self-healing referential integrity check:
  // 1. Any binder pointing to a deleted/missing groupId is safely returned to root (groupId: null)
  // 2. Any orphaned photo record pointing to a deleted/missing folderId is cleaned up
  const validGroupIds = new Set(groups.map((g) => g.id));
  const foldersToRepair: BookFolder[] = [];
  const folders: BookFolder[] = rawFolders.map((f) => {
    if (f.groupId && !validGroupIds.has(f.groupId)) {
      const repaired: BookFolder = { ...f, groupId: null };
      foldersToRepair.push(repaired);
      return repaired;
    }
    return f;
  });

  const validFolderIds = new Set(folders.map((f) => f.id));
  const orphanedPhotoIds: string[] = [];
  const validRawPhotos: StoredPhotoRecord[] = [];
  for (const rec of rawPhotos) {
    if (!validFolderIds.has(rec.folderId)) {
      orphanedPhotoIds.push(rec.id);
    } else {
      validRawPhotos.push(rec);
    }
  }

  if (foldersToRepair.length > 0 || orphanedPhotoIds.length > 0) {
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_FOLDERS, STORE_PHOTOS], 'readwrite');
      const fStore = tx.objectStore(STORE_FOLDERS);
      const pStore = tx.objectStore(STORE_PHOTOS);
      for (const f of foldersToRepair) {
        fStore.put(f);
      }
      for (const pid of orphanedPhotoIds) {
        pStore.delete(pid);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  db.close();

  const photos: PhotoItem[] = validRawPhotos.map((rec) => {
    let previewUrl = rec.staticUrl;
    if (rec.blob instanceof Blob) {
      previewUrl = URL.createObjectURL(rec.blob);
    }
    return {
      id: rec.id,
      folderId: rec.folderId,
      name: rec.name,
      mimeType: rec.mimeType,
      createdAt: rec.createdAt,
      ...(typeof rec.size === 'number' ? { size: rec.size } : {}),
      blob: rec.blob,
      previewUrl,
    };
  });

  return { groups, folders, photos };
}

export async function saveGroupRecord(group: GroupFolder): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_GROUPS, 'readwrite');
    tx.objectStore(STORE_GROUPS).put(group);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteGroupAndUngroupRecord(
  groupId: string,
  ungroupedFolders: BookFolder[]
): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_GROUPS, STORE_FOLDERS], 'readwrite');
    tx.objectStore(STORE_GROUPS).delete(groupId);
    const fStore = tx.objectStore(STORE_FOLDERS);
    for (const folder of ungroupedFolders) {
      fStore.put(folder);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveFolderRecord(folder: BookFolder): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    tx.objectStore(STORE_FOLDERS).put(folder);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveFolderRecords(folders: BookFolder[]): Promise<void> {
  if (folders.length === 0) return;
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    const fStore = tx.objectStore(STORE_FOLDERS);
    for (const folder of folders) {
      fStore.put(folder);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteFolderAndPhotosRecord(
  folderId: string,
  photoIdsToDelete: string[]
): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_FOLDERS, STORE_PHOTOS], 'readwrite');
    tx.objectStore(STORE_FOLDERS).delete(folderId);
    const pStore = tx.objectStore(STORE_PHOTOS);
    for (const pid of photoIdsToDelete) {
      pStore.delete(pid);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function savePhotoRecords(photos: PhotoItem[]): Promise<void> {
  if (photos.length === 0) return;
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const pStore = tx.objectStore(STORE_PHOTOS);
    for (const photo of photos) {
      const record: StoredPhotoRecord = {
        id: photo.id,
        folderId: photo.folderId,
        name: photo.name,
        mimeType: photo.mimeType,
        createdAt: photo.createdAt,
        ...(typeof photo.size === 'number' ? { size: photo.size } : {}),
        ...(photo.blob ? { blob: photo.blob } : { staticUrl: photo.previewUrl }),
      };
      pStore.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deletePhotoRecords(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const pStore = tx.objectStore(STORE_PHOTOS);
    for (const pid of photoIds) {
      pStore.delete(pid);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function replaceEntireArchiveRecords(
  groups: GroupFolder[],
  folders: BookFolder[],
  photos: PhotoItem[]
): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORE_GROUPS, STORE_FOLDERS, STORE_PHOTOS, STORE_META],
      'readwrite'
    );
    const gStore = tx.objectStore(STORE_GROUPS);
    const fStore = tx.objectStore(STORE_FOLDERS);
    const pStore = tx.objectStore(STORE_PHOTOS);
    const mStore = tx.objectStore(STORE_META);

    gStore.clear();
    fStore.clear();
    pStore.clear();

    for (const group of groups) {
      gStore.put(group);
    }
    for (const folder of folders) {
      fStore.put(folder);
    }
    for (const photo of photos) {
      const record: StoredPhotoRecord = {
        id: photo.id,
        folderId: photo.folderId,
        name: photo.name,
        mimeType: photo.mimeType,
        createdAt: photo.createdAt,
        ...(typeof photo.size === 'number' ? { size: photo.size } : {}),
        ...(photo.blob ? { blob: photo.blob } : { staticUrl: photo.previewUrl }),
      };
      pStore.put(record);
    }

    mStore.put({ key: 'initialized', value: true });
    mStore.put({ key: 'groups_seeded_v2', value: true });
    mStore.put({ key: 'sample_seed_purged_v3', value: true });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearEntireArchiveDatabase(): Promise<void> {
  const db = await openArchiveDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(
      [STORE_GROUPS, STORE_FOLDERS, STORE_PHOTOS, STORE_META],
      'readwrite'
    );
    tx.objectStore(STORE_GROUPS).clear();
    tx.objectStore(STORE_FOLDERS).clear();
    tx.objectStore(STORE_PHOTOS).clear();
    const mStore = tx.objectStore(STORE_META);
    mStore.put({ key: 'initialized', value: true });
    mStore.put({ key: 'groups_seeded_v2', value: true });
    mStore.put({ key: 'sample_seed_purged_v3', value: true });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getStoredPhotoBlobById(photoId: string): Promise<Blob | null> {
  try {
    const db = await openArchiveDb();
    const record = await new Promise<StoredPhotoRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, 'readonly');
      const req = tx.objectStore(STORE_PHOTOS).get(photoId);
      req.onsuccess = () => resolve(req.result as StoredPhotoRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record?.blob instanceof Blob ? record.blob : null;
  } catch {
    return null;
  }
}


