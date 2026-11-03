package com.datamanagement.archive;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Android Storage Access Framework (SAF) streaming export plugin.
 * Launches Intent.ACTION_CREATE_DOCUMENT so the user selects any destination folder
 * in their phone's local storage (Internal Storage, Downloads, Documents, SD Card, etc.)
 * and streams chunks directly to that file without ever invoking the Share sheet.
 */
@CapacitorPlugin(name = "StorageExport")
public class StorageExportPlugin extends Plugin {

    private static final int STREAM_BUFFER_BYTES = 256 * 1024;
    private static final String KEY_PENDING_FILENAME = "_export_fallback_filename";

    private static final class ActiveStreamSession {
        final Uri uri;
        final File legacyFile;
        final OutputStream outputStream;
        final String filename;
        final boolean isPendingMediaStore;

        ActiveStreamSession(
            Uri uri,
            File legacyFile,
            OutputStream outputStream,
            String filename,
            boolean isPendingMediaStore
        ) {
            this.uri = uri;
            this.legacyFile = legacyFile;
            this.outputStream = outputStream;
            this.filename = filename;
            this.isPendingMediaStore = isPendingMediaStore;
        }
    }

    private final Map<String, ActiveStreamSession> sessions = new ConcurrentHashMap<>();
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private final Map<String, String> requestedFilenames = new ConcurrentHashMap<>();

    @PluginMethod
    public void openExportStream(PluginCall call) {
        String rawFilename = call.getString("filename", "data-management-backup.zip");
        final String filename = (rawFilename == null || rawFilename.trim().isEmpty())
            ? "data-management-backup.zip"
            : rawFilename.trim();

        String rawMime = call.getString("mimeType", "application/octet-stream");
        final String mimeType = (rawMime == null || rawMime.trim().isEmpty())
            ? "application/octet-stream"
            : rawMime.trim();

        requestedFilenames.put(call.getCallbackId(), filename);

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        try {
            startActivityForResult(call, intent, "handleCreateDocumentResult");
        } catch (ActivityNotFoundException ex) {
            requestedFilenames.remove(call.getCallbackId());
            openDirectDownloadsFallback(call, filename, mimeType);
        }
    }

