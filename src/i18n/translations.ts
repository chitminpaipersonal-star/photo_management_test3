import type { Language } from '../types/archive';

export interface AppStrings {
  // Navigation & Header
  navMainAria: string;
  navAll: string;
  navNewest: string;
  navByName: string;
  navSettings: string;
  newBinderBtn: string;
  newGroupBtn: string;
  shareBtn: string;

  // Masthead & Home
  archiveSummary: (groups: number, binders: number, photos: number) => string;
  groupDetailSummary: (binders: number, photos: number) => string;
  backToAllSpecs: string;
  searchPlaceholder: string;
  searchAria: string;
  clearSearchAria: string;
  sortAria: string;
  sortDateDesc: string;
  sortNameAsc: string;

  // Sections & Table Headers
  groupsSectionTitle: string;
  bindersSectionTitle: string;
  ungroupedBindersTitle: string;
  searchMatchedBindersTitle: string;
  colBinder: string;
  colPhotoCount: string;
  colFileSize: string;
  colCreatedDate: string;
  colActions: string;

  // Counts & Labels
  binderCountLabel: (n: number) => string;
  photoCountLabel: (n: number) => string;
  pageLabel: (n: number) => string;
  coverAlt: (name: string) => string;
  optionsForAria: (name: string) => string;
  addBindersToGroupBtn: string;

  // Empty States
  noSearchResultsTitle: (q: string) => string;
  noSearchResultsDesc: string;
  clearSearchBtn: string;
  emptyArchiveTitle: string;
  emptyArchiveDesc: string;
  emptyGroupTitle: string;
  emptyGroupDesc: string;
  emptyBinderTitle: string;
  emptyBinderDesc: string;

  // Folder / Binder Detail View
  cameraBtn: string;
  cameraLongBtn: string;
  cameraInputAria: string;
  galleryBtn: string;
  galleryLongBtn: string;
  galleryInputAria: string;
  photosSectionAria: string;
  selectedCountBanner: (n: number) => string;
  selectAllBtn: string;
  deselectAllBtn: string;
  doneBtn: string;
  tapPhotosHint: string;
  selectedFooterCount: (n: number) => string;
  moveBtn: string;
  deleteBtn: string;
  selectPhotoAria: (page: string, name: string) => string;
  viewPhotoAria: (page: string, name: string) => string;

  // Binder ⋯ Action Menu
  closeMenuAria: string;
  shareFolderTitle: string;
  shareFolderDesc: string;
  downloadZipTitle: string;
  downloadZipDesc: string;
  selectPhotosTitle: string;
  selectPhotosDesc: string;
  moveToGroupTitle: string;
  moveToGroupDesc: (currentGroupName: string | null) => string;
  renameBinderTitle: string;
  deleteBinderTitle: string;

  // Group ⋯ Action Menu
  manageGroupBindersTitle: string;
  manageGroupBindersDesc: string;
  renameGroupTitle: string;
  deleteGroupTitle: string;

  // Modals: Binder Create/Rename
  createBinderModalTitle: string;
  renameBinderModalTitle: string;
  binderNameLabel: string;
  binderNamePlaceholder: string;
  cancelBtn: string;
  createSubmitBtn: string;
  saveSubmitBtn: string;

  // Modals: Group Create/Rename/Manage/Assign
  createGroupModalTitle: string;
  renameGroupModalTitle: string;
  groupNameLabel: string;
  groupNamePlaceholder: string;
  optionalBindersLabel: string;
  manageBindersModalTitle: (groupName: string) => string;
  manageBindersModalDesc: string;
  noBindersAvailable: string;
  assignGroupModalTitle: string;
  assignGroupModalDesc: (binderName: string) => string;
  mainListOptionLabel: string;
  createAndAssignGroupBtn: string;
  backBtn: string;

  // Modals: Move Photos
  movePhotosModalTitle: string;
  movePhotosModalDesc: (n: number) => string;
  noOtherBindersDesc: string;
  createBinderAndMoveBtn: string;
  newBinderNameLabel: string;
  createAndMoveSubmitBtn: string;

  // Modals: Delete Confirmation
  confirmDeleteBinderTitle: (name: string) => string;
  confirmDeleteBinderDesc: (photoCount: number) => string;
  confirmDeleteGroupTitle: (name: string) => string;
  confirmDeleteGroupDesc: (binderCount: number) => string;
  confirmDeleteSelectedPhotosTitle: (n: number) => string;
  confirmDeleteSinglePhotoTitle: (page: number) => string;
  confirmDeletePhotosDesc: string;
  confirmResetDbTitle: string;
  confirmResetDbDesc: (groups: number, binders: number, photos: number) => string;
  confirmResetDbBtn: string;
  cancelDeleteBtn: string;
  confirmDeleteBtn: string;

  // Lightbox
  closeLightboxAria: string;
  prevPhotoAria: string;
  nextPhotoAria: string;
  downloadSingleBtn: string;
  resetZoomAria: string;

  // Settings Modal
  settingsTitle: string;
  settingsSubtitle: string;
  languageLabel: string;
  languageDesc: string;
  themeLabel: string;
  themeDesc: string;
  lightModeLabel: string;
  darkModeLabel: string;
  storageInfoLabel: string;
  storageInfoDesc: (groups: number, binders: number, photos: number) => string;
  backupSectionLabel: string;
  backupSectionDesc: string;
  exportBackupBtn: string;
  pickingLocationBtn: string;
  exportingBackupBtn: string;
  importBackupBtn: string;
  importInputAria: string;
  backupPreviewLabel: (filename: string) => string;
  backupPreviewSummary: (groups: number, binders: number, photos: number) => string;
  backupMergeBtn: string;
  backupReplaceBtn: string;
  errInvalidBackupFile: string;
  resetDbSectionLabel: string;
  resetDbSectionDesc: string;
  resetDbBtn: string;

