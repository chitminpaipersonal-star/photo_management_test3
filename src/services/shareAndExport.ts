import { Share } from '@capacitor/share';
import type { BookFolder, PhotoItem } from '../types/archive';
import { sanitizeExportFilename } from '../utils/archiveLogic';
import {
  createBrowserBlobSink,
  writeStreamingZip,
  type StreamingZipSourceEntry,
} from '../utils/streamingZip';
import {
  createNativeTempShareZip,
  isNativeMobileRuntime,
  openSaveLocationSink,
  saveBlobWithLocationPicker,
  shareFilesNatively,
  type SaveFileOutcome,
} from './nativeBridge';

function extensionFromMimeOrName(photo: PhotoItem): string {
  const match = photo.name.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match) return match[1].toLowerCase();
  if (photo.mimeType.includes('png')) return 'png';
  if (photo.mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

function mimeFromExtension(ext: string, fallbackMime?: string): string {
  if (fallbackMime && fallbackMime.includes('/')) return fallbackMime;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export async function resolvePhotoBlob(photo: PhotoItem): Promise<Blob> {
  if (photo.blob instanceof Blob) {
    try {
      // Verify the Blob handle is still readable (Android WebView can invalidate stale handles after sleep)
      await photo.blob.slice(0, 1).arrayBuffer();
      return photo.blob;
    } catch {
      if (typeof indexedDB !== 'undefined') {
        const { getStoredPhotoBlobById } = await import('./storage');
        const freshBlob = await getStoredPhotoBlobById(photo.id);
        if (freshBlob) {
          return freshBlob;
        }
      }
    }
  }

  if (typeof indexedDB !== 'undefined') {
    const { getStoredPhotoBlobById } = await import('./storage');
    const storedBlob = await getStoredPhotoBlobById(photo.id);
    if (storedBlob) {
      return storedBlob;
    }
  }

  if (photo.previewUrl) {
    const res = await fetch(photo.previewUrl);
    if (!res.ok) {
      throw new Error('ပုံဖိုင်ကို ရယူ၍မရပါ။');
    }
    return await res.blob();
  }
  throw new Error('ပုံဖိုင် မတွေ့ရှိပါ။');
}

export async function triggerBlobDownload(
  blob: Blob,
  filename: string,
  mimeType = 'application/octet-stream'
): Promise<SaveFileOutcome> {
  return saveBlobWithLocationPicker(blob, filename, mimeType);
}

/**
 * Downloads a single photo directly to a user-selected folder in local storage
 * without opening the Share sheet.
 */
export async function downloadSinglePhoto(
  photo: PhotoItem,
  folderName: string,
  pageNumber: number
): Promise<SaveFileOutcome> {
  const ext = extensionFromMimeOrName(photo);
  const mimeType = mimeFromExtension(ext, photo.mimeType);
  const safeFolder = sanitizeExportFilename(folderName, 'book');
  const paddedPage = String(pageNumber).padStart(2, '0');
  const filename = `${safeFolder}-page-${paddedPage}.${ext}`;

  return saveBlobWithLocationPicker(() => resolvePhotoBlob(photo), filename, mimeType);
}

export type ShareOutcome =
  | 'shared_native'
  | 'shared_zip_fallback'
  | 'downloaded_fallback'
  | 'cancelled';

/**
 * Shares a single photo using native Android Share Sheet (in APK) or Web Share API (in Browser),
 * falling back to direct storage save only if Share is unavailable on the device.
 */
export async function shareSinglePhoto(
  photo: PhotoItem,
  folderName: string,
  pageNumber: number
): Promise<ShareOutcome> {
  const blob = await resolvePhotoBlob(photo);
  const ext = extensionFromMimeOrName(photo);
  const mimeType = mimeFromExtension(ext, blob.type || photo.mimeType);
  const safeFolder = sanitizeExportFilename(folderName, 'book');
  const paddedPage = String(pageNumber).padStart(2, '0');
  const filename = `${safeFolder}-page-${paddedPage}.${ext}`;

  if (isNativeMobileRuntime()) {
    const nativeRes = await shareFilesNatively([{ blob, filename }], folderName);
    if (nativeRes === 'shared') return 'shared_native';
    if (nativeRes === 'cancelled') return 'cancelled';
    const saved = await saveBlobWithLocationPicker(blob, filename, mimeType);
    return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
  }

  const file = new File([blob], filename, { type: mimeType });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const canShareFile =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
      if (canShareFile) {
        await navigator.share({
          title: folderName,
          files: [file],
        });
        return 'shared_native';
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  const saved = await saveBlobWithLocationPicker(blob, filename, mimeType);
  return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
}

function buildFolderZipEntries(
  safeFolder: string,
  photos: PhotoItem[]
): StreamingZipSourceEntry[] {
  const sorted = [...photos].sort((a, b) => a.createdAt - b.createdAt);
  return sorted.map((item, i) => {
    const ext = extensionFromMimeOrName(item);
    const paddedIndex = String(i + 1).padStart(2, '0');
    const baseName = sanitizeExportFilename(item.name.replace(/\.[^.]+$/, ''), 'page');
    return {
      path: `${safeFolder}/${paddedIndex}-${baseName}.${ext}`,
      modifiedAt: item.createdAt,
      getData: () => resolvePhotoBlob(item),
    };
  });
}

/**
 * Packs all photos inside a binder into a single streaming ZIP archive Blob without compression overhead.
 */
export async function createFolderZipBlob(
  folder: BookFolder,
  photos: PhotoItem[]
): Promise<{ zipBlob: Blob; zipFilename: string }> {
  const safeFolder = sanitizeExportFilename(folder.name, 'data-management-folder');
  const entries = buildFolderZipEntries(safeFolder, photos);
  const sink = createBrowserBlobSink();
  await writeStreamingZip(entries, sink);

  return {
    zipBlob: sink.toBlob(),
    zipFilename: `${safeFolder}.zip`,
  };
}

/**
 * Saves an entire book binder as a single .zip file to a user-selected folder in phone storage.
 */
export async function downloadFolderAsZip(
  folder: BookFolder,
  photos: PhotoItem[]
): Promise<SaveFileOutcome> {
  const safeFolder = sanitizeExportFilename(folder.name, 'data-management-folder');
  const zipFilename = `${safeFolder}.zip`;

  const session = await openSaveLocationSink(zipFilename, 'application/zip');
  if (session.status === 'cancelled') {
    return { status: 'cancelled' };
  }

  try {
    const entries = buildFolderZipEntries(safeFolder, photos);
    await writeStreamingZip(entries, session.sink);
    await session.finalize();
    return {
      status: 'saved',
      filename: session.filename,
      displayPath: session.displayPath,
    };
  } catch (err) {
    await session.abort();
    throw err;
  }
}

/**
 * Shares all photos in a binder via the native share sheet at once when user taps Share (မျှဝေရန်).
 * For large binders (>20 photos or >25MB), streams directly into a single .zip in Cache
 * to prevent Android Binder TransactionTooLargeException or OutOfMemory crashes.
 */
export async function shareEntireFolder(
  folder: BookFolder,
  photos: PhotoItem[]
): Promise<ShareOutcome> {
  const sorted = [...photos].sort((a, b) => a.createdAt - b.createdAt);
  const safeFolder = sanitizeExportFilename(folder.name, 'book');
  const estimatedBytes = sorted.reduce((acc, p) => acc + (p.size ?? 0), 0);
  const isLargeBatch = sorted.length > 20 || estimatedBytes > 25 * 1024 * 1024;

  if (isNativeMobileRuntime()) {
    if (!isLargeBatch) {
      const nativeItems: { blob: Blob; filename: string }[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const photo = sorted[i];
        const blob = await resolvePhotoBlob(photo);
        const ext = extensionFromMimeOrName(photo);
        const padded = String(i + 1).padStart(2, '0');
        nativeItems.push({ blob, filename: `${safeFolder}-${padded}.${ext}` });
      }

      const multiShare = await shareFilesNatively(nativeItems, folder.name);
      if (multiShare === 'shared') return 'shared_native';
      if (multiShare === 'cancelled') return 'cancelled';
    }

    const zipFilename = `${safeFolder}.zip`;
    const entries = buildFolderZipEntries(safeFolder, sorted);
    try {
      const { sink, finalize } = await createNativeTempShareZip(zipFilename);
      await writeStreamingZip(entries, sink);
      const { uri } = await finalize();
      await Share.share({
        title: folder.name,
        files: [uri],
        dialogTitle: folder.name,
      });
      return 'shared_zip_fallback';
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (msg.includes('cancel') || msg.includes('abort') || msg.includes('dismiss')) {
        return 'cancelled';
      }
      const saved = await downloadFolderAsZip(folder, sorted);
      return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    if (!isLargeBatch) {
      try {
        const files: File[] = [];
        for (let i = 0; i < sorted.length; i++) {
          const photo = sorted[i];
          const blob = await resolvePhotoBlob(photo);
          const ext = extensionFromMimeOrName(photo);
          const padded = String(i + 1).padStart(2, '0');
          files.push(
            new File([blob], `${safeFolder}-${padded}.${ext}`, {
              type: blob.type || photo.mimeType || 'image/jpeg',
            })
          );
        }

        const canShareAllRaw =
          typeof navigator.canShare === 'function' ? navigator.canShare({ files }) : false;

        if (canShareAllRaw && files.length > 0) {
          await navigator.share({
            title: folder.name,
            files,
          });
          return 'shared_native';
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }

    const { zipBlob, zipFilename } = await createFolderZipBlob(folder, sorted);
    const zipFile = new File([zipBlob], zipFilename, { type: 'application/zip' });

    try {
      const canShareZip =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [zipFile] }) : false;
      if (canShareZip) {
        await navigator.share({
          title: folder.name,
          files: [zipFile],
        });
        return 'shared_zip_fallback';
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }

    const saved = await saveBlobWithLocationPicker(zipBlob, zipFilename, 'application/zip');
    return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
  }

  const saved = await downloadFolderAsZip(folder, sorted);
  return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
}

function buildSelectedPhotoZipEntries(
  safeFolder: string,
  selectedPhotos: PhotoItem[],
  pageIndexMap: ReadonlyMap<string, number>
): StreamingZipSourceEntry[] {
  const sorted = [...selectedPhotos].sort((a, b) => a.createdAt - b.createdAt);
  return sorted.map((item, idx) => {
    const ext = extensionFromMimeOrName(item);
    const pageNum = pageIndexMap.get(item.id) ?? idx + 1;
    const paddedPage = String(pageNum).padStart(2, '0');
    const baseName = sanitizeExportFilename(item.name.replace(/\.[^.]+$/, ''), 'page');
    return {
      path: `${safeFolder}/${paddedPage}-${baseName}.${ext}`,
      modifiedAt: item.createdAt,
      getData: () => resolvePhotoBlob(item),
    };
  });
}

/**
 * Downloads user-selected photos from a binder:
 * - 1 selected photo: saves the single image file directly via phone storage picker
 * - 2+ selected photos: streams selected images into a single .zip in the chosen phone storage folder
 */
export async function downloadSelectedPhotos(
  folder: BookFolder,
  selectedPhotos: PhotoItem[],
  allFolderPhotos: PhotoItem[]
): Promise<SaveFileOutcome> {
  const orderedFolderPhotos = [...allFolderPhotos].sort((a, b) => a.createdAt - b.createdAt);
  const pageIndexMap = new Map<string, number>();
  orderedFolderPhotos.forEach((p, idx) => pageIndexMap.set(p.id, idx + 1));

  if (selectedPhotos.length === 1) {
    const single = selectedPhotos[0];
    const pageNum = pageIndexMap.get(single.id) ?? 1;
    return downloadSinglePhoto(single, folder.name, pageNum);
  }

  const safeFolder = sanitizeExportFilename(folder.name, 'data-management-folder');
  const zipFilename = `${safeFolder}-selected-${selectedPhotos.length}.zip`;

  const session = await openSaveLocationSink(zipFilename, 'application/zip');
  if (session.status === 'cancelled') {
    return { status: 'cancelled' };
  }

  try {
    const entries = buildSelectedPhotoZipEntries(safeFolder, selectedPhotos, pageIndexMap);
    await writeStreamingZip(entries, session.sink);
    await session.finalize();
    return {
      status: 'saved',
      filename: session.filename,
      displayPath: session.displayPath,
    };
  } catch (err) {
    await session.abort();
    throw err;
  }
}

/**
 * Shares user-selected photos via native Share Sheet (or Web Share API),
 * falling back to streaming ZIP share / local storage save when needed.
 */
export async function shareSelectedPhotos(
  folder: BookFolder,
  selectedPhotos: PhotoItem[],
  allFolderPhotos: PhotoItem[]
): Promise<ShareOutcome> {
  const orderedFolderPhotos = [...allFolderPhotos].sort((a, b) => a.createdAt - b.createdAt);
  const pageIndexMap = new Map<string, number>();
  orderedFolderPhotos.forEach((p, idx) => pageIndexMap.set(p.id, idx + 1));

  if (selectedPhotos.length === 1) {
    const single = selectedPhotos[0];
    const pageNum = pageIndexMap.get(single.id) ?? 1;
    return shareSinglePhoto(single, folder.name, pageNum);
  }

  const sorted = [...selectedPhotos].sort((a, b) => a.createdAt - b.createdAt);
  const safeFolder = sanitizeExportFilename(folder.name, 'book');
  const estimatedBytes = sorted.reduce((acc, p) => acc + (p.size ?? 0), 0);
  const isLargeBatch = sorted.length > 20 || estimatedBytes > 25 * 1024 * 1024;

  if (isNativeMobileRuntime()) {
    if (!isLargeBatch) {
      const nativeItems: { blob: Blob; filename: string }[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const photo = sorted[i];
        const blob = await resolvePhotoBlob(photo);
        const ext = extensionFromMimeOrName(photo);
        const pageNum = pageIndexMap.get(photo.id) ?? i + 1;
        const padded = String(pageNum).padStart(2, '0');
        nativeItems.push({ blob, filename: `${safeFolder}-page-${padded}.${ext}` });
      }

      const multiShare = await shareFilesNatively(nativeItems, folder.name);
      if (multiShare === 'shared') return 'shared_native';
      if (multiShare === 'cancelled') return 'cancelled';
    }

    const zipFilename = `${safeFolder}-selected-${sorted.length}.zip`;
    const entries = buildSelectedPhotoZipEntries(safeFolder, sorted, pageIndexMap);
    try {
      const { sink, finalize } = await createNativeTempShareZip(zipFilename);
      await writeStreamingZip(entries, sink);
      const { uri } = await finalize();
      await Share.share({
        title: folder.name,
        files: [uri],
        dialogTitle: folder.name,
      });
      return 'shared_zip_fallback';
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (msg.includes('cancel') || msg.includes('abort') || msg.includes('dismiss')) {
        return 'cancelled';
      }
      const saved = await downloadSelectedPhotos(folder, sorted, allFolderPhotos);
      return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    if (!isLargeBatch) {
      try {
        const files: File[] = [];
        for (let i = 0; i < sorted.length; i++) {
          const photo = sorted[i];
          const blob = await resolvePhotoBlob(photo);
          const ext = extensionFromMimeOrName(photo);
          const pageNum = pageIndexMap.get(photo.id) ?? i + 1;
          const padded = String(pageNum).padStart(2, '0');
          files.push(
            new File([blob], `${safeFolder}-page-${padded}.${ext}`, {
              type: blob.type || photo.mimeType || 'image/jpeg',
            })
          );
        }

        const canShareAllRaw =
          typeof navigator.canShare === 'function' ? navigator.canShare({ files }) : false;

        if (canShareAllRaw && files.length > 0) {
          await navigator.share({
            title: folder.name,
            files,
          });
          return 'shared_native';
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }

    const zipFilename = `${safeFolder}-selected-${sorted.length}.zip`;
    const entries = buildSelectedPhotoZipEntries(safeFolder, sorted, pageIndexMap);
    const sink = createBrowserBlobSink();
    await writeStreamingZip(entries, sink);
    const zipBlob = sink.toBlob();
    const zipFile = new File([zipBlob], zipFilename, { type: 'application/zip' });

    try {
      const canShareZip =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [zipFile] }) : false;
      if (canShareZip) {
        await navigator.share({
          title: folder.name,
          files: [zipFile],
        });
        return 'shared_zip_fallback';
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }

    const saved = await saveBlobWithLocationPicker(zipBlob, zipFilename, 'application/zip');
    return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
  }

  const saved = await downloadSelectedPhotos(folder, sorted, allFolderPhotos);
  return saved.status === 'cancelled' ? 'cancelled' : 'downloaded_fallback';
}

