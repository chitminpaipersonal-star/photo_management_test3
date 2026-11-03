import JSZip from 'jszip';
import type { BookFolder, GroupFolder, PhotoItem } from '../types/archive';
import { sanitizeExportFilename } from '../utils/archiveLogic';
import {
  buildBackupDateStamp,
  validateAndNormalizeBackupManifest,
  type ArchiveBackupManifest,
  type ArchiveSnapshot,
  type BackupPhotoEntry,
} from '../utils/backupLogic';
import {
  createBrowserBlobSink,
  writeStreamingZip,
  type StreamingZipSourceEntry,
  type ZipWriteSink,
} from '../utils/streamingZip';
import { openSaveLocationSink, type SaveFileOutcome } from './nativeBridge';
import { resolvePhotoBlob } from './shareAndExport';

function inferExtension(photo: PhotoItem): string {
  const match = photo.name.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match) return match[1].toLowerCase();
  if (photo.mimeType.includes('png')) return 'png';
  if (photo.mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

/**
 * Streams the entire Data Management archive (photos + manifest.json) sequentially into a ZipWriteSink.
 * Only one photo's 512KB–768KB slice resides in RAM at any moment, preventing Android OOM crashes.
 */
async function streamArchiveBackupToSink(
  snapshot: ArchiveSnapshot,
  sink: ZipWriteSink,
  exportedAt = Date.now(),
  onProgress?: (percent: number) => void
): Promise<void> {
  const photoEntries: BackupPhotoEntry[] = [];
  const entries: StreamingZipSourceEntry[] = [];

  for (let i = 0; i < snapshot.photos.length; i++) {
    const photo = snapshot.photos[i];
    const ext = inferExtension(photo);
    const safeId = sanitizeExportFilename(photo.id, `photo-${i + 1}`);
    const assetPath = `photos/${safeId}.${ext}`;

    const entryRecord: BackupPhotoEntry = {
      id: photo.id,
      folderId: photo.folderId,
      name: photo.name,
      mimeType: photo.mimeType || 'image/jpeg',
      createdAt: photo.createdAt,
      ...(typeof photo.size === 'number' ? { size: photo.size } : {}),
      assetPath,
    };
    photoEntries.push(entryRecord);

    entries.push({
      path: assetPath,
      modifiedAt: photo.createdAt,
      getData: async () => {
        const blob = await resolvePhotoBlob(photo);
        // Backfill exact byte size & MIME type into manifest entry before manifest.json is serialized last
        entryRecord.size = blob.size;
        if (blob.type) {
          entryRecord.mimeType = blob.type;
        }
        return blob;
      },
    });
  }

  // Push manifest.json as the final entry so backfilled photo sizes/types are captured accurately
  const encoder = new TextEncoder();
  entries.push({
    path: 'manifest.json',
    modifiedAt: exportedAt,
    getData: () => {
      const manifest: ArchiveBackupManifest = {
        format: 'data-management-backup',
        version: 1,
        exportedAt,
        groups: snapshot.groups,
        folders: snapshot.folders,
        photos: photoEntries,
      };
      return encoder.encode(JSON.stringify(manifest, null, 2));
    },
  });

  await writeStreamingZip(entries, sink, onProgress);
}

/**
 * Packages the entire Data Management archive into a portable .zip Blob using zero-copy Blob parts.
 */
export async function createArchiveBackupZipBlob(
  snapshot: ArchiveSnapshot,
  exportedAt = Date.now(),
  onProgress?: (percent: number) => void
): Promise<{ zipBlob: Blob; filename: string }> {
  const sink = createBrowserBlobSink();
  await streamArchiveBackupToSink(snapshot, sink, exportedAt, onProgress);
  const filename = `data-management-backup-${buildBackupDateStamp(exportedAt)}.zip`;

  return {
    zipBlob: sink.toBlob(),
    filename,
  };
}

/**
 * Exports a complete .zip backup file to a user-selected folder in the phone's local storage.
 * Opens the storage location chooser first (ACTION_CREATE_DOCUMENT on Android / Save Picker on Web),
 * then streams chunks directly into the chosen file without ever invoking the Share sheet.
 */
export async function exportFullArchiveZip(
  snapshot: ArchiveSnapshot,
  onProgress?: (percent: number) => void
): Promise<SaveFileOutcome> {
  const exportedAt = Date.now();
  const suggestedFilename = `data-management-backup-${buildBackupDateStamp(exportedAt)}.zip`;

  const session = await openSaveLocationSink(suggestedFilename, 'application/zip');
  if (session.status === 'cancelled') {
    return { status: 'cancelled' };
  }

  try {
    await streamArchiveBackupToSink(snapshot, session.sink, exportedAt, onProgress);
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
 * Parses and validates an uploaded .zip backup file, reconstructing all groups, folders,
 * and binary PhotoItems while yielding periodically to keep mobile UI responsive.
 */
export async function parseArchiveBackupZip(
  input: Blob | ArrayBuffer | Uint8Array
): Promise<{ valid: true; snapshot: ArchiveSnapshot; exportedAt: number } | { valid: false }> {
  try {
    const zipData = input instanceof Blob ? await input.arrayBuffer() : input;
    const zip = await JSZip.loadAsync(zipData);

    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      return { valid: false };
    }

    const rawText = await manifestFile.async('string');
    const parsedJson: unknown = JSON.parse(rawText);
    const validation = validateAndNormalizeBackupManifest(parsedJson);
    if (!validation.valid) {
      return { valid: false };
    }

    const { manifest } = validation;
    const restoredPhotos: PhotoItem[] = [];

    for (let i = 0; i < manifest.photos.length; i++) {
      const entry = manifest.photos[i];
      const zipAsset = zip.file(entry.assetPath);
      if (!zipAsset) {
        return { valid: false };
      }
      const rawBuffer = await zipAsset.async('arraybuffer');
      const typedBlob = new Blob([rawBuffer], { type: entry.mimeType || 'image/jpeg' });
      const previewUrl =
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(typedBlob)
          : undefined;

      restoredPhotos.push({
        id: entry.id,
        folderId: entry.folderId,
        name: entry.name,
        mimeType: entry.mimeType,
        createdAt: entry.createdAt,
        size: typeof entry.size === 'number' ? entry.size : typedBlob.size,
        blob: typedBlob,
        previewUrl,
      });

      if (i % 8 === 7) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const snapshot: ArchiveSnapshot = {
      groups: manifest.groups as GroupFolder[],
      folders: manifest.folders as BookFolder[],
      photos: restoredPhotos,
    };

    return {
      valid: true,
      snapshot,
      exportedAt: manifest.exportedAt,
    };
  } catch {
    return { valid: false };
  }
}
