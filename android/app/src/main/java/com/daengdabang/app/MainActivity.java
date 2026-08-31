package com.daengdabang.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
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
