package com.daengdabang.app;

import android.Manifest;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

// Capacitor's inherited checkPermissions/requestPermissions methods support
// selecting aliases: photo capture asks for camera only, video/sound asks for both.
@CapacitorPlugin(name = "MediaPermissions", permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class MediaPermissionsPlugin extends Plugin {}
