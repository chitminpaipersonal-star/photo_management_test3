package com.datamanagement.archive;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int LIGHT_BG_COLOR = Color.parseColor("#F2F0EA");
    private static final int DARK_BG_COLOR = Color.parseColor("#0C0C0E");
    private boolean currentIsDark = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(StorageExportPlugin.class);
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            // Unify edge-to-edge inset dispatch across Android 7–16 (API 24–36)
            WindowCompat.setDecorFitsSystemWindows(window, false);
            // Ensure DecorView never applies duplicate IME/systemBar padding alongside contentView
            View decorView = window.getDecorView();
            ViewCompat.setOnApplyWindowInsetsListener(decorView, null);
            decorView.setPadding(0, 0, 0, 0);
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(
                contentView,
                (view, windowInsets) -> {
                    Insets systemBars = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout()
                    );
                    Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                    int bottomInset = Math.max(systemBars.bottom, ime.bottom);
                    view.setPadding(
                        systemBars.left,
                        systemBars.top,
                        systemBars.right,
                        bottomInset
                    );
                    return WindowInsetsCompat.CONSUMED;
                }
            );
            ViewCompat.requestApplyInsets(contentView);
        }

        boolean systemDark =
            (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        currentIsDark = systemDark;
        applySystemBarTheme(currentIsDark);

        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                webView.addJavascriptInterface(new SystemBarBridge(), "AndroidSystemBars");
            }
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemBarTheme(currentIsDark);
    }

    @SuppressWarnings("deprecation")
    private void applySystemBarTheme(boolean isDark) {
        currentIsDark = isDark;
        int bgColor = isDark ? DARK_BG_COLOR : LIGHT_BG_COLOR;
        Window window = getWindow();
        if (window == null) {
            return;
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(bgColor);
        }
        window.getDecorView().setBackgroundColor(bgColor);

        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(bgColor);
            window.setNavigationBarColor(bgColor);
        }

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(!isDark);
            controller.setAppearanceLightNavigationBars(!isDark);
        }
    }

    private final class SystemBarBridge {
        @JavascriptInterface
        public void setTheme(final boolean isDark) {
            runOnUiThread(() -> applySystemBarTheme(isDark));
        }
    }
}
