import { useEffect, useRef, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Download,
  FolderInput,
  Images,
  MoreHorizontal,
  Settings,
  Share2,
  Trash2,
} from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import type { FolderSummary, PhotoItem } from '../types/archive';
import { formatArchiveDate, formatFileSize } from '../utils/archiveLogic';
import { ResilientImage } from './ResilientImage';

interface FolderDetailViewProps {
  summary: FolderSummary;
  backDestinationLabel: string;
  groupSubtitleName: string | null;
  photos: PhotoItem[];
  isSelectionMode: boolean;
  selectedPhotoIds: ReadonlySet<string>;
  t: AppStrings;
  busyAction: string | null;
  onBack: () => void;
  onShareFolder: (summary: FolderSummary) => void;
  onOpenSettings: () => void;
  onOpenFolderMenu: (summary: FolderSummary) => void;
  onUploadFiles: (files: FileList) => void;
  onOpenPhotoAtIndex: (index: number) => void;
  onLongPressPhoto: (photoId: string) => void;
  onTogglePhotoSelect: (photoId: string) => void;
  onSelectAllOrClear: () => void;
  onExitSelectionMode: () => void;
  onShareSelected: () => void;
  onDownloadSelected: () => void;
  onRequestMoveSelected: () => void;
  onRequestDeleteSelected: () => void;
}