    @ActivityCallback
    private void handleCreateDocumentResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        final String fallbackFilename = requestedFilenames.remove(call.getCallbackId());
        final String defaultName = (fallbackFilename != null && !fallbackFilename.isEmpty())
            ? fallbackFilename
            : call.getString(KEY_PENDING_FILENAME, "data-management-backup.zip");

        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject cancelled = new JSObject();
            cancelled.put("status", "cancelled");
            call.resolve(cancelled);
            return;
        }

        Intent dataIntent = result.getData();
        final Uri targetUri = dataIntent != null ? dataIntent.getData() : null;
        if (targetUri == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("status", "cancelled");
            call.resolve(cancelled);
            return;
        }

        ioExecutor.execute(() -> {
            try {
                ContentResolver resolver = getContext().getContentResolver();
                OutputStream rawOut = resolver.openOutputStream(targetUri);
                if (rawOut == null) {
                    call.reject("Unable to open output stream for selected storage location.");
                    return;
                }

                OutputStream bufferedOut = new BufferedOutputStream(rawOut, STREAM_BUFFER_BYTES);
                String actualFilename = queryDisplayName(resolver, targetUri, defaultName);
                String streamId = UUID.randomUUID().toString();

                sessions.put(
                    streamId,
                    new ActiveStreamSession(targetUri, null, bufferedOut, actualFilename, false)
                );

                JSObject res = new JSObject();
                res.put("status", "opened");
                res.put("streamId", streamId);
                res.put("filename", actualFilename);
                res.put("uri", targetUri.toString());
                call.resolve(res);
            } catch (Exception err) {
                call.reject("Failed to open selected storage file: " + err.getMessage(), err);
            }
        });
    }

    /**
     * Fallback strictly for stripped Android ROMs lacking DocumentsUI:
     * writes directly into public Local Storage Download/ folder without opening Share.
     */
    @SuppressWarnings("deprecation")
    private void openDirectDownloadsFallback(
        final PluginCall call,
        final String filename,
        final String mimeType
    ) {
        ioExecutor.execute(() -> {
            try {
                ContentResolver resolver = getContext().getContentResolver();
                String streamId = UUID.randomUUID().toString();

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (itemUri == null) {
                        call.reject("Unable to create file in Downloads storage.");
                        return;
                    }

                    OutputStream rawOut = resolver.openOutputStream(itemUri);
                    if (rawOut == null) {
                        resolver.delete(itemUri, null, null);
                        call.reject("Unable to open Downloads output stream.");
                        return;
                    }

                    OutputStream bufferedOut = new BufferedOutputStream(rawOut, STREAM_BUFFER_BYTES);
                    sessions.put(
                        streamId,
                        new ActiveStreamSession(itemUri, null, bufferedOut, filename, true)
                    );

                    JSObject res = new JSObject();
                    res.put("status", "opened");
                    res.put("streamId", streamId);
                    res.put("filename", filename);
                    res.put("uri", "Downloads/" + filename);
                    call.resolve(res);
                    return;
                }

                File downloadsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS
                );
                if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
                    downloadsDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                }
                File outFile = new File(downloadsDir, filename);
                OutputStream bufferedOut = new BufferedOutputStream(
                    new FileOutputStream(outFile, false),
                    STREAM_BUFFER_BYTES
                );
                sessions.put(
                    streamId,
                    new ActiveStreamSession(null, outFile, bufferedOut, filename, false)
                );

                JSObject res = new JSObject();
                res.put("status", "opened");
                res.put("streamId", streamId);
                res.put("filename", filename);
                res.put("uri", outFile.getAbsolutePath());
                call.resolve(res);
            } catch (Exception err) {
                call.reject("Failed to create file in phone storage: " + err.getMessage(), err);
            }
        });
    }

    @PluginMethod
    public void writeExportChunk(final PluginCall call) {
        final String streamId = call.getString("streamId");
        final String base64Data = call.getString("data", "");

        if (streamId == null || streamId.isEmpty()) {
            call.reject("Missing streamId.");
            return;
        }

        ioExecutor.execute(() -> {
            ActiveStreamSession session = sessions.get(streamId);
            if (session == null) {
                call.reject("Active export stream not found.");
                return;
            }

            try {
                int written = 0;
                if (base64Data != null && !base64Data.isEmpty()) {
                    byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
                    session.outputStream.write(decoded);
                    written = decoded.length;
                }
                JSObject res = new JSObject();
                res.put("written", written);
                call.resolve(res);
            } catch (Exception err) {
                call.reject("Failed while writing to phone storage: " + err.getMessage(), err);
            }
        });
    }

    @PluginMethod
    public void closeExportStream(final PluginCall call) {
        final String streamId = call.getString("streamId");
        if (streamId == null || streamId.isEmpty()) {
            call.reject("Missing streamId.");
            return;
        }

        ioExecutor.execute(() -> {
            ActiveStreamSession session = sessions.remove(streamId);
            if (session == null) {
                JSObject res = new JSObject();
                res.put("status", "closed");
                call.resolve(res);
                return;
            }

            try {
                session.outputStream.flush();
                session.outputStream.close();

                if (
                    session.isPendingMediaStore &&
                    session.uri != null &&
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContext().getContentResolver().update(session.uri, values, null, null);
                }

                JSObject res = new JSObject();
                res.put("status", "closed");
                res.put("filename", session.filename);
                call.resolve(res);
            } catch (IOException err) {
                call.reject("Failed to finalize file in phone storage: " + err.getMessage(), err);
            }
        });
    }

    @PluginMethod
    public void abortExportStream(final PluginCall call) {
        final String streamId = call.getString("streamId");
        if (streamId == null || streamId.isEmpty()) {
            JSObject res = new JSObject();
            res.put("status", "aborted");
            call.resolve(res);
            return;
        }

        ioExecutor.execute(() -> {
            ActiveStreamSession session = sessions.remove(streamId);
            if (session != null) {
                closeQuietly(session.outputStream);
                deleteIncompleteTarget(session);
            }
            JSObject res = new JSObject();
            res.put("status", "aborted");
            call.resolve(res);
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (Map.Entry<String, ActiveStreamSession> entry : sessions.entrySet()) {
            ActiveStreamSession s = sessions.remove(entry.getKey());
            if (s != null) {
                closeQuietly(s.outputStream);
            }
        }
        ioExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    private String queryDisplayName(ContentResolver resolver, Uri uri, String fallbackName) {
        try (
            Cursor cursor = resolver.query(
                uri,
                new String[] { OpenableColumns.DISPLAY_NAME },
                null,
                null,
                null
            )
        ) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) {
                    String name = cursor.getString(idx);
                    if (name != null && !name.trim().isEmpty()) {
                        return name.trim();
                    }
                }
            }
        } catch (Exception ignored) {
            // Keep fallbackName if provider does not expose DISPLAY_NAME
        }
        return fallbackName;
    }

    private void closeQuietly(OutputStream stream) {
        if (stream == null) return;
        try {
            stream.close();
        } catch (Exception ignored) {}
    }

    private void deleteIncompleteTarget(ActiveStreamSession session) {
        try {
            if (session.uri != null) {
                ContentResolver resolver = getContext().getContentResolver();
                try {
                    DocumentsContract.deleteDocument(resolver, session.uri);
                } catch (Exception ignored) {
                    resolver.delete(session.uri, null, null);
                }
            } else if (session.legacyFile != null && session.legacyFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                session.legacyFile.delete();
            }
        } catch (Exception ignored) {}
    }
}
