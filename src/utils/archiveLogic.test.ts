import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFolderSummary,
  computeGroupSummary,
  deletePhotosByIds,
  filterAndSortFolders,
  filterAndSortGroups,
  formatArchiveDate,
  formatFileSize,
  movePhotosToFolder,
  removeGroupAndUngroupBinders,
  sanitizeExportFilename,
  stripLegacySeedRecords,
  syncGroupMembership,
  validateFolderName,
  validateGroupName,
} from './archiveLogic';
import type { BookFolder, GroupFolder, PhotoItem } from '../types/archive';

const sampleGroups: GroupFolder[] = [
  {
    id: 'g1',
    name: 'ဒီဇိုင်းနှင့် ဗိသုကာ စုစည်းမှု',
    createdAt: Date.UTC(2026, 9, 28),
    updatedAt: Date.UTC(2026, 9, 28),
  },
  {
    id: 'g2',
    name: 'ကဗျာနှင့် စာပေ',
    createdAt: Date.UTC(2026, 9, 18),
    updatedAt: Date.UTC(2026, 9, 18),
  },
];

const sampleFolders: BookFolder[] = [
  {
    id: 'f1',
    name: 'ဗိသုကာ ဒီဇိုင်းစံချိန်စံညွှန်းများ',
    createdAt: Date.UTC(2026, 9, 28),
    updatedAt: Date.UTC(2026, 9, 28),
    groupId: 'g1',
  },
  {
    id: 'f2',
    name: 'ကဗျာစုစည်းမှု စာအုပ်',
    createdAt: Date.UTC(2026, 9, 20),
    updatedAt: Date.UTC(2026, 9, 20),
    groupId: null,
  },
  {
    id: 'f3',
    name: 'Architecture Monograph',
    createdAt: Date.UTC(2026, 9, 25),
    updatedAt: Date.UTC(2026, 9, 25),
    groupId: 'g1',
  },
];

const samplePhotos: PhotoItem[] = [
  {
    id: 'p1',
    folderId: 'f1',
    name: 'page-01.jpg',
    mimeType: 'image/jpeg',
    createdAt: 1000,
    size: 1048576, // 1 MB
  },
  {
    id: 'p2',
    folderId: 'f1',
    name: 'page-02.jpg',
    mimeType: 'image/jpeg',
    createdAt: 2000,
    size: 524288, // 0.5 MB
  },
  {
    id: 'p3',
    folderId: 'f2',
    name: 'legacy-page.jpg',
    mimeType: 'image/jpeg',
    createdAt: 500,
  },
];

test('formatFileSize formats post-update sizes and returns null for legacy undefined sizes', () => {
  assert.equal(formatFileSize(null), null);
  assert.equal(formatFileSize(undefined), null);
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1572864), '1.5 MB');
});

test('computeFolderSummary and computeGroupSummary aggregate metrics accurately', () => {
  const binderSummaries = sampleFolders.map((f) => computeFolderSummary(f, samplePhotos));

  const g1Summary = computeGroupSummary(sampleGroups[0], binderSummaries);
  assert.equal(g1Summary.binderCount, 2); // f1 + f3
  assert.equal(g1Summary.photoCount, 2);
  assert.equal(g1Summary.knownTotalSize, 1572864);

  const g2Summary = computeGroupSummary(sampleGroups[1], binderSummaries);
  assert.equal(g2Summary.binderCount, 0);
  assert.equal(g2Summary.photoCount, 0);
  assert.equal(g2Summary.knownTotalSize, null);
});