  // Validation
  errEmptyBinderName: string;
  errLongName: string;
  errDuplicateBinderName: string;
  errEmptyGroupName: string;
  errDuplicateGroupName: string;

  // Toasts & Errors
  loadErrorFallback: string;
  retryBtn: string;
  toastBinderCreated: (name: string) => string;
  toastBinderRenamed: (name: string) => string;
  toastBinderDeleted: (name: string) => string;
  toastGroupCreated: (name: string) => string;
  toastGroupRenamed: (name: string) => string;
  toastGroupDeleted: (name: string) => string;
  toastGroupBindersUpdated: (name: string) => string;
  toastBinderMovedToGroup: (groupName: string | null) => string;
  toastInvalidImageType: string;
  toastPhotosAdded: (n: number) => string;
  toastFolderSharedNative: string;
  toastFolderSharedZip: string;
  toastFolderDownloadedFallback: string;
  toastShareError: string;
  toastZipDownloaded: (filename: string) => string;
  toastZipError: string;
  toastSingleSharedNative: string;
  toastSingleDownloadedFallback: string;
  toastSingleDownloaded: (page: number) => string;
  toastDownloadError: string;
  toastPhotosMoved: (n: number, destName: string) => string;
  toastBinderCreatedAndMoved: (name: string, n: number) => string;
  toastSinglePhotoDeleted: string;
  toastSelectedPhotosDeleted: (n: number) => string;
  toastSelectedSharedNative: (n: number) => string;
  toastSelectedDownloaded: (displayPath: string) => string;
  toastBackupExported: (filename: string) => string;
  toastBackupExportError: string;
  toastBackupMerged: (groups: number, binders: number, photos: number) => string;
  toastBackupReplaced: (groups: number, binders: number, photos: number) => string;
  toastDatabaseReset: string;
}

