import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Database,
  FolderDown,
  Globe,
  Moon,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import { parseArchiveBackupZip } from '../services/backupService';
import type { Language } from '../types/archive';
import type { ArchiveSnapshot } from '../utils/backupLogic';

interface StagedBackup {
  filename: string;
  snapshot: ArchiveSnapshot;
}

interface SettingsModalProps {
  isOpen: boolean;
  language: Language;
  isDarkMode: boolean;
  totalGroupCount: number;
  totalBinderCount: number;
  totalPhotoCount: number;
  isExportingBackup: boolean;
  exportProgress: number | null;
  t: AppStrings;
  onClose: () => void;
  onChangeLanguage: (lang: Language) => void;
  onChangeDarkMode: (dark: boolean) => void;
  onExportBackup: () => void;
  onApplyBackup: (snapshot: ArchiveSnapshot, mode: 'merge' | 'replace') => Promise<void>;
  onRequestResetDatabase: () => void;
}

export function SettingsModal({
  isOpen,
  language,
  isDarkMode,
  totalGroupCount,
  totalBinderCount,
  totalPhotoCount,
  isExportingBackup,
  exportProgress,
  t,
  onClose,
  onChangeLanguage,
  onChangeDarkMode,
  onExportBackup,
  onApplyBackup,
  onRequestResetDatabase,
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const [stagedBackup, setStagedBackup] = useState<StagedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  const revokeStagedPreviewUrls = (staged: StagedBackup | null) => {
    if (!staged) return;
    for (const p of staged.snapshot.photos) {
      if (p.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(p.previewUrl);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setImportError(null);
      setIsApplyingImport(false);
      setStagedBackup((prev) => {
        revokeStagedPreviewUrls(prev);
        return null;
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (stagedBackup && previewCardRef.current) {
      previewCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [stagedBackup]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExportingBackup) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isExportingBackup, onClose]);

  if (!isOpen) return null;

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportError(null);
    if (stagedBackup) {
      revokeStagedPreviewUrls(stagedBackup);
      setStagedBackup(null);
    }

    const parsed = await parseArchiveBackupZip(file);
    if (!parsed.valid) {
      setImportError(t.errInvalidBackupFile);
      return;
    }

    setStagedBackup({
      filename: file.name,
      snapshot: parsed.snapshot,
    });
  };

  const handleConfirmImport = async (mode: 'merge' | 'replace') => {
    if (!stagedBackup || isApplyingImport) return;
    setIsApplyingImport(true);
    try {
      const snapshotToApply = stagedBackup.snapshot;
      // Ownership of blob previewUrls transfers to App state
      setStagedBackup(null);
      await onApplyBackup(snapshotToApply, mode);
    } finally {
      setIsApplyingImport(false);
    }
  };

  const handleCancelStaged = () => {
    revokeStagedPreviewUrls(stagedBackup);
    setStagedBackup(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={() => {
        if (!isExportingBackup) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-md max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col glass-modal rounded-t-[2px] sm:rounded-[2px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 bg-stone-400/70 dark:bg-stone-600 rounded-none mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3.5 border-b border-stone-900/10 dark:border-white/10 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              id="settings-modal-title"
              className="text-base font-semibold text-stone-900 dark:text-stone-100"
            >
              {t.settingsTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400 text-justify">
              {t.settingsSubtitle}
            </p>
          </div>
          <button
            type="button"
            disabled={isExportingBackup}
            onClick={onClose}
            aria-label={t.closeMenuAria}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[2px] glass-control text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white disabled:opacity-40 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Sections */}
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0 divide-y divide-stone-900/10 dark:divide-white/10 space-y-5">
          {/* 1. Language Switcher (Myanmar / English) */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-100">
              <Globe className="w-4 h-4 text-stone-600 dark:text-stone-400" aria-hidden="true" />
              <span>{t.languageLabel}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400 text-justify">
              {t.languageDesc}
            </p>

            <div
              role="group"
              aria-label={t.languageLabel}
              className="mt-3 grid grid-cols-2 gap-1.5 p-1 rounded-[2px] bg-stone-900/[0.06] dark:bg-white/[0.05] border border-stone-900/12 dark:border-white/12"
            >
              <button
                type="button"
                aria-pressed={language === 'my'}
                onClick={() => onChangeLanguage('my')}
                className={`min-h-[42px] px-3 py-2 rounded-[2px] text-sm font-medium whitespace-nowrap transition-colors ${
                  language === 'my'
                    ? 'bg-white/95 dark:bg-white/15 text-stone-900 dark:text-stone-100 border border-stone-900/12 dark:border-white/20 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                မြန်မာ
              </button>
              <button
                type="button"
                aria-pressed={language === 'en'}
                onClick={() => onChangeLanguage('en')}
                className={`min-h-[42px] px-3 py-2 rounded-[2px] text-sm font-medium whitespace-nowrap transition-colors ${
                  language === 'en'
                    ? 'bg-white/95 dark:bg-white/15 text-stone-900 dark:text-stone-100 border border-stone-900/12 dark:border-white/20 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* 2. Appearance / Theme Switcher (Light / Dark) */}
          <div className="pt-5">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-100">
              {isDarkMode ? (
                <Moon className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4 text-stone-600" aria-hidden="true" />
              )}
              <span>{t.themeLabel}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400 text-justify">
              {t.themeDesc}
            </p>

            <div
              role="group"
              aria-label={t.themeLabel}
              className="mt-3 grid grid-cols-2 gap-1.5 p-1 rounded-[2px] bg-stone-900/[0.06] dark:bg-white/[0.05] border border-stone-900/12 dark:border-white/12"
            >
              <button
                type="button"
                aria-pressed={!isDarkMode}
                onClick={() => onChangeDarkMode(false)}
                className={`min-h-[42px] px-3 py-2 rounded-[2px] text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                  !isDarkMode
                    ? 'bg-white/95 text-stone-900 border border-stone-900/12 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Sun className="w-4 h-4" aria-hidden="true" />
                <span>{t.lightModeLabel}</span>
              </button>
              <button
                type="button"
                aria-pressed={isDarkMode}
                onClick={() => onChangeDarkMode(true)}
                className={`min-h-[42px] px-3 py-2 rounded-[2px] text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                  isDarkMode
                    ? 'bg-white/15 text-stone-100 border border-white/20 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Moon className="w-4 h-4" aria-hidden="true" />
                <span>{t.darkModeLabel}</span>
              </button>
            </div>
          </div>

          {/* 3. Full Data Backup (Export .zip) & Restore (Import .zip) */}
          <div className="pt-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleImportFileChange}
              className="sr-only"
              aria-label={t.importInputAria}
            />

            <div className="flex items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-100">
              <Database className="w-4 h-4 text-stone-600 dark:text-stone-300" aria-hidden="true" />
              <span>{t.storageInfoLabel}</span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300 tabular-nums">
              {t.storageInfoDesc(totalGroupCount, totalBinderCount, totalPhotoCount)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400 text-justify">
              {t.backupSectionDesc}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isExportingBackup || isApplyingImport}
                onClick={onExportBackup}
                className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap tabular-nums"
              >
                <FolderDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isExportingBackup
                    ? exportProgress !== null
                      ? `${t.exportingBackupBtn} (${exportProgress}%)`
                      : t.pickingLocationBtn
                    : t.exportBackupBtn}
                </span>
              </button>

              <button
                type="button"
                disabled={isExportingBackup || isApplyingImport}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.importBackupBtn}</span>
              </button>
            </div>

            {isExportingBackup && exportProgress !== null && (
              <div className="mt-2.5 space-y-1" aria-live="polite">
                <div className="h-1.5 w-full rounded-none bg-stone-900/12 dark:bg-white/12 overflow-hidden">
                  <div
                    className="h-full bg-stone-900 dark:bg-stone-200 transition-all duration-150"
                    style={{ width: `${Math.max(4, exportProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {importError && (
              <p
                role="alert"
                className="mt-3 px-3 py-2 rounded-[2px] bg-red-50/80 dark:bg-red-950/40 border border-red-300 dark:border-red-900/60 text-xs leading-relaxed text-red-700 dark:text-red-300 text-justify"
              >
                {importError}
              </p>
            )}

            {stagedBackup && (
              <div
                ref={previewCardRef}
                className="mt-3 p-3.5 rounded-[2px] glass-panel space-y-2.5"
              >
                <div className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                  {t.backupPreviewLabel(stagedBackup.filename)}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                  {t.backupPreviewSummary(
                    stagedBackup.snapshot.groups.length,
                    stagedBackup.snapshot.folders.length,
                    stagedBackup.snapshot.photos.length
                  )}
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isApplyingImport}
                    onClick={() => handleConfirmImport('merge')}
                    className="min-h-[42px] px-3.5 py-2 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs sm:text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    {t.backupMergeBtn}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isApplyingImport}
                      onClick={() => handleConfirmImport('replace')}
                      className="min-h-[42px] px-3 py-2 rounded-[2px] border border-red-400/70 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40 disabled:opacity-50 whitespace-nowrap"
                    >
                      {t.backupReplaceBtn}
                    </button>
                    <button
                      type="button"
                      disabled={isApplyingImport}
                      onClick={handleCancelStaged}
                      className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-800 dark:text-stone-200 disabled:opacity-50 whitespace-nowrap"
                    >
                      {t.cancelBtn}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Reset Entire Database */}
          <div className="pt-5">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
              <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.resetDbSectionLabel}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400 text-justify">
              {t.resetDbSectionDesc}
            </p>
            <div className="mt-3">
              <button
                type="button"
                disabled={isExportingBackup || isApplyingImport}
                onClick={onRequestResetDatabase}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-[2px] border border-red-400/70 dark:border-red-800/80 bg-red-50/55 dark:bg-red-950/25 hover:bg-red-100/75 dark:hover:bg-red-950/45 text-xs font-medium text-red-700 dark:text-red-400 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t.resetDbBtn}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3.5 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:pb-3.5 border-t border-stone-900/10 dark:border-white/10 flex sm:justify-end shrink-0">
          <button
            type="button"
            disabled={isExportingBackup}
            onClick={onClose}
            className="w-full sm:w-auto min-h-[42px] px-6 py-2 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-xs font-medium whitespace-nowrap disabled:opacity-50"
          >
            {t.doneBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
