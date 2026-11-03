import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { createBrowserBlobSink, type ZipWriteSink } from '../utils/streamingZip';

export interface OpenExportStreamResult {
  status: 'opened' | 'cancelled';
  streamId?: string;
  filename?: string;
  uri?: string;
}

export interface StorageExportBridge {
  openExportStream(options: {
    filename: string;
    mimeType: string;
  }): Promise<OpenExportStreamResult>;
  writeExportChunk(options: {
    streamId: string;
    data: string;
  }): Promise<{ written: number }>;
  closeExportStream(options: {
    streamId: string;
  }): Promise<{ status: string; filename?: string }>;
  abortExportStream(options: {
    streamId: string;
  }): Promise<{ status: string }>;
}

const StorageExport = registerPlugin<StorageExportBridge>('StorageExport');

interface WebFileSystemWritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

interface WebFileSystemFileHandle {
  readonly name: string;
  createWritable(): Promise<WebFileSystemWritableStream>;
}

interface SaveFilePickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WebFileSystemFileHandle>;
}

export type SaveLocationSession =
  | { status: 'cancelled' }
  | {
      status: 'opened';
      filename: string;
      displayPath: string;
      sink: ZipWriteSink;
      finalize: () => Promise<void>;
      abort: () => Promise<void>;
    };

export type SaveFileOutcome =
  | { status: 'saved'; filename: string; displayPath: string }
  | { status: 'cancelled' };

export function isNativeMobileRuntime(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

// 768 KB binary slice (divisible by 3; ~1 MB Base64 string per Capacitor IPC message)
const NATIVE_IO_SLICE_BYTES = 768 * 1024;

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const step = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += step) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + step)));
  }
  return btoa(parts.join(''));
}

/**
 * Converts a small Blob into Base64 in safe 32KB String.fromCharCode steps.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

/**
 * Formats an Android SAF content:// URI or storage path into a clean, human-readable
 * phone storage path (e.g. "Internal Storage/Download/Backup.zip").
 */
export function formatAndroidPickedLocation(
  uriString: string | undefined,
  fallbackFilename: string
): string {
  if (!uriString || !uriString.trim()) {
    return fallbackFilename;
  }

  const raw = uriString.trim();

  if (raw.startsWith('/storage/emulated/0/')) {
    return `Internal Storage/${raw.slice('/storage/emulated/0/'.length)}`;
  }

  if (raw.startsWith('Downloads/')) {
    return raw;
  }

  try {
    const docMarker = '/document/';
    const markerIdx = raw.indexOf(docMarker);
    if (markerIdx !== -1) {
      const encodedDocId = raw.slice(markerIdx + docMarker.length).split('?')[0];
      const decodedDocId = decodeURIComponent(encodedDocId);

      if (decodedDocId.startsWith('primary:')) {
        const rel = decodedDocId.slice('primary:'.length).replace(/^\/+/, '');
        return rel ? `Internal Storage/${rel}` : `Internal Storage/${fallbackFilename}`;
      }

      if (decodedDocId.startsWith('home:')) {
        const rel = decodedDocId.slice('home:'.length).replace(/^\/+/, '');
        return rel ? `Documents/${rel}` : `Documents/${fallbackFilename}`;
      }

      const colonIdx = decodedDocId.indexOf(':');
      if (colonIdx > 0 && !decodedDocId.startsWith('raw:') && !decodedDocId.startsWith('msf:')) {
        const volume = decodedDocId.slice(0, colonIdx);
        const rel = decodedDocId.slice(colonIdx + 1).replace(/^\/+/, '');
        if (/^[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}$/.test(volume)) {
          return rel ? `SD Card (${volume})/${rel}` : `SD Card (${volume})/${fallbackFilename}`;
        }
      }

      if (decodedDocId.startsWith('raw:/storage/emulated/0/')) {
        return `Internal Storage/${decodedDocId.slice('raw:/storage/emulated/0/'.length)}`;
      }
    }

    if (raw.includes('com.android.providers.downloads.documents')) {
      return `Downloads/${fallbackFilename}`;
    }
  } catch {
    // Ignore malformed URI percent-encoding and return fallback filename
  }

  return fallbackFilename;
}