export const TRANSLATIONS: Record<Language, AppStrings> = {
  my: {
    navMainAria: 'ပင်မ လမ်းညွှန်',
    navAll: 'အားလုံး',
    navNewest: 'အသစ်ဆုံးအလိုက်',
    navByName: 'အမည်စဉ်အလိုက်',
    navSettings: 'ဆက်တင်များ',
    newBinderBtn: 'ဖိုင်တွဲအသစ်',
    newGroupBtn: 'ဖိုဒါလ်အသစ်',
    shareBtn: 'မျှဝေရန်',

    archiveSummary: (g, b, p) =>
      `ဖိုဒါလ် ${g} ခု · ဖိုင်တွဲ ${b} တွဲ · စုစုပေါင်း ${p} ပုံ`,
    groupDetailSummary: (b, p) => `ဖိုင်တွဲ ${b} တွဲ · စုစုပေါင်း ${p} ပုံ`,
    backToAllSpecs: 'Data Management',
    searchPlaceholder: 'ရှာဖွေရန်...',
    searchAria: 'ဖိုဒါလ် သို့မဟုတ် ဖိုင်တွဲအမည် ရှာဖွေရန်',
    clearSearchAria: 'ရှာဖွေမှု ရှင်းလင်းရန်',
    sortAria: 'စီစဉ်ပုံ ရွေးချယ်ရန်',
    sortDateDesc: 'ရက်စွဲ (အသစ်ဆုံး)',
    sortNameAsc: 'အမည်စဉ် (အက္ခရာစဉ်)',

    groupsSectionTitle: 'ဖိုဒါလ်များ (အုပ်စုများ)',
    bindersSectionTitle: 'ဖိုင်တွဲများ',
    ungroupedBindersTitle: 'ပင်မ ဖိုင်တွဲများ',
    searchMatchedBindersTitle: 'ရှာဖွေတွေ့ရှိသော ဖိုင်တွဲများ',
    colBinder: 'စာအုပ်ဖိုင်တွဲ',
    colPhotoCount: 'ပုံအရေအတွက်',
    colFileSize: 'ဖိုင်အရွယ်အစား',
    colCreatedDate: 'ဖန်တီးသည့်ရက်စွဲ',
    colActions: 'ရွေးချယ်စရာ',

    binderCountLabel: (n) => `ဖိုင်တွဲ ${n} တွဲ`,
    photoCountLabel: (n) => `${n} ပုံ`,
    pageLabel: (n) => `စာမျက်နှာ ${String(n).padStart(2, '0')}`,
    coverAlt: (name) => `${name} မျက်နှာဖုံးပုံအသေး`,
    optionsForAria: (name) => `${name} အတွက် ရွေးချယ်စရာများ`,
    addBindersToGroupBtn: 'ဖိုင်တွဲများ ထည့်သွင်းရန်',

    noSearchResultsTitle: (q) => `“${q}” နှင့် ကိုက်ညီသော အရာ မတွေ့ရှိပါ`,
    noSearchResultsDesc: 'အခြား စာလုံးဖြင့် ထပ်မံရှာဖွေပါ သို့မဟုတ် ရှာဖွေမှုကို ရှင်းလင်းပါ။',
    clearSearchBtn: 'ရှာဖွေမှု ရှင်းလင်းရန်',
    emptyArchiveTitle: 'ဖိုဒါလ်နှင့် ဖိုင်တွဲ မရှိသေးပါ',
    emptyArchiveDesc:
      'ဖိုဒါလ်တည်ဆောက်၍ အုပ်စုဖွဲ့သိမ်းဆည်းနိုင်သလို စာအုပ်အမည်ဖြင့် ဖိုင်တွဲအသစ် စတင်ဖန်တီးနိုင်ပါသည်။',
    emptyGroupTitle: 'ဤဖိုဒါလ်အတွင်း ဖိုင်တွဲ မရှိသေးပါ',
    emptyGroupDesc:
      'ဖိုင်တွဲအသစ် ဖန်တီးထည့်သွင်းနိုင်သလို ရှိပြီးသား ဖိုင်တွဲများကိုလည်း ရွေးချယ်ထည့်သွင်းနိုင်ပါသည်။',
    emptyBinderTitle: 'ဤဖိုင်တွဲတွင် ဓာတ်ပုံ မရှိသေးပါ',
    emptyBinderDesc:
      'ကင်မရာဖြင့် စာအုပ်စာမျက်နှာကို တိုက်ရိုက်ရိုက်ထည့်ပါ သို့မဟုတ် Gallery မှ ပုံများကို တစ်ပြိုင်နက် ရွေးထည့်နိုင်ပါသည်။',

    cameraBtn: 'ကင်မရာ',
    cameraLongBtn: 'ကင်မရာဖြင့် ရိုက်ရန်',
    cameraInputAria: 'ကင်မရာဖြင့် ဓာတ်ပုံရိုက်ထည့်ရန်',
    galleryBtn: 'ပုံများရွေးထည့်ရန်',
    galleryLongBtn: 'Gallery မှ ရွေးထည့်ရန်',
    galleryInputAria: 'Gallery မှ ဓာတ်ပုံများ ရွေးထည့်ရန်',
    photosSectionAria: 'စာအုပ်စာမျက်နှာ ဓာတ်ပုံများ',
    selectedCountBanner: (n) => `ရွေးချယ်ထားသည် — ${n} ပုံ`,
    selectAllBtn: 'အားလုံးရွေးရန်',
    deselectAllBtn: 'အားလုံးဖြုတ်ရန်',
    doneBtn: 'ပြီးပြီ',
    tapPhotosHint: 'ပုံများကို တို့၍ အမှတ်ခြစ်ပါ',
    selectedFooterCount: (n) => `${n} ပုံ ရွေးထားသည်`,
    moveBtn: 'ရွှေ့ရန်',
    deleteBtn: 'ဖျက်ရန်',
    selectPhotoAria: (page, name) => `${page} (${name}) ကို ရွေးချယ်ရန်`,
    viewPhotoAria: (page, name) => `${page} (${name}) အပြည့်ကြည့်ရန်`,

    closeMenuAria: 'မီနူးပိတ်ရန်',
    shareFolderTitle: 'မျှဝေရန်',
    shareFolderDesc: 'ပုံအားလုံး မျှဝေမည် · မရပါက ZIP ပြောင်းပေးမည်',
    downloadZipTitle: 'ဒေါင်းလုဒ် (ZIP)',
    downloadZipDesc: 'ဖိုင်တွဲတစ်ခုလုံးကို ZIP ဖိုင်အဖြစ် ဖုန်းအတွင်း နေရာရွေးချယ် သိမ်းဆည်းမည်',
    selectPhotosTitle: 'ပုံများရွေးချယ်ရန်',
    selectPhotosDesc: 'မျှဝေရန်၊ ဒေါင်းလုဒ်ဆွဲရန်၊ ရွှေ့ရန် သို့မဟုတ် ဖျက်ရန်',
    moveToGroupTitle: 'ဖိုဒါလ်သို့ ရွှေ့ရန် (အုပ်စုဖွဲ့ရန်)',
    moveToGroupDesc: (gName) =>
      gName ? `လက်ရှိ ဖိုဒါလ် — ${gName}` : 'လက်ရှိ — ပင်မစာမျက်နှာတွင် ထားရှိသည်',
    renameBinderTitle: 'ဖိုင်တွဲ အမည်ပြောင်းရန်',
    deleteBinderTitle: 'ဖိုင်တွဲ ဖျက်ရန်',

    manageGroupBindersTitle: 'ဖိုင်တွဲများ စီမံရန်',
    manageGroupBindersDesc: 'ဤဖိုဒါလ်အတွင်း ပါဝင်မည့် ဖိုင်တွဲများကို ရွေးချယ်မည်',
    renameGroupTitle: 'ဖိုဒါလ် အမည်ပြောင်းရန်',
    deleteGroupTitle: 'ဖိုဒါလ် ဖျက်ထုတ်ရန်',

    createBinderModalTitle: 'ဖိုင်တွဲအသစ် ဖန်တီးရန်',
    renameBinderModalTitle: 'ဖိုင်တွဲအမည် ပြောင်းရန်',
    binderNameLabel: 'စာအုပ်အမည် / ဖိုင်တွဲအမည်',
    binderNamePlaceholder: 'ဥပမာ — မြန်မာ့ဗိသုကာ လက်ရာများ',
    cancelBtn: 'မလုပ်တော့ပါ',
    createSubmitBtn: 'ဖန်တီးမည်',
    saveSubmitBtn: 'သိမ်းဆည်းမည်',

    createGroupModalTitle: 'ဖိုဒါလ်အသစ် တည်ဆောက်ရန်',
    renameGroupModalTitle: 'ဖိုဒါလ်အမည် ပြောင်းရန်',
    groupNameLabel: 'ဖိုဒါလ် (အုပ်စု) အမည်',
    groupNamePlaceholder: 'ဥပမာ — သမိုင်းနှင့် ယဉ်ကျေးမှု စာအုပ်များ',
    optionalBindersLabel: 'တစ်ပါတည်း ထည့်သွင်းမည့် ဖိုင်တွဲများ (ရွေးချယ်နိုင်သည်)',
    manageBindersModalTitle: (gName) => `“${gName}” အတွင်းရှိ ဖိုင်တွဲများ`,
    manageBindersModalDesc: 'ဤဖိုဒါလ်အတွင်း အုပ်စုဖွဲ့ထားလိုသော ဖိုင်တွဲများကို အမှတ်ခြစ်ပါ။',
    noBindersAvailable: 'ရွေးချယ်စရာ ဖိုင်တွဲ မရှိသေးပါ။',
    assignGroupModalTitle: 'ဖိုဒါလ် (အုပ်စု) ရွေးချယ်ရန်',
    assignGroupModalDesc: (bName) => `“${bName}” ကို ထားရှိမည့် ဖိုဒါလ် ရွေးပါ`,
    mainListOptionLabel: 'ပင်မစာမျက်နှာတွင်သာ ထားမည် (ဖိုဒါလ်မပါ)',
    createAndAssignGroupBtn: 'ဖိုဒါလ်အသစ် တည်ဆောက်ပြီး ရွှေ့မည်',
    backBtn: 'နောက်သို့',

    movePhotosModalTitle: 'အခြားဖိုင်တွဲသို့ ရွှေ့ရန်',
    movePhotosModalDesc: (n) => `ရွေးချယ်ထားသော ပုံ ${n} ပုံအတွက် ဖိုင်တွဲရွေးပါ`,
    noOtherBindersDesc: 'အခြားဖိုင်တွဲ မရှိသေးပါ။ အောက်တွင် ဖိုင်တွဲအသစ် ဖန်တီး၍ ရွှေ့နိုင်ပါသည်။',
    createBinderAndMoveBtn: 'ဖိုင်တွဲအသစ် ဖန်တီးပြီး ရွှေ့မည်',
    newBinderNameLabel: 'ဖိုင်တွဲအသစ် အမည်',
    createAndMoveSubmitBtn: 'ဖန်တီးပြီး ရွှေ့မည်',

    confirmDeleteBinderTitle: (name) => `“${name}” ဖိုင်တွဲကို ဖျက်မည်လား?`,
    confirmDeleteBinderDesc: (n) =>
      `ဤဖိုင်တွဲနှင့် အတွင်းရှိ ဓာတ်ပုံ ${n} ပုံလုံး အပြီးတိုင် ပျက်သွားပါမည်။ အရေးကြီးသော ပုံများ မဆုံးရှုံးစေရန် အတည်ပြုပေးပါ။`,
    confirmDeleteGroupTitle: (name) => `“${name}” ဖိုဒါလ်ကို ဖျက်ထုတ်မည်လား?`,
    confirmDeleteGroupDesc: (bCount) =>
      bCount > 0
        ? `ဤဖိုဒါလ်ကို ဖျက်ထုတ်ပါက အတွင်းရှိ ဖိုင်တွဲ ${bCount} တွဲနှင့် ဓာတ်ပုံများ ပျက်စီးမည်မဟုတ်ဘဲ ပင်မစာမျက်နှာသို့ ပြန်လည်ရောက်ရှိသွားပါမည်။`
        : 'ဤဖိုဒါလ်ကို အပြီးတိုင် ဖျက်ထုတ်ပါမည်။ သေချာပါသလား?',
    confirmDeleteSelectedPhotosTitle: (n) => `ရွေးချယ်ထားသော ပုံ ${n} ပုံကို ဖျက်မည်လား?`,
    confirmDeleteSinglePhotoTitle: (page) => `စာမျက်နှာ ${page} ဓာတ်ပုံကို ဖျက်မည်လား?`,
    confirmDeletePhotosDesc:
      'အရေးကြီးသော စာအုပ်ဓာတ်ပုံများ မှားယွင်းမဖျက်မိစေရန် အတည်ပြုပေးပါ။ ဖျက်ပြီးပါက ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ။',
    confirmResetDbTitle: 'ဒေတာဘေ့စ် တစ်ခုလုံးကို ရှင်းလင်းမည်လား?',
    confirmResetDbDesc: (g, b, p) =>
      g + b + p > 0
        ? `လက်ရှိ သိမ်းဆည်းထားသော ဖိုဒါလ် ${g} ခု၊ ဖိုင်တွဲ ${b} တွဲ နှင့် ဓာတ်ပုံ ${p} ပုံ အားလုံး အပြီးတိုင် ပျက်သွားပါမည်။ ရှင်းလင်းပြီးပါက ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ။`
        : 'ဒေတာဘေ့စ် အတွင်းရှိ အချက်အလက်အားလုံးကို အပြီးတိုင် ရှင်းလင်း၍ မူလအသစ်အတိုင်း ပြန်လည်သတ်မှတ်ပါမည်။ သေချာပါသလား?',
    confirmResetDbBtn: 'အားလုံး ရှင်းလင်းမည်',
    cancelDeleteBtn: 'မဖျက်တော့ပါ',
    confirmDeleteBtn: 'သေချာပါသည်၊ ဖျက်မည်',

    closeLightboxAria: 'ပုံအပြည့်ကြည့်ခြင်း ပိတ်ရန်',
    prevPhotoAria: 'ရှေ့တစ်ပုံ ကြည့်ရန်',
    nextPhotoAria: 'နောက်တစ်ပုံ ကြည့်ရန်',
    downloadSingleBtn: 'ဒေါင်းလုဒ်',
    resetZoomAria: 'မူလအရွယ်အစားသို့ ပြန်ထားရန်',

    settingsTitle: 'ဆက်တင်များ',
    settingsSubtitle: 'ဘာသာစကားနှင့် အလင်းအမှောင် စိတ်ကြိုက်ပြင်ဆင်မှု',
    languageLabel: 'ဘာသာစကား (Language)',
    languageDesc: 'အက်ပ်တစ်ခုလုံးတွင် အသုံးပြုမည့် ဘာသာစကားကို ရွေးချယ်ပါ။',
    themeLabel: 'အလင်းအမှောင်စနစ် (Appearance)',
    themeDesc: 'မျက်စိသက်သာစေမည့် အလင်းမုဒ် သို့မဟုတ် အမှောင်မုဒ်ကို ရွေးချယ်ပါ။',
    lightModeLabel: 'အလင်းမုဒ်',
    darkModeLabel: 'အမှောင်မုဒ်',
    storageInfoLabel: 'သိမ်းဆည်းမှုနှင့် ဒေတာ အရန်သိမ်းစနစ် (Backup & Restore)',
    storageInfoDesc: (g, b, p) =>
      `ဤစက်အတွင်း ဖိုဒါလ် ${g} ခု၊ ဖိုင်တွဲ ${b} တွဲ နှင့် ဓာတ်ပုံ ${p} ပုံ သိမ်းဆည်းထားပါသည်။`,
    backupSectionLabel: 'ဒေတာ မပျောက်ပျက်စေရန် ZIP ဖြင့် သိမ်းဆည်းမှု',
    backupSectionDesc:
      'ဖိုဒါလ်များ၊ ဖိုင်တွဲများနှင့် ဓာတ်ပုံအားလုံးကို ZIP ဖိုင်အဖြစ် ဖုန်းအတွင်း မိမိနှစ်သက်ရာ ဖိုဒါနေရာကို ရွေးချယ်သိမ်းဆည်းနိုင်ပြီး လိုအပ်သည့်အချိန် ပြန်လည်သွင်းယူနိုင်ပါသည်။',
    exportBackupBtn: 'Export (ZIP)',
    pickingLocationBtn: 'နေရာရွေးနေသည်...',
    exportingBackupBtn: 'သိမ်းဆည်းနေသည်...',
    importBackupBtn: 'Import (ZIP)',
    importInputAria: 'Backup ZIP ဖိုင် ရွေးချယ်၍ ပြန်သွင်းရန်',
    backupPreviewLabel: (fn) => `ရွေးချယ်ထားသော ဖိုင် — ${fn}`,
    backupPreviewSummary: (g, b, p) =>
      `ပါဝင်သော ဒေတာ — ဖိုဒါလ် ${g} ခု · ဖိုင်တွဲ ${b} တွဲ · ဓာတ်ပုံ ${p} ပုံ`,
    backupMergeBtn: 'လက်ရှိဒေတာနှင့် ပေါင်းထည့်မည်',
    backupReplaceBtn: 'အားလုံး အစားထိုးမည်',
    errInvalidBackupFile:
      'ရွေးချယ်ထားသော ဖိုင်သည် မှန်ကန်သော Data Management Backup (.zip) ဖိုင် မဟုတ်ပါ။',
    resetDbSectionLabel: 'ဒေတာဘေ့စ် အားလုံး ရှင်းလင်းစနစ် (Reset Database)',
    resetDbSectionDesc:
      'အက်ပ်အတွင်း သိမ်းဆည်းထားသော ဖိုဒါလ်များ၊ ဖိုင်တွဲများနှင့် ဓာတ်ပုံအားလုံးကို အပြီးတိုင် ဖျက်ထုတ်၍ မူလအသစ်အတိုင်း ပြန်လည်ရှင်းလင်းပေးပါမည်။ မရှင်းလင်းမီ လိုအပ်ပါက အပေါ်တွင် Export (ZIP) ဖြင့် အရန်သိမ်းဆည်းထားနိုင်ပါသည်။',
    resetDbBtn: 'ဒေတာဘေ့စ် အားလုံး ရှင်းလင်းမည်',

    errEmptyBinderName: 'စာအုပ် သို့မဟုတ် ဖိုင်တွဲအမည် ထည့်သွင်းပေးပါ။',
    errLongName: 'အမည် အလွန်ရှည်လွန်းနေပါသည် (အများဆုံး စာလုံး ၁၂၀)။',
    errDuplicateBinderName: 'ဤဖိုင်တွဲအမည် ရှိပြီးသားဖြစ်နေပါသည်။ အခြားအမည်တစ်ခု ပေးပါ။',
    errEmptyGroupName: 'ဖိုဒါလ် (အုပ်စု) အမည် ထည့်သွင်းပေးပါ။',
    errDuplicateGroupName: 'ဤဖိုဒါလ်အမည် ရှိပြီးသားဖြစ်နေပါသည်။ အခြားအမည်တစ်ခု ပေးပါ။',

    loadErrorFallback: 'ဒေတာဖတ်ရှုရာတွင် အမှားဖြစ်ပေါ်နေပါသည်။',
    retryBtn: 'ပြန်လည်စတင်ရန်',
    toastBinderCreated: (name) => `“${name}” ဖိုင်တွဲ ဖန်တီးပြီးပါပြီ။`,
    toastBinderRenamed: (name) => `“${name}” သို့ အမည်ပြောင်းပြီးပါပြီ။`,
    toastBinderDeleted: (name) => `“${name}” ဖိုင်တွဲကို ဖျက်ပြီးပါပြီ။`,
    toastGroupCreated: (name) => `“${name}” ဖိုဒါလ် တည်ဆောက်ပြီးပါပြီ။`,
    toastGroupRenamed: (name) => `ဖိုဒါလ်အမည်ကို “${name}” သို့ ပြောင်းပြီးပါပြီ။`,
    toastGroupDeleted: (name) => `“${name}” ဖိုဒါလ်ကို ဖျက်ထုတ်ပြီးပါပြီ။`,
    toastGroupBindersUpdated: (name) => `“${name}” အတွင်းရှိ ဖိုင်တွဲများ သိမ်းဆည်းပြီးပါပြီ။`,
    toastBinderMovedToGroup: (gName) =>
      gName
        ? `“${gName}” ဖိုဒါလ်အတွင်းသို့ ရွှေ့ပြောင်းပြီးပါပြီ။`
        : 'ပင်မစာမျက်နှာသို့ ပြန်လည်ထားရှိပြီးပါပြီ။',
    toastInvalidImageType: 'ဓာတ်ပုံဖိုင်များကိုသာ ရွေးချယ်ပေးပါ။',
    toastPhotosAdded: (n) => `ဓာတ်ပုံ ${n} ပုံ ထည့်သွင်းပြီးပါပြီ။`,
    toastFolderSharedNative: 'ဖိုင်တွဲရှိ ပုံအားလုံးကို မျှဝေပြီးပါပြီ။',
    toastFolderSharedZip: 'ZIP ဖိုင်အဖြစ် ပြောင်းလဲ၍ မျှဝေပေးထားပါသည်။',
    toastFolderDownloadedFallback: 'Share sheet မရနိုင်သဖြင့် ZIP ဖိုင်အဖြစ် ဒေါင်းလုဒ်ဆွဲပေးထားပါသည်။',
    toastShareError: 'ဖိုင်တွဲ မျှဝေရာတွင် အခက်အခဲရှိနေပါသည်။',
    toastZipDownloaded: (fn) => `${fn} ကို သိမ်းဆည်းပြီးပါပြီ။`,
    toastZipError: 'ZIP ဖိုင်ပြုလုပ်ရာတွင် အမှားဖြစ်ပေါ်နေပါသည်။',
    toastSingleSharedNative: 'ဓာတ်ပုံကို မျှဝေပြီးပါပြီ။',
    toastSingleDownloadedFallback:
      'Share sheet မရနိုင်သဖြင့် ပုံကို တိုက်ရိုက် သိမ်းဆည်းပေးထားပါသည်။',
    toastSingleDownloaded: (page) => `စာမျက်နှာ ${page} ကို သိမ်းဆည်းပြီးပါပြီ။`,
    toastDownloadError: 'ဖိုင်သိမ်းဆည်း၍ မရပါ။',
    toastPhotosMoved: (n, dest) => `ပုံ ${n} ပုံကို “${dest}” သို့ ရွှေ့ပြီးပါပြီ။`,
    toastBinderCreatedAndMoved: (name, n) => `“${name}” ဖန်တီးပြီး ပုံ ${n} ပုံ ရွှေ့ပြီးပါပြီ။`,
    toastSinglePhotoDeleted: 'ဓာတ်ပုံကို ဖျက်ပြီးပါပြီ။',
    toastSelectedPhotosDeleted: (n) => `ရွေးချယ်ထားသော ပုံ ${n} ပုံကို ဖျက်ပြီးပါပြီ။`,
    toastSelectedSharedNative: (n) => `ရွေးချယ်ထားသော ပုံ ${n} ပုံကို မျှဝေပြီးပါပြီ။`,
    toastSelectedDownloaded: (fn) => `ရွေးချယ်ထားသော ပုံများကို (${fn}) သိမ်းဆည်းပြီးပါပြီ။`,
    toastBackupExported: (fn) => `Backup ဖိုင် (${fn}) ကို သိမ်းဆည်းပြီးပါပြီ။`,
    toastBackupExportError: 'Backup ဖိုင် ထုတ်ယူရာတွင် အမှားဖြစ်ပေါ်နေပါသည်။',
    toastBackupMerged: (g, b, p) =>
      `ပေါင်းထည့်ပြီးပါပြီ (ဖိုဒါလ် +${g}၊ ဖိုင်တွဲ +${b}၊ ပုံ +${p})။`,
    toastBackupReplaced: (g, b, p) =>
      `Backup ဒေတာ ပြန်သွင်းပြီးပါပြီ (ဖိုဒါလ် ${g}၊ ဖိုင်တွဲ ${b}၊ ပုံ ${p})။`,
    toastDatabaseReset: 'ဒေတာဘေ့စ် တစ်ခုလုံးကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။',
  },

  en: {
    navMainAria: 'Primary navigation',
    navAll: 'All',
    navNewest: 'Newest',
    navByName: 'By Name',
    navSettings: 'Settings',
    newBinderBtn: 'New Binder',
    newGroupBtn: 'New Folder',
    shareBtn: 'Share',

    archiveSummary: (g, b, p) =>
      `${g} ${g === 1 ? 'Folder' : 'Folders'} · ${b} ${b === 1 ? 'Binder' : 'Binders'} · ${p} ${p === 1 ? 'Photo' : 'Photos'}`,
    groupDetailSummary: (b, p) =>
      `${b} ${b === 1 ? 'Binder' : 'Binders'} · ${p} ${p === 1 ? 'Photo' : 'Photos'}`,
    backToAllSpecs: 'Data Management',
    searchPlaceholder: 'Search archive...',
    searchAria: 'Search folder or binder name',
    clearSearchAria: 'Clear search',
    sortAria: 'Sort order',
    sortDateDesc: 'Date (Newest)',
    sortNameAsc: 'Name (A–Z)',

    groupsSectionTitle: 'Folders (Groups)',
    bindersSectionTitle: 'Binders',
    ungroupedBindersTitle: 'Unfiled Binders',
    searchMatchedBindersTitle: 'Matching Binders',
    colBinder: 'Book Binder',
    colPhotoCount: 'Photos',
    colFileSize: 'File Size',
    colCreatedDate: 'Created',
    colActions: 'Actions',

    binderCountLabel: (n) => `${n} ${n === 1 ? 'binder' : 'binders'}`,
    photoCountLabel: (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
    pageLabel: (n) => `Page ${String(n).padStart(2, '0')}`,
    coverAlt: (name) => `${name} cover thumbnail`,
    optionsForAria: (name) => `More options for ${name}`,
    addBindersToGroupBtn: 'Add Binders',

    noSearchResultsTitle: (q) => `No matches found for “${q}”`,
    noSearchResultsDesc: 'Try a different keyword or clear the search filter.',
    clearSearchBtn: 'Clear Search',
    emptyArchiveTitle: 'No folders or binders yet',
    emptyArchiveDesc:
      'Create a group folder to organize collections, or start a new book binder directly.',
    emptyGroupTitle: 'No binders in this folder yet',
    emptyGroupDesc:
      'Create a new book binder here or add existing binders from your archive.',
    emptyBinderTitle: 'No photos in this binder yet',
    emptyBinderDesc:
      'Capture pages directly with your camera or select multiple images at once from your gallery.',

    cameraBtn: 'Camera',
    cameraLongBtn: 'Take Photo',
    cameraInputAria: 'Capture photo with camera',
    galleryBtn: 'Add Photos',
    galleryLongBtn: 'Choose from Gallery',
    galleryInputAria: 'Select multiple photos from gallery',
    photosSectionAria: 'Book page photographs',
    selectedCountBanner: (n) => `Selected — ${n} ${n === 1 ? 'photo' : 'photos'}`,
    selectAllBtn: 'Select All',
    deselectAllBtn: 'Clear All',
    doneBtn: 'Done',
    tapPhotosHint: 'Tap photos to select',
    selectedFooterCount: (n) => `${n} selected`,
    moveBtn: 'Move',
    deleteBtn: 'Delete',
    selectPhotoAria: (page, name) => `Select ${page} (${name})`,
    viewPhotoAria: (page, name) => `View ${page} (${name}) full screen`,

    closeMenuAria: 'Close menu',
    shareFolderTitle: 'Share',
    shareFolderDesc: 'Share all photos at once · auto-converts to ZIP if needed',
    downloadZipTitle: 'Download (ZIP)',
    downloadZipDesc: 'Choose a folder on your device to save the entire binder as a ZIP archive',
    selectPhotosTitle: 'Select Photos',
    selectPhotosDesc: 'Share, download, move, or delete selected photos',
    moveToGroupTitle: 'Move to Folder (Group)',
    moveToGroupDesc: (gName) =>
      gName ? `Current folder — ${gName}` : 'Currently in Main List (ungrouped)',
    renameBinderTitle: 'Rename Binder',
    deleteBinderTitle: 'Delete Binder',

    manageGroupBindersTitle: 'Manage Binders',
    manageGroupBindersDesc: 'Choose which book binders belong in this folder',
    renameGroupTitle: 'Rename Folder',
    deleteGroupTitle: 'Delete Folder',

    createBinderModalTitle: 'Create New Binder',
    renameBinderModalTitle: 'Rename Binder',
    binderNameLabel: 'Book / Binder Name',
    binderNamePlaceholder: 'e.g. Architectural Specifications Vol. II',
    cancelBtn: 'Cancel',
    createSubmitBtn: 'Create',
    saveSubmitBtn: 'Save',

    createGroupModalTitle: 'Create New Folder',
    renameGroupModalTitle: 'Rename Folder',
    groupNameLabel: 'Folder (Group) Name',
    groupNamePlaceholder: 'e.g. Design & Print Reference',
    optionalBindersLabel: 'Include existing binders (optional)',
    manageBindersModalTitle: (gName) => `Binders in “${gName}”`,
    manageBindersModalDesc: 'Check the book binders you want grouped inside this folder.',
    noBindersAvailable: 'No book binders available yet.',
    assignGroupModalTitle: 'Move Binder to Folder',
    assignGroupModalDesc: (bName) => `Choose a parent folder for “${bName}”`,
    mainListOptionLabel: 'Main List (No Parent Folder)',
    createAndAssignGroupBtn: 'Create New Folder & Move',
    backBtn: 'Back',

    movePhotosModalTitle: 'Move to Another Binder',
    movePhotosModalDesc: (n) => `Choose destination binder for ${n} selected ${n === 1 ? 'photo' : 'photos'}`,
    noOtherBindersDesc: 'No other binders exist yet. Create a new binder below to move them.',
    createBinderAndMoveBtn: 'Create New Binder & Move',
    newBinderNameLabel: 'New Binder Name',
    createAndMoveSubmitBtn: 'Create & Move',

    confirmDeleteBinderTitle: (name) => `Delete binder “${name}”?`,
    confirmDeleteBinderDesc: (n) =>
      `This binder and all ${n} ${n === 1 ? 'photo' : 'photos'} inside it will be permanently deleted. Please confirm so important pages are not lost.`,
    confirmDeleteGroupTitle: (name) => `Delete folder “${name}”?`,
    confirmDeleteGroupDesc: (bCount) =>
      bCount > 0
        ? `Deleting this folder will keep all ${bCount} ${bCount === 1 ? 'binder' : 'binders'} and their photos safe, returning them to the main list.`
        : 'This empty folder will be permanently removed.',
    confirmDeleteSelectedPhotosTitle: (n) => `Delete ${n} selected ${n === 1 ? 'photo' : 'photos'}?`,
    confirmDeleteSinglePhotoTitle: (page) => `Delete Page ${page} photo?`,
    confirmDeletePhotosDesc:
      'Please confirm deletion to avoid accidentally removing important book pages. This action cannot be undone.',
    confirmResetDbTitle: 'Reset entire database?',
    confirmResetDbDesc: (g, b, p) =>
      g + b + p > 0
        ? `All ${g} ${g === 1 ? 'folder' : 'folders'}, ${b} ${b === 1 ? 'binder' : 'binders'}, and ${p} ${p === 1 ? 'photo' : 'photos'} currently stored on this device will be permanently deleted. This action cannot be undone.`
        : 'All database records will be permanently cleared and reset to an empty state. Are you sure?',
    confirmResetDbBtn: 'Confirm Reset',
    cancelDeleteBtn: 'Keep',
    confirmDeleteBtn: 'Confirm Delete',

    closeLightboxAria: 'Close full-screen viewer',
    prevPhotoAria: 'Previous photo',
    nextPhotoAria: 'Next photo',
    downloadSingleBtn: 'Download',
    resetZoomAria: 'Reset zoom to 100%',

    settingsTitle: 'Settings',
    settingsSubtitle: 'Configure application language and visual appearance',
    languageLabel: 'Language',
    languageDesc: 'Choose your preferred interface language.',
    themeLabel: 'Appearance',
    themeDesc: 'Switch between archival paper light mode and dark mode.',
    lightModeLabel: 'Light',
    darkModeLabel: 'Dark',
    storageInfoLabel: 'Backup & Restore Archive',
    storageInfoDesc: (g, b, p) =>
      `Currently storing ${g} ${g === 1 ? 'folder' : 'folders'}, ${b} ${b === 1 ? 'binder' : 'binders'}, and ${p} ${p === 1 ? 'photo' : 'photos'} on this device.`,
    backupSectionLabel: 'Full ZIP Backup & Import',
    backupSectionDesc:
      'Choose any folder on your device to save all folders, binders, and photos as a portable ZIP backup file, and import it anytime to restore.',
    exportBackupBtn: 'Export (.zip)',
    pickingLocationBtn: 'Choosing folder...',
    exportingBackupBtn: 'Saving...',
    importBackupBtn: 'Import (.zip)',
    importInputAria: 'Select a Backup ZIP file to import',
    backupPreviewLabel: (fn) => `Selected backup — ${fn}`,
    backupPreviewSummary: (g, b, p) =>
      `Contains ${g} ${g === 1 ? 'folder' : 'folders'} · ${b} ${b === 1 ? 'binder' : 'binders'} · ${p} ${p === 1 ? 'photo' : 'photos'}`,
    backupMergeBtn: 'Merge with Existing',
    backupReplaceBtn: 'Replace All Data',
    errInvalidBackupFile:
      'The selected file is not a valid Data Management backup (.zip) archive.',
    resetDbSectionLabel: 'Reset Entire Database',
    resetDbSectionDesc:
      'Permanently erase all folders, binders, and photos stored in this app and restore a clean empty database. Export a ZIP backup above first if you want to keep a copy.',
    resetDbBtn: 'Reset All Database Data',

    errEmptyBinderName: 'Please enter a book or binder name.',
    errLongName: 'Name is too long (maximum 120 characters).',
    errDuplicateBinderName: 'A binder with this name already exists.',
    errEmptyGroupName: 'Please enter a folder name.',
    errDuplicateGroupName: 'A folder with this name already exists.',

    loadErrorFallback: 'Failed to load archive data from local storage.',
    retryBtn: 'Reload',
    toastBinderCreated: (name) => `Created binder “${name}”.`,
    toastBinderRenamed: (name) => `Renamed binder to “${name}”.`,
    toastBinderDeleted: (name) => `Deleted binder “${name}”.`,
    toastGroupCreated: (name) => `Created folder “${name}”.`,
    toastGroupRenamed: (name) => `Renamed folder to “${name}”.`,
    toastGroupDeleted: (name) => `Deleted folder “${name}”.`,
    toastGroupBindersUpdated: (name) => `Updated binders in “${name}”.`,
    toastBinderMovedToGroup: (gName) =>
      gName ? `Moved binder into “${gName}”.` : 'Moved binder back to Main List.',
    toastInvalidImageType: 'Please select valid image files only.',
    toastPhotosAdded: (n) => `Added ${n} ${n === 1 ? 'photo' : 'photos'}.`,
    toastFolderSharedNative: 'Shared all photos in the binder.',
    toastFolderSharedZip: 'Converted binder to ZIP and shared.',
    toastFolderDownloadedFallback: 'Share sheet unavailable — downloaded binder as ZIP instead.',
    toastShareError: 'Unable to share binder.',
    toastZipDownloaded: (fn) => `Saved ${fn}.`,
    toastZipError: 'Failed to generate ZIP archive.',
    toastSingleSharedNative: 'Photo shared.',
    toastSingleDownloadedFallback: 'Share sheet unavailable — saved photo directly.',
    toastSingleDownloaded: (page) => `Saved Page ${page}.`,
    toastDownloadError: 'Unable to save file.',
    toastPhotosMoved: (n, dest) => `Moved ${n} ${n === 1 ? 'photo' : 'photos'} to “${dest}”.`,
    toastBinderCreatedAndMoved: (name, n) =>
      `Created “${name}” and moved ${n} ${n === 1 ? 'photo' : 'photos'}.`,
    toastSinglePhotoDeleted: 'Photo deleted.',
    toastSelectedPhotosDeleted: (n) => `Deleted ${n} selected ${n === 1 ? 'photo' : 'photos'}.`,
    toastSelectedSharedNative: (n) => `Shared ${n} selected ${n === 1 ? 'photo' : 'photos'}.`,
    toastSelectedDownloaded: (fn) => `Saved selected photos (${fn}).`,
    toastBackupExported: (fn) => `Saved backup (${fn}) to local storage.`,
    toastBackupExportError: 'Failed to export backup archive.',
    toastBackupMerged: (g, b, p) =>
      `Backup merged (+${g} folders, +${b} binders, +${p} photos).`,
    toastBackupReplaced: (g, b, p) =>
      `Restored backup (${g} folders, ${b} binders, ${p} photos).`,
    toastDatabaseReset: 'Database has been completely reset.',
  },
};
