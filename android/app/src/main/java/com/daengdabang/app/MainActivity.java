package com.daengdabang.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DaengDaBangStartup";
    private static final Uri WEB_FALLBACK = Uri.parse("https://www.daengdabang.com/app/");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
        } catch (RuntimeException | LinkageError startupError) {
            Log.e(TAG, "The native shell could not start; opening the web app fallback.", startupError);
            openWebFallback();
            return;
        }

        // The optional ONNX runtime must not be part of the critical app-start path.
        // If a device cannot load it, shopping and the rest of the app still open.
        try {
            getBridge().registerPlugin(OnDeviceTryOnPlugin.class);
        } catch (RuntimeException | LinkageError pluginError) {
            Log.e(TAG, "On-device Try-On is unavailable on this device.", pluginError);
        }

        // 앱은 늘 밝은 화면(2026-10-26 사용자: "우리 앱에 다크 모드는 없다") — 휴대폰 다크 모드 · 강제 다크 기능이
        // 앱 안 웹 화면을 자동으로 어둡게 칠하지 못하게 끈다. 실패해도 앱 시작에는 영향 없음.
        try {
            WebSettings settings = getBridge().getWebView().getSettings();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                settings.setAlgorithmicDarkeningAllowed(false);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                disableLegacyForceDark(settings);
            }
        } catch (RuntimeException | LinkageError darkError) {
            Log.w(TAG, "Could not turn off WebView darkening.", darkError);
        }
    }

    /** 안드로이드 10~12 의 WebView 강제 다크 끄기(13 이상은 위 setAlgorithmicDarkeningAllowed) */
    @SuppressWarnings("deprecation")
    private static void disableLegacyForceDark(WebSettings settings) {
        settings.setForceDark(WebSettings.FORCE_DARK_OFF);
    }

    private void openWebFallback() {
        Intent fallback = new Intent(Intent.ACTION_VIEW, WEB_FALLBACK);
        fallback.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(fallback);
        } catch (RuntimeException browserError) {
            Log.e(TAG, "No browser is available for the web app fallback.", browserError);
        }
    }
}