test('filterAndSortFolders and filterAndSortGroups handle search and Myanmar collation', () => {
  const summaries = sampleFolders.map((f) => computeFolderSummary(f, samplePhotos));

  const byDate = filterAndSortFolders(summaries, '', 'date_desc');
  assert.deepEqual(
    byDate.map((s) => s.folder.id),
    ['f1', 'f3', 'f2']
  );

  const byName = filterAndSortFolders(summaries, '', 'name_asc');
  assert.deepEqual(
    byName.map((s) => s.folder.id),
    ['f2', 'f1', 'f3'] // Myanmar collation: က (f2) -> ဗ (f1) -> Latin A (f3)
  );

  const groupSummaries = sampleGroups.map((g) => computeGroupSummary(g, summaries));
  const groupsByName = filterAndSortGroups(groupSummaries, '', 'name_asc');
  assert.deepEqual(
    groupsByName.map((gs) => gs.group.id),
    ['g2', 'g1'] // က (g2) before ဒ (g1)
  );

  const searchedGroup = filterAndSortGroups(groupSummaries, 'ဗိသုကာ', 'date_desc');
  assert.equal(searchedGroup.length, 1);
  assert.equal(searchedGroup[0].group.id, 'g1');
});

test('validateFolderName and validateGroupName return localized errors in my and en', () => {
  const emptyMy = validateFolderName('   ', sampleFolders, undefined, 'my');
  assert.equal(emptyMy.valid, false);
  assert.match(emptyMy.error ?? '', /ထည့်သွင်းပေးပါ/);

  const emptyEn = validateFolderName('   ', sampleFolders, undefined, 'en');
  assert.equal(emptyEn.valid, false);
  assert.match(emptyEn.error ?? '', /Please enter/);

  const dupGroupEn = validateGroupName('ကဗျာနှင့် စာပေ', sampleGroups, undefined, 'en');
  assert.equal(dupGroupEn.valid, false);
  assert.match(dupGroupEn.error ?? '', /already exists/);

  const validGroup = validateGroupName('  သိပ္ပံစာအုပ်များ  ', sampleGroups, undefined, 'my');
  assert.equal(validGroup.valid, true);
  assert.equal(validGroup.trimmed, 'သိပ္ပံစာအုပ်များ');
});

test('syncGroupMembership and removeGroupAndUngroupBinders safely manage group assignments', () => {
  // Sync g1 so f2 joins g1 and f3 leaves g1
  const { updatedAll, changedRecords } = syncGroupMembership(
    sampleFolders,
    'g1',
    new Set(['f1', 'f2']),
    9999
  );
  assert.equal(updatedAll.find((f) => f.id === 'f1')?.groupId, 'g1');
  assert.equal(updatedAll.find((f) => f.id === 'f2')?.groupId, 'g1');
  assert.equal(updatedAll.find((f) => f.id === 'f3')?.groupId, null);
  assert.equal(changedRecords.length, 2); // f2 added, f3 removed

  // Deleting g1 removes g1 and returns f1 & f2 safely to root (groupId: null)
  const { nextGroups, nextFolders, ungroupedFolders } = removeGroupAndUngroupBinders(
    sampleGroups,
    updatedAll,
    'g1',
    12000
  );
  assert.equal(nextGroups.length, 1);
  assert.equal(nextGroups[0].id, 'g2');
  assert.equal(ungroupedFolders.length, 2);
  assert.ok(nextFolders.every((f) => f.groupId === null));
});

test('movePhotosToFolder, deletePhotosByIds, and sanitizeExportFilename work cleanly', () => {
  const moved = movePhotosToFolder(samplePhotos, new Set(['p1']), 'f3');
  assert.equal(moved.find((p) => p.id === 'p1')?.folderId, 'f3');

  const remaining = deletePhotosByIds(moved, new Set(['p1', 'p2']));
  assert.equal(remaining.length, 1);

  assert.equal(
    sanitizeExportFilename('ဗိသုကာ: အတွဲ (၁)/၂၀၂၆?'),
    'ဗိသုကာ- အတွဲ (၁)-၂၀၂၆-'
  );
  assert.equal(formatArchiveDate(Date.UTC(2026, 9, 28)), '28 Oct 2026');
});

