package com.daengdabang.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationSettings")
public class LocationSettingsPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String target = call.getString("target", "app");
        Intent intent;
        if ("location".equals(target)) {
            intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        } else if ("app".equals(target)) {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", getContext().getPackageName(), null));
        } else {
            call.reject("Unsupported settings target");
            return;
        }
        try {
            startActivityForResult(call, intent, "settingsReturned");
        } catch (RuntimeException error) {
            call.reject("Could not open location settings", error);
        }
    }

    @ActivityCallback
    private void settingsReturned(PluginCall call, ActivityResult result) {
        if (call != null) call.resolve();
    }
}
