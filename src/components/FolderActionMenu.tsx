import { useEffect } from 'react';
import {
  CheckSquare,
  Download,
  FolderTree,
  Pencil,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import type { FolderSummary, GroupFolder } from '../types/archive';
import { formatArchiveDate, formatFileSize } from '../utils/archiveLogic';

interface FolderActionMenuProps {
  summary: FolderSummary | null;
  groups: GroupFolder[];
  busyAction: string | null;
  t: AppStrings;
  onClose: () => void;
  onShareFolder: (summary: FolderSummary) => void;
  onDownloadZip: (summary: FolderSummary) => void;
  onSelectPhotos: (summary: FolderSummary) => void;
  onAssignGroup: (summary: FolderSummary) => void;
  onRenameFolder: (summary: FolderSummary) => void;
  onDeleteFolder: (summary: FolderSummary) => void;
}

export function FolderActionMenu({
  summary,
  groups,
  busyAction,
  t,
  onClose,
  onShareFolder,
  onDownloadZip,
  onSelectPhotos,
  onAssignGroup,
  onRenameFolder,
  onDeleteFolder,
}: FolderActionMenuProps) {
  useEffect(() => {
    if (!summary) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [summary, onClose]);

  if (!summary) return null;

  const { folder, photoCount, knownTotalSize } = summary;
  const formattedSize = formatFileSize(knownTotalSize);
  const hasPhotos = photoCount > 0;
  const currentGroup = folder.groupId
    ? groups.find((g) => g.id === folder.groupId)?.name ?? null
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-action-sheet-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col glass-modal rounded-t-[2px] sm:rounded-[2px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1 bg-stone-400/70 dark:bg-stone-600 rounded-none mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3.5 border-b border-stone-900/10 dark:border-white/10 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              id="folder-action-sheet-title"
              className="text-sm font-semibold leading-relaxed text-stone-900 dark:text-stone-100 truncate"
            >
              {folder.name}
            </h2>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400 tabular-nums">
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
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeMenuAria}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[2px] glass-control text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="pt-2 px-3 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:pb-3 overflow-y-auto flex-1 min-h-0 divide-y divide-stone-900/10 dark:divide-white/10">
          <div className="py-1 space-y-0.5">
            <button
              type="button"
              disabled={!hasPhotos || busyAction !== null}
              onClick={() => onShareFolder(summary)}
              className="w-full min-h-[52px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Share2 className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-relaxed">{t.shareFolderTitle}</div>
                <div className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  {t.shareFolderDesc}
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={!hasPhotos || busyAction !== null}
              onClick={() => onDownloadZip(summary)}
              className="w-full min-h-[52px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Download className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-relaxed">{t.downloadZipTitle}</div>
                <div className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  {t.downloadZipDesc}
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={!hasPhotos || busyAction !== null}
              onClick={() => onSelectPhotos(summary)}
              className="w-full min-h-[52px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <CheckSquare className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-relaxed">{t.selectPhotosTitle}</div>
                <div className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  {t.selectPhotosDesc}
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => onAssignGroup(summary)}
              className="w-full min-h-[52px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] transition-colors"
            >
              <FolderTree className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-relaxed">{t.moveToGroupTitle}</div>
                <div className="text-xs leading-relaxed text-stone-600 dark:text-stone-400 truncate">
                  {t.moveToGroupDesc(currentGroup)}
                </div>
              </div>
            </button>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => onRenameFolder(summary)}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] transition-colors"
            >
              <Pencil className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <span className="font-medium leading-relaxed">{t.renameBinderTitle}</span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => onDeleteFolder(summary)}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-red-700 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="font-medium leading-relaxed">{t.deleteBinderTitle}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