test('backupLogic validates manifests, merges deduplicated data, and round-trips ZIP archives', async () => {
  const { validateAndNormalizeBackupManifest, mergeArchiveData } = await import('./backupLogic');
  const { createArchiveBackupZipBlob, parseArchiveBackupZip } = await import(
    '../services/backupService'
  );

  // 1. Reject invalid manifest payloads
  assert.equal(validateAndNormalizeBackupManifest({ format: 'wrong', version: 1 }).valid, false);
  assert.equal(validateAndNormalizeBackupManifest(null).valid, false);

  // 2. Round-trip full binary ZIP creation and parsing
  const binaryPhotos: PhotoItem[] = [
    {
      id: 'p-bin-1',
      folderId: 'f1',
      name: 'cover.jpg',
      mimeType: 'image/jpeg',
      createdAt: 5000,
      size: 4,
      blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
    },
  ];

  const { zipBlob, filename } = await createArchiveBackupZipBlob(
    { groups: sampleGroups, folders: sampleFolders, photos: binaryPhotos },
    Date.UTC(2026, 9, 28)
  );
  assert.equal(filename, 'data-management-backup-2026-10-28.zip');

  const parsed = await parseArchiveBackupZip(zipBlob);
  assert.equal(parsed.valid, true);
  if (parsed.valid) {
    assert.equal(parsed.snapshot.groups.length, 2);
    assert.equal(parsed.snapshot.folders.length, 3);
    assert.equal(parsed.snapshot.photos.length, 1);
    assert.equal(parsed.snapshot.photos[0].name, 'cover.jpg');
    assert.equal(parsed.snapshot.photos[0].size, 4);
  }

  // 3. Merge restores deleted items without duplicating existing groups/folders
  const partialCurrent = {
    groups: [sampleGroups[0]],
    folders: [sampleFolders[0]],
    photos: [],
  };
  const mergeRes = mergeArchiveData(partialCurrent, {
    groups: sampleGroups,
    folders: sampleFolders,
    photos: binaryPhotos,
  });
  assert.equal(mergeRes.addedGroups, 1);
  assert.equal(mergeRes.addedFolders, 2);
  assert.equal(mergeRes.addedPhotos, 1);
  assert.equal(mergeRes.merged.groups.length, 2);
  assert.equal(mergeRes.merged.folders.length, 3);
  assert.equal(mergeRes.merged.photos.length, 1);
});

test('blobToBase64 safely encodes multi-chunk binary payloads for Android WebView bridge', async () => {
  const { blobToBase64 } = await import('../services/nativeBridge');

  // 70,000 bytes (> 2 chunks of 32,768 bytes) with deterministic byte pattern
  const original = new Uint8Array(70000);
  for (let i = 0; i < original.length; i++) {
    original[i] = (i * 31 + 7) & 0xff;
  }

  const blob = new Blob([original.buffer], { type: 'application/octet-stream' });
  const encoded = await blobToBase64(blob);
  const decoded = Buffer.from(encoded, 'base64');

  assert.equal(decoded.length, original.length);
  assert.deepEqual(new Uint8Array(decoded), original);
});