/**
 * Opens a streaming save session against an Android StorageExportBridge (SAF ACTION_CREATE_DOCUMENT).
 * Coalesces small header writes into 192 KB buffers and streams photo Blobs in 768 KB slices.
 * Never invokes Share.share.
 */
export async function openNativeExportSinkWithBridge(
  bridge: StorageExportBridge,
  filename: string,
  mimeType: string
): Promise<SaveLocationSession> {
  const openRes = await bridge.openExportStream({ filename, mimeType });
  if (openRes.status === 'cancelled' || !openRes.streamId) {
    return { status: 'cancelled' };
  }

  const streamId = openRes.streamId;
  const savedFilename = openRes.filename?.trim() || filename;
  const displayPath = formatAndroidPickedLocation(openRes.uri, savedFilename);

  const BUFFER_THRESHOLD = 192 * 1024;
  let pendingChunks: Uint8Array[] = [];
  let pendingLength = 0;
  let closedOrAborted = false;

  const flushPendingBytes = async () => {
    if (pendingLength === 0) return;
    const merged = new Uint8Array(pendingLength);
    let pos = 0;
    for (const arr of pendingChunks) {
      merged.set(arr, pos);
      pos += arr.byteLength;
    }
    pendingChunks = [];
    pendingLength = 0;

    let offset = 0;
    while (offset < merged.byteLength) {
      const end = Math.min(offset + NATIVE_IO_SLICE_BYTES, merged.byteLength);
      const base64Chunk = uint8ArrayToBase64(merged.subarray(offset, end));
      await bridge.writeExportChunk({ streamId, data: base64Chunk });
      offset = end;
    }
  };

  const sink: ZipWriteSink = {
    async writeBytes(bytes: Uint8Array) {
      if (bytes.byteLength === 0) return;
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      pendingChunks.push(copy);
      pendingLength += copy.byteLength;
      if (pendingLength >= BUFFER_THRESHOLD) {
        await flushPendingBytes();
      }
    },
    async writeBlob(blob: Blob, onChunkProgress?: (writtenBytes: number) => void) {
      await flushPendingBytes();
      let offset = 0;
      let stepCount = 0;
      while (offset < blob.size) {
        const end = Math.min(offset + NATIVE_IO_SLICE_BYTES, blob.size);
        const buf = await blob.slice(offset, end).arrayBuffer();
        const base64Chunk = uint8ArrayToBase64(new Uint8Array(buf));
        await bridge.writeExportChunk({ streamId, data: base64Chunk });
        offset = end;
        onChunkProgress?.(offset);
        stepCount++;
        if (stepCount % 3 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    },
  };

  return {
    status: 'opened',
    filename: savedFilename,
    displayPath,
    sink,
    async finalize() {
      if (closedOrAborted) return;
      await flushPendingBytes();
      closedOrAborted = true;
      await bridge.closeExportStream({ streamId });
    },
    async abort() {
      if (closedOrAborted) return;
      closedOrAborted = true;
      pendingChunks = [];
      pendingLength = 0;
      await bridge.abortExportStream({ streamId }).catch(() => {});
    },
  };
}

function triggerBrowserAnchorDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function buildPickerAcceptMap(filename: string, mimeType: string): Record<string, string[]> {
  const extMatch = filename.match(/(\.[a-zA-Z0-9]{2,5})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.zip';
  const safeMime = mimeType.includes('/') ? mimeType : 'application/octet-stream';
  return { [safeMime]: [ext] };
}

/**
 * Opens a location-selectable save stream on Android (via Storage Access Framework ACTION_CREATE_DOCUMENT)
 * or top-level modern Web browsers (via showSaveFilePicker), falling back to standard browser download
 * inside cross-origin iframes or browsers without File System Access API.
 */
export async function openSaveLocationSink(
  filename: string,
  mimeType = 'application/zip'
): Promise<SaveLocationSession> {
  if (isNativeMobileRuntime()) {
    return openNativeExportSinkWithBridge(StorageExport, filename, mimeType);
  }

  if (typeof window !== 'undefined' && window.self === window.top) {
    const pickerWin = window as SaveFilePickerWindow;
    if (typeof pickerWin.showSaveFilePicker === 'function') {
      try {
        const handle = await pickerWin.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: filename,
              accept: buildPickerAcceptMap(filename, mimeType),
            },
          ],
        });

        const writable = await handle.createWritable();
        const savedName = handle.name || filename;
        let closed = false;

        const sink: ZipWriteSink = {
          async writeBytes(bytes: Uint8Array) {
            if (bytes.byteLength === 0) return;
            const copy = new Uint8Array(bytes.byteLength);
            copy.set(bytes);
            await writable.write(copy);
          },
          async writeBlob(blob: Blob, onChunkProgress?: (writtenBytes: number) => void) {
            let offset = 0;
            while (offset < blob.size) {
              const end = Math.min(offset + NATIVE_IO_SLICE_BYTES, blob.size);
              await writable.write(blob.slice(offset, end));
              offset = end;
              onChunkProgress?.(offset);
            }
          },
        };

        return {
          status: 'opened',
          filename: savedName,
          displayPath: savedName,
          sink,
          async finalize() {
            if (closed) return;
            closed = true;
            await writable.close();
          },
          async abort() {
            if (closed) return;
            closed = true;
            await writable.abort().catch(() => {});
          },
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { status: 'cancelled' };
        }
        // Fall through to standard browser download if showSaveFilePicker is restricted
      }
    }
  }

  const blobSink = createBrowserBlobSink();
  return {
    status: 'opened',
    filename,
    displayPath: filename,
    sink: blobSink,
    async finalize() {
      const rawZipOrFile = blobSink.toBlob();
      const typedBlob =
        rawZipOrFile.type === mimeType
          ? rawZipOrFile
          : new Blob([rawZipOrFile], { type: mimeType });
      triggerBrowserAnchorDownload(typedBlob, filename);
    },
    async abort() {
      // Nothing to clean up for in-memory BlobParts array
    },
  };
}

