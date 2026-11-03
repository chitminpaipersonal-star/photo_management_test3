import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react';
import type { AppStrings } from '../i18n/translations';
import type {
  FolderSummary,
  GroupFolder,
  GroupSummary,
  SortMode,
} from '../types/archive';
import { formatArchiveDate, formatFileSize } from '../utils/archiveLogic';
import { ResilientImage } from './ResilientImage';

interface HomeDetailsViewProps {
  activeGroupSummary: GroupSummary | null;
  groupSummaries: GroupSummary[];
  binderSummaries: FolderSummary[];
  allGroups: GroupFolder[];
  totalGroupCount: number;
  totalBinderCount: number;
  totalPhotoCount: number;
  searchQuery: string;
  sortMode: SortMode;
  t: AppStrings;
  onSearchChange: (q: string) => void;
  onSortChange: (mode: SortMode) => void;
  onOpenSettings: () => void;
  onCreateGroupClick: () => void;
  onCreateBinderClick: () => void;
  onOpenGroup: (groupId: string) => void;
  onExitGroup: () => void;
  onOpenGroupMenu: (summary: GroupSummary) => void;
  onManageGroupBinders: (group: GroupFolder) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenFolderMenu: (summary: FolderSummary) => void;
}

export function HomeDetailsView({
  activeGroupSummary,
  groupSummaries,
  binderSummaries,
  allGroups,
  totalGroupCount,
  totalBinderCount,
  totalPhotoCount,
  searchQuery,
  sortMode,
  t,
  onSearchChange,
  onSortChange,
  onOpenSettings,
  onCreateGroupClick,
  onCreateBinderClick,
  onOpenGroup,
  onExitGroup,
  onOpenGroupMenu,
  onManageGroupBinders,
  onOpenFolder,
  onOpenFolderMenu,
}: HomeDetailsViewProps) {
  const isSearchActive = searchQuery.trim().length > 0;
  const hasAnyResults =
    activeGroupSummary !== null
      ? binderSummaries.length > 0
      : groupSummaries.length > 0 || binderSummaries.length > 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20 space-y-5">
      {/* Frosted Glass Masthead & Controls Panel */}
      <section className="glass-panel rounded-[2px] p-4 sm:p-5">
        {activeGroupSummary ? (
          /* Viewing inside a specific Parent Group Folder (ဖိုဒါလ်) */
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-900/10 dark:border-white/10">
              <button
                type="button"
                onClick={onExitGroup}
                className="min-h-[42px] px-3 py-1.5 rounded-[2px] glass-control inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-700 hover:text-stone-950 dark:text-stone-200 dark:hover:text-white whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>{t.backToAllSpecs}</span>
              </button>

              <div className="flex items-center gap-2 shrink-0">
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
                  onClick={() => onOpenGroupMenu(activeGroupSummary)}
                  aria-label={t.optionsForAria(activeGroupSummary.group.name)}
                  className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-[2px] glass-control text-stone-700 hover:text-stone-950 dark:text-stone-200 dark:hover:text-white"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3.5">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold leading-snug text-stone-900 dark:text-stone-100 text-balance break-words">
                  {activeGroupSummary.group.name}
                </h1>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                  {t.groupDetailSummary(
                    activeGroupSummary.binderCount,
                    activeGroupSummary.photoCount
                  )}
                </p>
              </div>

              <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCreateBinderClick}
                  className="min-h-[42px] px-3 sm:px-3.5 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 text-stone-700 dark:text-stone-300" />
                  <span className="truncate">{t.newBinderBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onManageGroupBinders(activeGroupSummary.group)}
                  className="min-h-[42px] px-3 sm:px-3.5 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0 text-stone-700 dark:text-stone-300" />
                  <span className="truncate">{t.addBindersToGroupBtn}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Root Home Masthead — Justified Header & Equal-Width Mobile Action Grid */
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between lg:flex-col lg:items-start gap-1">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 text-balance">
                Data Management
              </h1>
              <p className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                {t.archiveSummary(totalGroupCount, totalBinderCount, totalPhotoCount)}
              </p>
            </div>

            <div className="w-full lg:w-auto grid grid-cols-3 lg:flex items-center gap-2">
              <button
                type="button"
                onClick={onCreateBinderClick}
                className="min-h-[42px] px-2 sm:px-3.5 py-1.5 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-stone-700 dark:text-stone-300" />
                <span className="truncate">{t.newBinderBtn}</span>
              </button>

              <button
                type="button"
                onClick={onCreateGroupClick}
                className="min-h-[42px] px-2 sm:px-3.5 py-1.5 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <FolderPlus className="w-3.5 h-3.5 shrink-0 text-stone-700 dark:text-stone-300" />
                <span className="truncate">{t.newGroupBtn}</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={t.navSettings}
                className="min-h-[42px] px-2 sm:px-3.5 py-1.5 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5 shrink-0 text-stone-700 dark:text-stone-300" />
                <span className="truncate">{t.navSettings}</span>
              </button>
            </div>
          </div>
        )}

        {/* Flush Justified Search & Sort Row */}
        <div className="mt-4 pt-3.5 border-t border-stone-900/10 dark:border-white/10 grid grid-cols-[minmax(0,1fr)_154px] sm:grid-cols-[minmax(0,1fr)_224px] items-center gap-2">
          <div className="relative min-w-0">
            <label htmlFor="folder-search-input" className="sr-only">
              {t.searchAria}
            </label>
            <Search
              className="w-4 h-4 text-stone-500 dark:text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="folder-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full min-h-[42px] pl-9 ${
                searchQuery ? 'pr-9' : 'pr-3'
              } py-2 rounded-[2px] glass-control text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-200`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label={t.clearSearchAria}
                className="min-h-[42px] min-w-[42px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative min-w-0">
            <label htmlFor="folder-sort-select" className="sr-only">
              {t.sortAria}
            </label>
            <ArrowUpDown
              className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <select
              id="folder-sort-select"
              value={sortMode}
              onChange={(e) => onSortChange(e.target.value as SortMode)}
              className="w-full min-h-[42px] pl-8 sm:pl-9 pr-7 py-2 rounded-[2px] glass-control text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-stone-900 dark:focus:ring-stone-200 appearance-none cursor-pointer truncate"
            >
              <option value="name_asc" className="bg-[#FAF9F5] dark:bg-[#18181B]">
                {t.sortNameAsc}
              </option>
              <option value="date_desc" className="bg-[#FAF9F5] dark:bg-[#18181B]">
                {t.sortDateDesc}
              </option>
            </select>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-500 dark:text-stone-400"
            >
              ▾
            </span>
          </div>
        </div>
      </section>

      {hasAnyResults ? (
        <div className="space-y-5">
          {/* 1. Parent Group Folders Section (ဖိုဒါလ်များ) */}
          {activeGroupSummary === null && groupSummaries.length > 0 && (
            <section
              aria-labelledby="groups-section-heading"
              className="glass-panel rounded-[2px] overflow-hidden"
            >
              <div className="flex md:grid md:grid-cols-[minmax(0,1fr)_124px_124px_136px_44px] items-center justify-between gap-4 px-3.5 sm:px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 border-b border-stone-900/10 dark:border-white/10 bg-white/35 dark:bg-white/[0.02]">
                <h2 id="groups-section-heading" className="text-xs font-medium leading-relaxed">
                  {t.groupsSectionTitle}
                </h2>
                <span className="hidden md:block text-right">{t.colBinder}</span>
                <span className="hidden md:block text-right">{t.colFileSize}</span>
                <span className="hidden md:block text-right">{t.colCreatedDate}</span>
                <span className="sr-only">{t.colActions}</span>
              </div>

              <ul
                className="divide-y divide-stone-900/10 dark:divide-white/10"
                role="list"
              >
                {groupSummaries.map((gSummary) => {
                  const { group, binderCount, photoCount, knownTotalSize } = gSummary;
                  const formattedSize = formatFileSize(knownTotalSize);
                  const formattedDate = formatArchiveDate(group.createdAt);

                  return (
                    <li
                      key={group.id}
                      className="group flex md:grid md:grid-cols-[minmax(0,1fr)_124px_124px_136px_44px] items-center justify-between gap-3 md:gap-4 px-3.5 sm:px-4 py-3 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenGroup(group.id)}
                        className="flex-1 min-w-0 flex items-center gap-3.5 text-left py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 dark:focus-visible:outline-stone-200 rounded-[2px]"
                      >
                        {/* Sharp Glass Folder Plate */}
                        <div className="w-12 h-14 sm:w-13 sm:h-15 rounded-[2px] border border-stone-900/15 dark:border-white/15 bg-white/65 dark:bg-white/[0.05] flex items-center justify-center shrink-0 text-stone-700 dark:text-stone-200">
                          <Folder className="w-5 h-5 stroke-[1.6]" aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between md:justify-start gap-1.5">
                            <span className="text-sm font-medium leading-relaxed py-0.5 text-stone-900 dark:text-stone-100 truncate group-hover:text-stone-700 dark:group-hover:text-white">
                              {group.name}
                            </span>
                            <ChevronRight
                              className="w-4 h-4 text-stone-400 shrink-0"
                              aria-hidden="true"
                            />
                          </div>

                          {/* Mobile inline metadata */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-600 dark:text-stone-400 tabular-nums md:hidden">
                            <span>{t.binderCountLabel(binderCount)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{t.photoCountLabel(photoCount)}</span>
                            {formattedSize && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[11px]">{formattedSize}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{formattedDate}</span>
                          </div>
                        </div>
                      </button>

                      {/* Desktop Aligned Columns */}
                      <div
                        onClick={() => onOpenGroup(group.id)}
                        className="hidden md:block text-right text-xs text-stone-700 dark:text-stone-300 tabular-nums cursor-pointer"
                      >
                        {t.binderCountLabel(binderCount)}
                      </div>

                      <div
                        onClick={() => onOpenGroup(group.id)}
                        className="hidden md:block text-right text-xs text-stone-600 dark:text-stone-400 tabular-nums cursor-pointer"
                      >
                        {formattedSize ?? t.photoCountLabel(photoCount)}
                      </div>

                      <div
                        onClick={() => onOpenGroup(group.id)}
                        className="hidden md:block text-right text-xs text-stone-600 dark:text-stone-400 tabular-nums cursor-pointer"
                      >
                        {formattedDate}
                      </div>

                      <div className="flex justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenGroupMenu(gSummary)}
                          aria-label={t.optionsForAria(group.name)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[2px] text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white hover:bg-stone-900/[0.06] dark:hover:bg-white/10 transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* 2. Book Binders Details View Section (ဖိုင်တွဲများ) */}
          {binderSummaries.length > 0 && (
            <section
              aria-labelledby="binders-section-heading"
              className="glass-panel rounded-[2px] overflow-hidden"
            >
              {/* Unified Section / Table Header */}
              <div className="flex md:grid md:grid-cols-[minmax(0,1fr)_124px_124px_136px_44px] items-center justify-between gap-4 px-3.5 sm:px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 border-b border-stone-900/10 dark:border-white/10 bg-white/35 dark:bg-white/[0.02]">
                <h2 id="binders-section-heading" className="text-xs font-medium leading-relaxed">
                  {activeGroupSummary === null && isSearchActive
                    ? t.searchMatchedBindersTitle
                    : activeGroupSummary === null && groupSummaries.length > 0
                    ? t.ungroupedBindersTitle
                    : t.colBinder}
                </h2>
                <span className="hidden md:block text-right">{t.colPhotoCount}</span>
                <span className="hidden md:block text-right">{t.colFileSize}</span>
                <span className="hidden md:block text-right">{t.colCreatedDate}</span>
                <span className="sr-only">{t.colActions}</span>
              </div>

              <ul
                className="divide-y divide-stone-900/10 dark:divide-white/10"
                role="list"
              >
                {binderSummaries.map((summary) => {
                  const { folder, photoCount, knownTotalSize, coverPhoto } = summary;
                  const formattedSize = formatFileSize(knownTotalSize);
                  const formattedDate = formatArchiveDate(folder.createdAt);
                  const parentGroup =
                    isSearchActive && folder.groupId
                      ? allGroups.find((g) => g.id === folder.groupId)?.name ?? null
                      : null;

                  return (
                    <li
                      key={folder.id}
                      className="group flex md:grid md:grid-cols-[minmax(0,1fr)_124px_124px_136px_44px] items-center justify-between gap-3 md:gap-4 px-3.5 sm:px-4 py-3 hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenFolder(folder.id)}
                        className="flex-1 min-w-0 flex items-center gap-3.5 text-left py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 dark:focus-visible:outline-stone-200 rounded-[2px]"
                      >
                        <div className="w-12 h-16 sm:w-13 sm:h-[68px] rounded-[2px] overflow-hidden border border-stone-900/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.04] shrink-0">
                          <ResilientImage
                            src={coverPhoto?.previewUrl}
                            alt={t.coverAlt(folder.name)}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-relaxed py-0.5 text-stone-900 dark:text-stone-100 truncate group-hover:text-stone-700 dark:group-hover:text-white">
                            {folder.name}
                          </div>

                          {/* Mobile unboxed inline metadata */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-600 dark:text-stone-400 tabular-nums md:hidden">
                            {parentGroup && (
                              <>
                                <span className="truncate max-w-[140px]">{parentGroup}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span>{t.photoCountLabel(photoCount)}</span>
                            {formattedSize && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[11px]">{formattedSize}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{formattedDate}</span>
                          </div>

                          {/* Desktop search parent group indicator */}
                          {parentGroup && (
                            <div className="hidden md:block text-xs text-stone-500 dark:text-stone-400 truncate">
                              {parentGroup}
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Desktop Aligned Columns */}
                      <div
                        onClick={() => onOpenFolder(folder.id)}
                        className="hidden md:block text-right text-xs text-stone-700 dark:text-stone-300 tabular-nums cursor-pointer"
                      >
                        {t.photoCountLabel(photoCount)}
                      </div>

                      <div
                        onClick={() => onOpenFolder(folder.id)}
                        className="hidden md:block text-right text-xs text-stone-600 dark:text-stone-400 tabular-nums cursor-pointer"
                      >
                        {formattedSize ?? '—'}
                      </div>

                      <div
                        onClick={() => onOpenFolder(folder.id)}
                        className="hidden md:block text-right text-xs text-stone-600 dark:text-stone-400 tabular-nums cursor-pointer"
                      >
                        {formattedDate}
                      </div>

                      <div className="flex justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenFolderMenu(summary)}
                          aria-label={t.optionsForAria(folder.name)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[2px] text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white hover:bg-stone-900/[0.06] dark:hover:bg-white/10 transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      ) : (
        /* Empty Search / Empty Group / Empty Archive Glass Panel */
        <div className="glass-panel rounded-[2px] py-12 px-5 sm:px-8">
          {isSearchActive ? (
            <div className="max-w-md mx-auto">
              <p className="text-sm font-medium leading-relaxed text-stone-900 dark:text-stone-100 text-center">
                {t.noSearchResultsTitle(searchQuery.trim())}
              </p>
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-justify sm:text-center">
                {t.noSearchResultsDesc}
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100"
                >
                  {t.clearSearchBtn}
                </button>
              </div>
            </div>
          ) : activeGroupSummary ? (
            <div className="max-w-md mx-auto">
              <p className="text-base font-medium text-stone-900 dark:text-stone-100 text-center">
                {t.emptyGroupTitle}
              </p>
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-justify sm:text-center">
                {t.emptyGroupDesc}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onCreateBinderClick}
                  className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.newBinderBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onManageGroupBinders(activeGroupSummary.group)}
                  className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.addBindersToGroupBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <p className="text-base font-medium text-stone-900 dark:text-stone-100 text-center">
                {t.emptyArchiveTitle}
              </p>
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed text-justify sm:text-center">
                {t.emptyArchiveDesc}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onCreateBinderClick}
                  className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.newBinderBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onCreateGroupClick}
                  className="min-h-[42px] px-3 py-2 rounded-[2px] glass-control text-xs font-medium text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <FolderPlus className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.newGroupBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