test('streamingZip streams multi-slice binary photos and UTF-8 Myanmar paths into valid PKZIP archives', async () => {
  const JSZip = (await import('jszip')).default;
  const { createBrowserBlobSink, writeStreamingZip } = await import('./streamingZip');

  // Create a 1.3 MB payload (> 2 x 512 KB CRC slices) to exercise multi-slice streaming
  const largePayload = new Uint8Array(1_300_000);
  for (let i = 0; i < largePayload.length; i++) {
    largePayload[i] = (i * 17 + 13) & 0xff;
  }

  const progressSteps: number[] = [];
  const sink = createBrowserBlobSink();

  await writeStreamingZip(
    [
      {
        path: 'မြန်မာဖိုင်တွဲ/01-စာမျက်နှာ.jpg',
        modifiedAt: Date.UTC(2026, 9, 29),
        getData: () => new Blob([largePayload.buffer], { type: 'image/jpeg' }),
      },
      {
        path: 'manifest.json',
        modifiedAt: Date.UTC(2026, 9, 29),
        getData: () => new TextEncoder().encode(JSON.stringify({ ok: true })),
      },
    ],
    sink,
    (pct) => progressSteps.push(pct)
  );

  assert.equal(progressSteps[progressSteps.length - 1], 100);

  const zipBlob = sink.toBlob();
  const loaded = await JSZip.loadAsync(await zipBlob.arrayBuffer());

  const extractedPhoto = loaded.file('မြန်မာဖိုင်တွဲ/01-စာမျက်နှာ.jpg');
  assert.ok(extractedPhoto, 'UTF-8 Myanmar path must exist in ZIP central directory');
  const extractedBytes = new Uint8Array(await extractedPhoto.async('arraybuffer'));
  assert.equal(extractedBytes.length, largePayload.length);
  assert.deepEqual(extractedBytes, largePayload);

  const extractedManifest = await loaded.file('manifest.json')?.async('string');
  assert.equal(extractedManifest, '{"ok":true}');
});

test('formatAndroidPickedLocation formats SAF content URIs into readable phone storage paths', async () => {
  const { formatAndroidPickedLocation } = await import('../services/nativeBridge');

  assert.equal(
    formatAndroidPickedLocation(
      'content://com.android.externalstorage.documents/document/primary%3ADownload%2FMyBackups%2Fdata-backup.zip',
      'data-backup.zip'
    ),
    'Internal Storage/Download/MyBackups/data-backup.zip'
  );

  assert.equal(
    formatAndroidPickedLocation(
      'content://com.android.externalstorage.documents/document/1A2B-3C4D%3ABooks%2Farchive.zip',
      'archive.zip'
    ),
    'SD Card (1A2B-3C4D)/Books/archive.zip'
  );

  assert.equal(
    formatAndroidPickedLocation(
      'content://com.android.providers.downloads.documents/document/42',
      'backup.zip'
    ),
    'Downloads/backup.zip'
  );

  assert.equal(formatAndroidPickedLocation(undefined, 'backup.zip'), 'backup.zip');
});

