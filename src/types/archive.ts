export type SortMode = 'date_desc' | 'name_asc';
export type Language = 'my' | 'en';

export interface GroupFolder {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookFolder {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Optional parent GroupFolder ID when grouped inside a parent folder (ဖိုဒါလ်) */
  groupId?: string | null;
}

export interface PhotoItem {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  createdAt: number;
  /**
   * Byte size recorded for photos added post-update.
   * Undefined for legacy pre-update entries so file size only displays for post-update photos.
   */
  size?: number;
  /** Binary blob persisted in IndexedDB for user-captured or uploaded photos */
  blob?: Blob;
  /** Resolved URL (either static seed asset path or runtime ObjectURL) */
  previewUrl?: string;
}

export interface FolderSummary {
  folder: BookFolder;
  photoCount: number;
  /** Sum of photo sizes in bytes if at least one photo in the folder has post-update size metadata; null otherwise */
  knownTotalSize: number | null;
  coverPhoto: PhotoItem | null;
}

export interface GroupSummary {
  group: GroupFolder;
  binderCount: number;
  photoCount: number;
  knownTotalSize: number | null;
}
