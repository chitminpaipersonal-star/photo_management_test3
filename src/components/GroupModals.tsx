import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Folder,
  FolderPlus,
  Layers,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import type {
  BookFolder,
  GroupFolder,
  GroupSummary,
  Language,
} from '../types/archive';
import { formatArchiveDate, formatFileSize, validateGroupName } from '../utils/archiveLogic';

interface GroupActionMenuProps {
  summary: GroupSummary | null;
  t: AppStrings;
  onClose: () => void;
  onManageBinders: (summary: GroupSummary) => void;
  onRenameGroup: (summary: GroupSummary) => void;
  onDeleteGroup: (summary: GroupSummary) => void;
}

export function GroupActionMenu({
  summary,
  t,
  onClose,
  onManageBinders,
  onRenameGroup,
  onDeleteGroup,
}: GroupActionMenuProps) {
  useEffect(() => {
    if (!summary) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary, onClose]);

  if (!summary) return null;

  const { group, binderCount, photoCount, knownTotalSize } = summary;
  const formattedSize = formatFileSize(knownTotalSize);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-action-sheet-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col glass-modal rounded-t-[2px] sm:rounded-[2px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 bg-stone-400/70 dark:bg-stone-600 rounded-none mx-auto mt-3 shrink-0" />

        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3.5 border-b border-stone-900/10 dark:border-white/10 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              id="group-action-sheet-title"
              className="text-sm font-semibold leading-relaxed text-stone-900 dark:text-stone-100 truncate"
            >
              {group.name}
            </h2>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400 tabular-nums">
              <span>{t.binderCountLabel(binderCount)}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{t.photoCountLabel(photoCount)}</span>
              {formattedSize && (
                <>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{formattedSize}</span>
                </>
              )}
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{formatArchiveDate(group.createdAt)}</span>
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

        <div className="pt-2 px-3 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:pb-3 overflow-y-auto flex-1 min-h-0 divide-y divide-stone-900/10 dark:divide-white/10">
          <div className="py-1 space-y-0.5">
            <button
              type="button"
              onClick={() => onManageBinders(summary)}
              className="w-full min-h-[52px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] transition-colors"
            >
              <Layers className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-relaxed">{t.manageGroupBindersTitle}</div>
                <div className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                  {t.manageGroupBindersDesc}
                </div>
              </div>
            </button>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              type="button"
              onClick={() => onRenameGroup(summary)}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-stone-900 dark:text-stone-100 hover:bg-stone-900/[0.06] dark:hover:bg-white/[0.08] transition-colors"
            >
              <Pencil className="w-4 h-4 shrink-0 text-stone-700 dark:text-stone-300" />
              <span className="font-medium leading-relaxed">{t.renameGroupTitle}</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteGroup(summary)}
              className="w-full min-h-[48px] px-3 py-2.5 rounded-[2px] flex items-center gap-3.5 text-left text-sm text-red-700 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="font-medium leading-relaxed">{t.deleteGroupTitle}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GroupFormModalProps {
  mode: 'create' | 'rename';
  isOpen: boolean;
  initialName?: string;
  excludeGroupId?: string;
  existingGroups: GroupFolder[];
  allBinders: BookFolder[];
  language: Language;
  t: AppStrings;
  onClose: () => void;
  onSubmit: (cleanName: string, selectedBinderIds: Set<string>) => void;
}

