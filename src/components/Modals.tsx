import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, FolderInput, FolderPlus, X } from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import type { BookFolder, Language } from '../types/archive';
import { validateFolderName } from '../utils/archiveLogic';

interface FolderFormModalProps {
  mode: 'create' | 'rename';
  isOpen: boolean;
  initialName?: string;
  excludeFolderId?: string;
  existingFolders: BookFolder[];
  language: Language;
  t: AppStrings;
  onClose: () => void;
  onSubmit: (cleanName: string) => void;
}

export function FolderFormModal({
  mode,
  isOpen,
  initialName = '',
  excludeFolderId,
  existingFolders,
  language,
  t,
  onClose,
  onSubmit,
}: FolderFormModalProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError(null);
    }
  }, [isOpen, initialName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateFolderName(name, existingFolders, excludeFolderId, language);
    if (!validation.valid) {
      setError(validation.error ?? t.errEmptyBinderName);
      return;
    }
    onSubmit(validation.trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-form-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] overflow-y-auto glass-modal rounded-t-[2px] sm:rounded-[2px] px-5 pt-4 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2
            id="folder-form-modal-title"
            className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100"
          >
            {mode === 'create' ? t.createBinderModalTitle : t.renameBinderModalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeMenuAria}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[2px] glass-control text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label
              htmlFor="book-folder-name-input"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5"
            >
              {t.binderNameLabel}
            </label>
            <input
              id="book-folder-name-input"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.binderNamePlaceholder}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-[2px] glass-control text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-200"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-[2px] glass-control text-sm font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 whitespace-nowrap"
            >
              {mode === 'create' ? t.createSubmitBtn : t.saveSubmitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-desc"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] overflow-y-auto glass-modal rounded-t-[2px] sm:rounded-[2px] px-5 pt-4 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[2px] bg-red-500/12 border border-red-500/25 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-delete-title"
              className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100"
            >
              {title}
            </h2>
            <p
              id="confirm-delete-desc"
              className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 leading-relaxed text-justify"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-3 py-2 rounded-[2px] glass-control text-xs sm:text-sm font-medium leading-snug text-center text-stone-800 dark:text-stone-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] px-3 py-2 rounded-[2px] bg-red-700 text-white dark:bg-red-600 text-xs sm:text-sm font-medium leading-snug text-center hover:bg-red-800 dark:hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MovePhotosModalProps {
  isOpen: boolean;
  selectedCount: number;
  currentFolderId: string;
  folders: BookFolder[];
  language: Language;
  t: AppStrings;
  onClose: () => void;
  onMoveToExisting: (targetFolderId: string) => void;
  onCreateAndMove: (newFolderName: string) => void;
}

export function MovePhotosModal({
  isOpen,
  selectedCount,
  currentFolderId,
  folders,
  language,
  t,
  onClose,
  onMoveToExisting,
  onCreateAndMove,
}: MovePhotosModalProps) {
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCreatingNew(false);
      setNewName('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const destinationFolders = folders.filter((f) => f.id !== currentFolderId);

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = validateFolderName(newName, folders, undefined, language);
    if (!res.valid) {
      setError(res.error ?? t.errEmptyBinderName);
      return;
    }
    onCreateAndMove(res.trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-photos-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md glass-modal rounded-t-[2px] sm:rounded-[2px] px-5 pt-4 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:p-6 max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-900/10 dark:border-white/10">
          <div>
            <h2
              id="move-photos-modal-title"
              className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100"
            >
              {t.movePhotosModalTitle}
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
              {t.movePhotosModalDesc(selectedCount)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeMenuAria}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[2px] glass-control text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 overflow-y-auto space-y-1.5 flex-1">
          {destinationFolders.length > 0 ? (
            destinationFolders.map((dest) => (
              <button
                key={dest.id}
                type="button"
                onClick={() => onMoveToExisting(dest.id)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-[2px] flex items-center justify-between gap-3 text-left text-sm font-medium text-stone-900 dark:text-stone-100 glass-control"
              >
                <span className="truncate leading-relaxed">{dest.name}</span>
                <FolderInput className="w-4 h-4 shrink-0 text-stone-500 dark:text-stone-400" />
              </button>
            ))
          ) : (
            <p className="py-4 text-sm text-center text-stone-500 dark:text-stone-400">
              {t.noOtherBindersDesc}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3.5 border-t border-stone-900/10 dark:border-white/10">
          {!creatingNew ? (
            <button
              type="button"
              onClick={() => setCreatingNew(true)}
              className="w-full min-h-[44px] px-4 py-2 rounded-[2px] glass-control text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center justify-center gap-2"
            >
              <FolderPlus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{t.createBinderAndMoveBtn}</span>
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-2.5" noValidate>
              <label
                htmlFor="move-new-folder-name"
                className="block text-xs font-medium text-stone-600 dark:text-stone-400"
              >
                {t.newBinderNameLabel}
              </label>
              <input
                id="move-new-folder-name"
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t.binderNamePlaceholder}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-[2px] glass-control text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-200"
              />
              {error && (
                <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="min-h-[44px] px-3.5 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap"
                >
                  {t.backBtn}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-medium whitespace-nowrap"
                >
                  {t.createAndMoveSubmitBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