test('openNativeExportSinkWithBridge streams chunks to selected storage location and handles cancel/abort', async () => {
  const JSZip = (await import('jszip')).default;
  const { openNativeExportSinkWithBridge } = await import('../services/nativeBridge');
  const { writeStreamingZip } = await import('./streamingZip');

  // 1. User cancels the phone storage location picker -> no writes, status = cancelled
  let writeCallsOnCancel = 0;
  const cancelledSession = await openNativeExportSinkWithBridge(
    {
      async openExportStream() {
        return { status: 'cancelled' };
      },
      async writeExportChunk() {
        writeCallsOnCancel++;
        return { written: 0 };
      },
      async closeExportStream() {
        return { status: 'closed' };
      },
      async abortExportStream() {
        return { status: 'aborted' };
      },
    },
    'backup.zip',
    'application/zip'
  );
  assert.equal(cancelledSession.status, 'cancelled');
  assert.equal(writeCallsOnCancel, 0);

  // 2. User picks a folder in Internal Storage -> streams multi-chunk binary ZIP cleanly
  const writtenChunks: Buffer[] = [];
  let closedCount = 0;
  const payload = new Uint8Array(900_000); // > 768 KB slice threshold
  for (let i = 0; i < payload.length; i++) {
    payload[i] = (i * 23 + 5) & 0xff;
  }

  const openedSession = await openNativeExportSinkWithBridge(
    {
      async openExportStream() {
        return {
          status: 'opened',
          streamId: 'stream-1',
          filename: 'custom-backup.zip',
          uri: 'content://com.android.externalstorage.documents/document/primary%3ADocuments%2Fcustom-backup.zip',
        };
      },
      async writeExportChunk({ streamId, data }) {
        assert.equal(streamId, 'stream-1');
        const buf = Buffer.from(data, 'base64');
        writtenChunks.push(buf);
        return { written: buf.length };
      },
      async closeExportStream({ streamId }) {
        assert.equal(streamId, 'stream-1');
        closedCount++;
        return { status: 'closed', filename: 'custom-backup.zip' };
      },
      async abortExportStream() {
        return { status: 'aborted' };
      },
    },
    'default-backup.zip',
    'application/zip'
  );

  assert.equal(openedSession.status, 'opened');
  if (openedSession.status === 'opened') {
    assert.equal(openedSession.filename, 'custom-backup.zip');
    assert.equal(openedSession.displayPath, 'Internal Storage/Documents/custom-backup.zip');

    await writeStreamingZip(
      [
        {
          path: 'photos/p1.jpg',
          getData: () => new Blob([payload.buffer], { type: 'image/jpeg' }),
        },
      ],
      openedSession.sink
    );
    await openedSession.finalize();

    assert.equal(closedCount, 1);
    assert.ok(writtenChunks.length >= 3, 'Expected multi-chunk streaming across 768 KB slices');

    const fullZipBuffer = Buffer.concat(writtenChunks);
    const parsedZip = await JSZip.loadAsync(fullZipBuffer);
    const extracted = new Uint8Array(await parsedZip.file('photos/p1.jpg')!.async('arraybuffer'));
    assert.deepEqual(extracted, payload);
  }

  // 3. Mid-stream write error aborts and cleans up incomplete file
  let abortedStreamId = '';
  const failingSession = await openNativeExportSinkWithBridge(
    {
      async openExportStream() {
        return { status: 'opened', streamId: 'stream-err', filename: 'fail.zip' };
      },
      async writeExportChunk() {
        throw new Error('Disk full');
      },
      async closeExportStream() {
        return { status: 'closed' };
      },
      async abortExportStream({ streamId }) {
        abortedStreamId = streamId;
        return { status: 'aborted' };
      },
    },
    'fail.zip',
    'application/zip'
  );

  assert.equal(failingSession.status, 'opened');
  if (failingSession.status === 'opened') {
    await assert.rejects(
      async () => {
        try {
          await failingSession.sink.writeBlob(new Blob([new Uint8Array([1, 2, 3])]));
        } catch (err) {
          await failingSession.abort();
          throw err;
        }
      },
      /Disk full/
    );
    assert.equal(abortedStreamId, 'stream-err');
  }
});

test('stripLegacySeedRecords removes pre-bundled seed items while preserving all user data', () => {
  // 1. Untouched legacy seed database becomes completely empty
  const legacyGroups: GroupFolder[] = [
    { id: 'seed-group-design', name: 'Seed Group', createdAt: 1, updatedAt: 1 },
  ];
  const legacyFolders: BookFolder[] = [
    { id: 'seed-folder-arch', name: 'Seed Arch', createdAt: 1, updatedAt: 1, groupId: 'seed-group-design' },
    { id: 'seed-folder-poetry', name: 'Seed Poetry', createdAt: 1, updatedAt: 1, groupId: null },
  ];
  const legacyPhotos = [
    { id: 'seed-photo-1', folderId: 'seed-folder-arch' },
    { id: 'seed-photo-4', folderId: 'seed-folder-poetry' },
  ];

  const cleaned = stripLegacySeedRecords(legacyGroups, legacyFolders, legacyPhotos);
  assert.equal(cleaned.groups.length, 0);
  assert.equal(cleaned.folders.length, 0);
  assert.equal(cleaned.photos.length, 0);
  assert.equal(cleaned.removedGroupIds.length, 1);
  assert.equal(cleaned.removedFolderIds.length, 2);
  assert.equal(cleaned.removedPhotoIds.length, 2);

  // 2. If user added their own photo inside seed-folder-arch, seed-folder-arch & seed-group-design stay intact!
  const mixedPhotos = [
    { id: 'seed-photo-1', folderId: 'seed-folder-arch' },
    { id: 'photo-user-99', folderId: 'seed-folder-arch' },
  ];
  const mixedCleaned = stripLegacySeedRecords(legacyGroups, legacyFolders, mixedPhotos);
  assert.equal(mixedCleaned.photos.length, 1);
  assert.equal(mixedCleaned.photos[0].id, 'photo-user-99');
  assert.deepEqual(
    mixedCleaned.folders.map((f) => f.id),
    ['seed-folder-arch']
  );
  assert.deepEqual(
    mixedCleaned.groups.map((g) => g.id),
    ['seed-group-design']
  );
});