export function GroupFormModal({
  mode,
  isOpen,
  initialName = '',
  excludeGroupId,
  existingGroups,
  allBinders,
  language,
  t,
  onClose,
  onSubmit,
}: GroupFormModalProps) {
  const [name, setName] = useState(initialName);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setSelectedIds(new Set());
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

  const toggleBinder = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateGroupName(name, existingGroups, excludeGroupId, language);
    if (!validation.valid) {
      setError(validation.error ?? t.errEmptyGroupName);
      return;
    }
    onSubmit(validation.trimmed, selectedIds);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-form-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md glass-modal rounded-t-[2px] sm:rounded-[2px] px-5 pt-4 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:p-6 max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 shrink-0">
          <h2
            id="group-form-modal-title"
            className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100"
          >
            {mode === 'create' ? t.createGroupModalTitle : t.renameGroupModalTitle}
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

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col min-h-0 flex-1" noValidate>
          <div className="shrink-0">
            <label
              htmlFor="group-folder-name-input"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5"
            >
              {t.groupNameLabel}
            </label>
            <input
              id="group-folder-name-input"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.groupNamePlaceholder}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-[2px] glass-control text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-200"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          {mode === 'create' && allBinders.length > 0 && (
            <div className="mt-3 flex flex-col min-h-0 flex-1">
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 shrink-0">
                {t.optionalBindersLabel}
              </span>
              <div className="overflow-y-auto space-y-1.5 pr-1 min-h-0 max-h-44 flex-1">
                {allBinders.map((binder) => {
                  const checked = selectedIds.has(binder.id);
                  return (
                    <button
                      key={binder.id}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => toggleBinder(binder.id)}
                      className={`w-full min-h-[44px] px-3 py-2 rounded-[2px] border flex items-center justify-between gap-3 text-left text-sm transition-colors ${
                        checked
                          ? 'bg-stone-900/10 dark:bg-white/15 border-stone-900 dark:border-stone-200 text-stone-900 dark:text-stone-100'
                          : 'glass-control text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <span className="truncate leading-relaxed">{binder.name}</span>
                      <span
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-[2px] border flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-stone-900 border-stone-900 text-stone-50 dark:bg-stone-100 dark:border-stone-100 dark:text-stone-950'
                            : 'border-stone-400 dark:border-stone-500'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-4 shrink-0">
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

interface ManageGroupBindersModalProps {
  group: GroupFolder | null;
  allBinders: BookFolder[];
  t: AppStrings;
  onClose: () => void;
  onSaveMembership: (groupId: string, selectedBinderIds: Set<string>) => void;
}

export function ManageGroupBindersModal({
  group,
  allBinders,
  t,
  onClose,
  onSaveMembership,
}: ManageGroupBindersModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (group) {
      setSelectedIds(
        new Set(allBinders.filter((b) => b.groupId === group.id).map((b) => b.id))
      );
    }
  }, [group, allBinders]);

  useEffect(() => {
    if (!group) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [group, onClose]);

  if (!group) return null;

  const toggleBinder = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-group-binders-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md glass-modal rounded-t-[2px] sm:rounded-[2px] px-5 pt-4 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:p-6 max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-900/10 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h2
              id="manage-group-binders-title"
              className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100 truncate"
            >
              {t.manageBindersModalTitle(group.name)}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400 text-justify">
              {t.manageBindersModalDesc}
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

        <div className="mt-4 overflow-y-auto space-y-1.5 flex-1">
          {allBinders.length > 0 ? (
            allBinders.map((binder) => {
              const checked = selectedIds.has(binder.id);
              return (
                <button
                  key={binder.id}
                  type="button"
                  aria-pressed={checked}
                  onClick={() => toggleBinder(binder.id)}
                  className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-[2px] border flex items-center justify-between gap-3 text-left text-sm transition-colors ${
                    checked
                      ? 'bg-stone-900/10 dark:bg-white/15 border-stone-900 dark:border-stone-200 text-stone-900 dark:text-stone-100'
                      : 'glass-control text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="truncate leading-relaxed">{binder.name}</span>
                  <span
                    aria-hidden="true"
                    className={`w-5 h-5 rounded-[2px] border flex items-center justify-center shrink-0 ${
                      checked
                        ? 'bg-stone-900 border-stone-900 text-stone-50 dark:bg-stone-100 dark:border-stone-100 dark:text-stone-950'
                        : 'border-stone-400 dark:border-stone-500'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="py-6 text-sm text-center text-stone-500 dark:text-stone-400">
              {t.noBindersAvailable}
            </p>
          )}
        </div>

        <div className="mt-5 pt-3.5 border-t border-stone-900/10 dark:border-white/10 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-[2px] glass-control text-sm font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={() => onSaveMembership(group.id, selectedIds)}
            className="min-h-[44px] px-5 py-2 rounded-[2px] bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 text-sm font-medium whitespace-nowrap"
          >
            {t.saveSubmitBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AssignBinderToGroupModalProps {
  binder: BookFolder | null;
  groups: GroupFolder[];
  language: Language;
  t: AppStrings;
  onClose: () => void;
  onAssignGroup: (binderId: string, targetGroupId: string | null) => void;
  onCreateGroupAndAssign: (binderId: string, newGroupName: string) => void;
}

export function AssignBinderToGroupModal({
  binder,
  groups,
  language,
  t,
  onClose,
  onAssignGroup,
  onCreateGroupAndAssign,
}: AssignBinderToGroupModalProps) {
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (binder) {
      setCreatingNew(false);
      setNewName('');
      setError(null);
    }
  }, [binder]);

  useEffect(() => {
    if (!binder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [binder, onClose]);

  if (!binder) return null;

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = validateGroupName(newName, groups, undefined, language);
    if (!res.valid) {
      setError(res.error ?? t.errEmptyGroupName);
      return;
    }
    onCreateGroupAndAssign(binder.id, res.trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs pt-[max(0.5rem,var(--safe-top))] px-0 pb-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-group-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md glass-modal rounded-t-[2px] sm:rounded-[2px] px-5 pt-4 pb-[max(0.875rem,calc(var(--safe-bottom)+0.625rem))] sm:p-6 max-h-[calc(100dvh-0.5rem)] sm:max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-900/10 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h2
              id="assign-group-modal-title"
              className="text-base font-semibold leading-relaxed text-stone-900 dark:text-stone-100"
            >
              {t.assignGroupModalTitle}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400 truncate">
              {t.assignGroupModalDesc(binder.name)}
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

        <div className="mt-3 overflow-y-auto space-y-1.5 flex-1">
          {/* Option: Main List (No Group) */}
          <button
            type="button"
            onClick={() => onAssignGroup(binder.id, null)}
            className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-[2px] flex items-center justify-between gap-3 text-left text-sm font-medium border transition-colors ${
              !binder.groupId
                ? 'bg-stone-900/10 dark:bg-white/15 border-stone-900 dark:border-stone-200 text-stone-900 dark:text-stone-100'
                : 'glass-control text-stone-800 dark:text-stone-200'
            }`}
          >
            <span className="truncate leading-relaxed">{t.mainListOptionLabel}</span>
            {!binder.groupId && <Check className="w-4 h-4 shrink-0" />}
          </button>

          {groups.map((grp) => {
            const isCurrent = binder.groupId === grp.id;
            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => onAssignGroup(binder.id, grp.id)}
                className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-[2px] flex items-center justify-between gap-3 text-left text-sm font-medium border transition-colors ${
                  isCurrent
                    ? 'bg-stone-900/10 dark:bg-white/15 border-stone-900 dark:border-stone-200 text-stone-900 dark:text-stone-100'
                    : 'glass-control text-stone-800 dark:text-stone-200'
                }`}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <Folder className="w-4 h-4 shrink-0 text-stone-600 dark:text-stone-400" />
                  <span className="truncate leading-relaxed">{grp.name}</span>
                </span>
                {isCurrent && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3.5 border-t border-stone-900/10 dark:border-white/10">
          {!creatingNew ? (
            <button
              type="button"
              onClick={() => setCreatingNew(true)}
              className="w-full min-h-[44px] px-4 py-2 rounded-[2px] glass-control text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center justify-center gap-2"
            >
              <FolderPlus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{t.createAndAssignGroupBtn}</span>
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-2.5" noValidate>
              <label
                htmlFor="assign-new-group-name"
                className="block text-xs font-medium text-stone-600 dark:text-stone-400"
              >
                {t.groupNameLabel}
              </label>
              <input
                id="assign-new-group-name"
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t.groupNamePlaceholder}
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