export function FolderDetailView({
  summary,
  backDestinationLabel,
  groupSubtitleName,
  photos,
  isSelectionMode,
  selectedPhotoIds,
  t,
  busyAction,
  onBack,
  onShareFolder,
  onOpenSettings,
  onOpenFolderMenu,
  onUploadFiles,
  onOpenPhotoAtIndex,
  onLongPressPhoto,
  onTogglePhotoSelect,
  onSelectAllOrClear,
  onExitSelectionMode,
  onShareSelected,
  onDownloadSelected,
  onRequestMoveSelected,
  onRequestDeleteSelected,
}: FolderDetailViewProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const releaseResetTimerRef = useRef<number | null>(null);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);

  const clearPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressStartPosRef.current = null;
  };

  const endPressGesture = () => {
    clearPressTimer();
    if (longPressTriggeredRef.current) {
      if (releaseResetTimerRef.current !== null) {
        window.clearTimeout(releaseResetTimerRef.current);
      }
      releaseResetTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = false;
        releaseResetTimerRef.current = null;
      }, 400);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
      if (releaseResetTimerRef.current !== null) {
        window.clearTimeout(releaseResetTimerRef.current);
      }
    };
  }, []);

  const triggerLongPress = (photoId: string) => {
    clearPressTimer();
    longPressTriggeredRef.current = true;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration errors on unsupported browsers
    }
    onLongPressPhoto(photoId);
  };

  const beginPress = (photoId: string, clientX: number, clientY: number) => {
    if (longPressTimerRef.current !== null) return;
    if (releaseResetTimerRef.current !== null) {
      window.clearTimeout(releaseResetTimerRef.current);
      releaseResetTimerRef.current = null;
    }
    longPressTriggeredRef.current = false;
    pressStartPosRef.current = { x: clientX, y: clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      triggerLongPress(photoId);
    }, 420);
  };

  const updatePress = (clientX: number, clientY: number) => {
    const start = pressStartPosRef.current;
    if (!start) return;
    if (Math.hypot(clientX - start.x, clientY - start.y) > 10) {
      clearPressTimer();
    }
  };

  const { folder, photoCount, knownTotalSize } = summary;
  const formattedSize = formatFileSize(knownTotalSize);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const allSelected = photos.length > 0 && selectedPhotoIds.size === photos.length;

  return (
    <main
      className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5 ${
        isSelectionMode ? 'pb-36 sm:pb-28' : 'pb-20'
      }`}
    >
      {/* Hidden native Camera & Multi-Photo Gallery inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
        aria-label={t.cameraInputAria}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="sr-only"
        aria-label={t.galleryInputAria}
      />

      {/* Frosted Glass Folder Header & Upload Controls */}
      <section className="glass-panel rounded-[2px] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-stone-900/10 dark:border-white/10">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[42px] max-w-[56%] sm:max-w-[70%] px-3 py-1.5 rounded-[2px] glass-control inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-700 hover:text-stone-950 dark:text-stone-200 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">{backDestinationLabel}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              disabled={photoCount === 0 || busyAction !== null}
              onClick={() => onShareFolder(summary)}
              className="min-h-[42px] px-3 py-1.5 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t.shareBtn}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label={t.navSettings}
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[2px] glass-control text-stone-700 hover:text-stone-950 dark:text-stone-200 dark:hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenFolderMenu(summary)}
              aria-label={t.optionsForAria(folder.name)}
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[2px] glass-control text-stone-700 hover:text-stone-950 dark:text-stone-200 dark:hover:text-white"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold leading-snug text-stone-900 dark:text-stone-100 text-balance break-words">
              {folder.name}
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 tabular-nums">
              {groupSubtitleName && (
                <>
                  <span>{groupSubtitleName}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                </>
              )}
              <span>{t.photoCountLabel(photoCount)}</span>
              {formattedSize && (
                <>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{formattedSize}</span>
                </>
              )}
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{formatArchiveDate(folder.createdAt)}</span>
            </p>
          </div>

          {/* Justified Equal-Width Camera & Gallery Controls on Mobile */}
          {!isSelectionMode && (
            <div className="w-full md:w-auto grid grid-cols-2 md:flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[42px] px-3.5 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span>{t.cameraBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[42px] px-3.5 py-2 rounded-[2px] bg-stone-900/92 text-stone-50 dark:bg-stone-100/92 dark:text-stone-950 border border-stone-950 dark:border-white text-xs font-medium hover:bg-stone-800 dark:hover:bg-white inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Images className="w-4 h-4 shrink-0" />
                <span>{t.galleryBtn}</span>
              </button>
            </div>
          )}
        </div>

        {/* Multi-Selection Toolbar */}
        {isSelectionMode && (
          <div className="mt-4 pt-3.5 border-t border-stone-900/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-stone-800 dark:text-stone-200 tabular-nums">
              {t.selectedCountBanner(selectedPhotoIds.size)}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onSelectAllOrClear}
                className="min-h-[42px] px-3.5 py-1.5 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap"
              >
                {allSelected ? t.deselectAllBtn : t.selectAllBtn}
              </button>
              <button
                type="button"
                onClick={onExitSelectionMode}
                className="min-h-[42px] px-3.5 py-1.5 rounded-[2px] glass-control text-xs font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap"
              >
                {t.doneBtn}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Photo Thumbnail Grid */}
      {photos.length > 0 ? (
        <section aria-label={t.photosSectionAria}>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {photos.map((photo, index) => {
              const isSelected = selectedPhotoIds.has(photo.id);
              const singleSize = formatFileSize(photo.size);
              const pageText = t.pageLabel(index + 1);

              return (
                <li key={photo.id} className="group">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (e.button === 0) {
                        beginPress(photo.id, e.clientX, e.clientY);
                      }
                    }}
                    onPointerMove={(e) => updatePress(e.clientX, e.clientY)}
                    onPointerUp={endPressGesture}
                    onPointerCancel={endPressGesture}
                    onPointerLeave={clearPressTimer}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        beginPress(photo.id, e.touches[0].clientX, e.touches[0].clientY);
                      } else {
                        clearPressTimer();
                      }
                    }}
                    onTouchMove={(e) => {
                      if (e.touches.length === 1) {
                        updatePress(e.touches[0].clientX, e.touches[0].clientY);
                      } else {
                        clearPressTimer();
                      }
                    }}
                    onTouchEnd={endPressGesture}
                    onTouchCancel={endPressGesture}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      clearPressTimer();
                      if (!longPressTriggeredRef.current) {
                        triggerLongPress(photo.id);
                      }
                    }}
                    onClick={(e) => {
                      if (longPressTriggeredRef.current) {
                        e.preventDefault();
                        longPressTriggeredRef.current = false;
                        return;
                      }
                      if (isSelectionMode) {
                        onTogglePhotoSelect(photo.id);
                      } else {
                        onOpenPhotoAtIndex(index);
                      }
                    }}
                    aria-pressed={isSelectionMode ? isSelected : undefined}
                    aria-label={
                      isSelectionMode
                        ? t.selectPhotoAria(pageText, photo.name)
                        : t.viewPhotoAria(pageText, photo.name)
                    }
                    className={`w-full p-2 glass-panel rounded-[2px] text-left select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 dark:focus-visible:outline-stone-200 transition-transform active:scale-[0.99] ${
                      isSelected
                        ? 'ring-2 ring-stone-900 dark:ring-stone-100'
                        : ''
                    }`}
                  >
                    <div className="relative aspect-[3/4] rounded-[2px] overflow-hidden bg-stone-200/60 dark:bg-stone-900/60 border border-stone-900/10 dark:border-white/10">
                      <ResilientImage
                        src={photo.previewUrl}
                        alt={`${folder.name} — ${pageText}`}
                        className={`w-full h-full object-cover transition-transform duration-200 ${
                          isSelected ? 'scale-[0.97] opacity-90' : 'group-hover:scale-[1.02]'
                        }`}
                      />

                      {isSelectionMode && (
                        <div
                          aria-hidden="true"
                          className={`absolute top-2 right-2 w-6 h-6 rounded-[2px] flex items-center justify-center border ${
                            isSelected
                              ? 'bg-stone-900 border-stone-900 text-stone-50 dark:bg-stone-100 dark:border-stone-100 dark:text-stone-950'
                              : 'bg-black/45 border-white/80 text-transparent backdrop-blur-md'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
                      <span className="text-xs font-medium leading-relaxed text-stone-900 dark:text-stone-100 truncate tabular-nums">
                        {pageText}
                      </span>
                      {singleSize && (
                        <span className="text-[11px] text-stone-600 dark:text-stone-400 shrink-0 tabular-nums">
                          {singleSize}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        /* Empty Binder Glass Panel */
        <section className="glass-panel rounded-[2px] py-12 px-5 sm:px-8">
          <div className="max-w-md mx-auto">
            <p className="text-base font-medium text-stone-900 dark:text-stone-100 text-center">
              {t.emptyBinderTitle}
            </p>
            <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-justify sm:text-center">
              {t.emptyBinderDesc}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.cameraLongBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[42px] px-3 py-2 rounded-[2px] bg-stone-900/92 text-stone-50 dark:bg-stone-100/92 dark:text-stone-950 border border-stone-950 dark:border-white text-xs font-medium hover:bg-stone-800 dark:hover:bg-white inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Images className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.galleryLongBtn}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Frosted Glass Sticky Bottom Selection Bar (Share, Download, Move, Delete) */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 glass-bar border-t px-4 pt-2.5 pb-[calc(var(--safe-bottom)+0.625rem)]">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-stone-800 dark:text-stone-200 truncate tabular-nums">
                {selectedPhotoIds.size > 0
                  ? t.selectedFooterCount(selectedPhotoIds.size)
                  : t.tapPhotosHint}
              </span>
              <button
                type="button"
                onClick={onExitSelectionMode}
                className="sm:hidden min-h-[30px] px-2.5 py-0.5 rounded-[2px] glass-control text-xs font-medium text-stone-700 dark:text-stone-300 shrink-0"
              >
                {t.doneBtn}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                disabled={selectedPhotoIds.size === 0 || busyAction !== null}
                onClick={onShareSelected}
                className="min-h-[46px] sm:min-h-[42px] px-1.5 sm:px-3.5 py-1.5 rounded-[2px] glass-control text-[11px] sm:text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">{t.shareBtn}</span>
              </button>

              <button
                type="button"
                disabled={selectedPhotoIds.size === 0 || busyAction !== null}
                onClick={onDownloadSelected}
                className="min-h-[46px] sm:min-h-[42px] px-1.5 sm:px-3.5 py-1.5 rounded-[2px] glass-control text-[11px] sm:text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">{t.downloadSingleBtn}</span>
              </button>

              <button
                type="button"
                disabled={selectedPhotoIds.size === 0 || busyAction !== null}
                onClick={onRequestMoveSelected}
                className="min-h-[46px] sm:min-h-[42px] px-1.5 sm:px-3.5 py-1.5 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-[11px] sm:text-xs font-medium inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <FolderInput className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">{t.moveBtn}</span>
              </button>

              <button
                type="button"
                disabled={selectedPhotoIds.size === 0 || busyAction !== null}
                onClick={onRequestDeleteSelected}
                className="min-h-[46px] sm:min-h-[42px] px-1.5 sm:px-3.5 py-1.5 rounded-[2px] bg-red-700 text-white dark:bg-red-600 text-[11px] sm:text-xs font-medium inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">{t.deleteBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