test('TRANSLATIONS includes complete Myanmar and English strings for Database Reset', async () => {
  const { TRANSLATIONS } = await import('../i18n/translations');
  assert.match(TRANSLATIONS.my.confirmResetDbDesc(2, 3, 10), /ဖိုဒါလ် 2 ခု/);
  assert.match(TRANSLATIONS.my.confirmResetDbDesc(0, 0, 0), /မူလအသစ်အတိုင်း/);
  assert.match(TRANSLATIONS.en.confirmResetDbDesc(1, 2, 5), /1 folder, 2 binders, and 5 photos/);
  assert.match(TRANSLATIONS.en.confirmResetDbDesc(0, 0, 0), /empty state/);
});

test('zoomGesture computes focal-point two-finger pinch zoom, clamps pan bounds, and toggles double-tap zoom', async () => {
  const {
    clampZoomPan,
    computeDoubleTapZoomTransform,
    computePinchZoomTransform,
    getTouchDistance,
    getTouchMidpoint,
  } = await import('./zoomGesture');

  assert.equal(getTouchDistance({ x: 100, y: 100 }, { x: 180, y: 160 }), 100);
  assert.deepEqual(getTouchMidpoint({ x: 100, y: 200 }, { x: 200, y: 300 }), { x: 150, y: 250 });

  // 1. Pinching from 80px distance to 200px distance at center produces 2.5x zoom
  const centeredPinch = computePinchZoomTransform(
    {
      startDistance: 80,
      startScale: 1,
      startPanX: 0,
      startPanY: 0,
      startRelMidX: 0,
      startRelMidY: 0,
    },
    0,
    0,
    200,
    390,
    600
  );
  assert.equal(centeredPinch.scale, 2.5);
  assert.equal(centeredPinch.panX, 0);
  assert.equal(centeredPinch.panY, 0);

  // 2. Off-center pinch anchors the pinched book coordinate under the user's fingers
  const offCenterPinch = computePinchZoomTransform(
    {
      startDistance: 100,
      startScale: 1,
      startPanX: 0,
      startPanY: 0,
      startRelMidX: 40,
      startRelMidY: -50,
    },
    40,
    -50,
    200,
    400,
    600
  );
  assert.equal(offCenterPinch.scale, 2);
  assert.equal(offCenterPinch.panX, -40);
  assert.equal(offCenterPinch.panY, 50);

  // 3. Pan offsets are strictly clamped to stage bounds, and near-1x snaps cleanly back to 1x
  const clamped = clampZoomPan(2, 999, -999, 400, 600);
  assert.equal(clamped.scale, 2);
  assert.equal(clamped.panX, 200);
  assert.equal(clamped.panY, -300);

  const snapped = clampZoomPan(1.005, 45, -30, 400, 600);
  assert.deepEqual(snapped, { scale: 1, panX: 0, panY: 0 });

  // 4. Double-tap zooms in to 2.5x, and a second double-tap resets back to 1x
  const zoomedIn = computeDoubleTapZoomTransform({ scale: 1, panX: 0, panY: 0 }, 20, -30, 400, 600);
  assert.equal(zoomedIn.scale, 2.5);
  const zoomedOut = computeDoubleTapZoomTransform(zoomedIn, 20, -30, 400, 600);
  assert.deepEqual(zoomedOut, { scale: 1, panX: 0, panY: 0 });
});