/**
 * Saves a single Blob (or lazy Blob provider) to a user-selected storage location
 * without ever opening the Share sheet.
 */
export async function saveBlobWithLocationPicker(
  blobOrProvider: Blob | (() => Promise<Blob>),
  filename: string,
  mimeType = 'application/octet-stream'
): Promise<SaveFileOutcome> {
  const session = await openSaveLocationSink(filename, mimeType);
  if (session.status === 'cancelled') {
    return { status: 'cancelled' };
  }

  try {
    const blob = typeof blobOrProvider === 'function' ? await blobOrProvider() : blobOrProvider;
    await session.sink.writeBlob(blob);
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
 * Writes a Blob into Capacitor's temporary Cache directory in 768 KB slices.
 * Used strictly when the user explicitly clicks a "Share" (မျှဝေရန်) action.
 */
export async function writeBlobToNativeFile(
  blob: Blob,
  directory: Directory,
  path: string
): Promise<string> {
  if (blob.size === 0) {
    const emptyRes = await Filesystem.writeFile({
      path,
      data: '',
      directory,
      recursive: true,
    });
    return emptyRes.uri;
  }

  let offset = 0;
  let fileUri = '';
  let chunkIndex = 0;

  while (offset < blob.size) {
    const end = Math.min(offset + NATIVE_IO_SLICE_BYTES, blob.size);
    const sliceBuffer = await blob.slice(offset, end).arrayBuffer();
    const base64Chunk = uint8ArrayToBase64(new Uint8Array(sliceBuffer));

    if (offset === 0) {
      const written = await Filesystem.writeFile({
        path,
        data: base64Chunk,
        directory,
        recursive: true,
      });
      fileUri = written.uri;
    } else {
      await Filesystem.appendFile({
        path,
        data: base64Chunk,
        directory,
      });
    }

    offset = end;
    chunkIndex++;
    if (chunkIndex % 4 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return fileUri;
}

export type NativeShareResult = 'shared' | 'cancelled' | 'unsupported';

/**
 * Shares one or more binary files natively via Android's Share Sheet (@capacitor/share)
 * strictly when the user taps Share (မျှဝေရန်).
 */
export async function shareFilesNatively(
  items: { blob: Blob; filename: string }[],
  title: string
): Promise<NativeShareResult> {
  if (!isNativeMobileRuntime() || items.length === 0) {
    return 'unsupported';
  }

  try {
    const canShare = await Share.canShare();
    if (!canShare.value) {
      return 'unsupported';
    }

    const batchStamp = Date.now();
    const fileUris: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const { blob, filename } = items[i];
      const cachePath = `share-temp/${batchStamp}-${i}-${filename}`;
      const uri = await writeBlobToNativeFile(blob, Directory.Cache, cachePath);
      fileUris.push(uri);
    }

    await Share.share({
      title,
      files: fileUris,
      dialogTitle: title,
    });

    return 'shared';
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (msg.includes('cancel') || msg.includes('abort') || msg.includes('dismiss')) {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

/**
 * Creates a temporary streaming ZIP file inside Directory.Cache strictly for sharing large binders
 * via the Share (မျှဝေရန်) button.
 */
export async function createNativeTempShareZip(filename: string): Promise<{
  sink: ZipWriteSink;
  finalize: () => Promise<{ uri: string }>;
}> {
  const targetPath = `share-temp/${Date.now()}-${filename}`;
  const res = await Filesystem.writeFile({
    path: targetPath,
    data: '',
    directory: Directory.Cache,
    recursive: true,
  });
  const fileUri = res.uri;

  const BUFFER_THRESHOLD = 192 * 1024;
  let pendingChunks: Uint8Array[] = [];
  let pendingLength = 0;

  const flushPendingBytes = async () => {
    if (pendingLength === 0) return;
    const merged = new Uint8Array(pendingLength);
    let pos = 0;
    for (const arr of pendingChunks) {
      merged.set(arr, pos);
      pos += arr.byteLength;
    }
    pendingChunks = [];
    pendingLength = 0;

    let offset = 0;
    while (offset < merged.byteLength) {
      const end = Math.min(offset + NATIVE_IO_SLICE_BYTES, merged.byteLength);
      const base64Chunk = uint8ArrayToBase64(merged.subarray(offset, end));
      await Filesystem.appendFile({
        path: targetPath,
        data: base64Chunk,
        directory: Directory.Cache,
      });
      offset = end;
    }
  };

  const sink: ZipWriteSink = {
    async writeBytes(bytes: Uint8Array) {
      if (bytes.byteLength === 0) return;
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      pendingChunks.push(copy);
      pendingLength += copy.byteLength;
      if (pendingLength >= BUFFER_THRESHOLD) {
        await flushPendingBytes();
      }
    },
    async writeBlob(blob: Blob, onChunkProgress?: (writtenBytes: number) => void) {
      await flushPendingBytes();
      let offset = 0;
      let stepCount = 0;
      while (offset < blob.size) {
        const end = Math.min(offset + NATIVE_IO_SLICE_BYTES, blob.size);
        const buf = await blob.slice(offset, end).arrayBuffer();
        const base64Chunk = uint8ArrayToBase64(new Uint8Array(buf));
        await Filesystem.appendFile({
          path: targetPath,
          data: base64Chunk,
          directory: Directory.Cache,
        });
        offset = end;
        onChunkProgress?.(offset);
        stepCount++;
        if (stepCount % 3 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    },
  };

  return {
    sink,
    async finalize() {
      await flushPendingBytes();
      return { uri: fileUri };
    },
  };
}
