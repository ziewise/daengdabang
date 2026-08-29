package com.daengdabang.app;

import android.app.ActivityManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PowerManager;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.FloatBuffer;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;

@CapacitorPlugin(name = "OnDeviceTryOn")
public class OnDeviceTryOnPlugin extends Plugin {
    private static final String MODEL_ASSET = "public/ai/tryon/ddb-lite-tryon-compositor-v2.onnx";
    private static final String MODEL_SHA256 = "3d09e7795872e60f381f02bce0993c2be6ca75fa5530f64ad50979f6315b9eea";
    private static final int EDGE = 256;
    private static final int PLANE = EDGE * EDGE;
    private static final int MAX_DATA_URL_CHARACTERS = 14_000_000;
    private static final int MAX_DECODED_IMAGE_BYTES = 10_000_000;
    private static final int MAX_SOURCE_EDGE = 2048;
    private final ExecutorService inferenceExecutor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        Context context = getContext();
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        activityManager.getMemoryInfo(memoryInfo);
        BatteryManager batteryManager = (BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        int batteryPercent = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
        boolean charging = batteryManager.isCharging();
        String digest = bundledModelDigest();
        boolean modelAvailable = MODEL_SHA256.equals(digest);
        JSObject result = new JSObject();
        result.put("available", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1 && modelAvailable);
        result.put("provider", "nnapi");
        result.put("runtimeVersion", OrtEnvironment.getEnvironment().getVersion());
        result.put("modelAvailable", modelAvailable);
        result.put("modelSha256", digest);
        result.put("totalMemoryMb", memoryInfo.totalMem / 1024L / 1024L);
        result.put("batteryLevel", batteryPercent >= 0 ? batteryPercent / 100.0 : -1.0);
        result.put("charging", charging);
        result.put("powerSaveMode", powerManager.isPowerSaveMode());
        result.put("thermalState", thermalState(powerManager));
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) result.put("reason", "nnapi_requires_android_8_1");
        else if (!modelAvailable) result.put("reason", "model_integrity_failed");
        call.resolve(result);
    }

    @PluginMethod
    public void run(PluginCall call) {
        String petDataUrl = call.getString("petDataUrl", "");
        String productDataUrl = call.getString("productDataUrl", "");
        String layout = call.getString("layout", "torso");
        String expectedDigest = call.getString("modelSha256", "");
        if (!MODEL_SHA256.equals(expectedDigest) || !MODEL_SHA256.equals(bundledModelDigest())) {
            call.reject("model_integrity_failed", "MODEL_INTEGRITY_FAILED");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
            call.reject("runtime_unavailable", "NNAPI_UNAVAILABLE");
            return;
        }
        inferenceExecutor.execute(() -> {
            long started = System.nanoTime();
            try {
                Bitmap pet = decodeDataUrl(petDataUrl);
                Bitmap product = decodeDataUrl(productDataUrl);
                Prepared prepared = prepare(pet, product, layout);
                float[] output = infer(prepared);
                Bitmap rendered = outputBitmap(output);
                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                rendered.compress(Bitmap.CompressFormat.JPEG, 88, stream);
                JSObject result = new JSObject();
                result.put("imageDataUrl", "data:image/jpeg;base64," + Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP));
                result.put("provider", "nnapi");
                result.put("runtimeVersion", OrtEnvironment.getEnvironment().getVersion());
                result.put("durationMs", (System.nanoTime() - started) / 1_000_000.0);
                result.put("modelSha256", MODEL_SHA256);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("inference_failed", "ON_DEVICE_INFERENCE_FAILED", error);
            }
        });
    }

    private float[] infer(Prepared prepared) throws Exception {
        byte[] model = readModel();
        OrtEnvironment environment = OrtEnvironment.getEnvironment();
        try (OrtSession.SessionOptions options = new OrtSession.SessionOptions()) {
            options.setIntraOpNumThreads(1);
            options.addNnapi();
            try (OrtSession session = environment.createSession(model, options);
                 OnnxTensor petTensor = OnnxTensor.createTensor(environment, FloatBuffer.wrap(prepared.petRgb), new long[]{1, 3, EDGE, EDGE});
                 OnnxTensor productTensor = OnnxTensor.createTensor(environment, FloatBuffer.wrap(prepared.productRgb), new long[]{1, 3, EDGE, EDGE});
                 OnnxTensor alphaTensor = OnnxTensor.createTensor(environment, FloatBuffer.wrap(prepared.alpha), new long[]{1, 1, EDGE, EDGE})) {
                Map<String, OnnxTensor> inputs = new HashMap<>();
                inputs.put("pet_rgb", petTensor);
                inputs.put("product_rgb", productTensor);
                inputs.put("alpha", alphaTensor);
                try (OrtSession.Result result = session.run(inputs)) {
                    float[][][][] values = (float[][][][]) result.get("result_rgb").orElseThrow().getValue();
                    float[] flat = new float[PLANE * 3];
                    for (int channel = 0; channel < 3; channel++) {
                        for (int y = 0; y < EDGE; y++) {
                            System.arraycopy(values[0][channel][y], 0, flat, channel * PLANE + y * EDGE, EDGE);
                        }
                    }
                    return flat;
                }
            }
        }
    }

    private Prepared prepare(Bitmap pet, Bitmap product, String layout) {
        Bitmap petCanvas = Bitmap.createBitmap(EDGE, EDGE, Bitmap.Config.ARGB_8888);
        Canvas petPainter = new Canvas(petCanvas);
        petPainter.drawColor(Color.rgb(245, 245, 244));
        drawContained(petPainter, pet, new RectF(0, 0, EDGE, EDGE));
        Bitmap productCanvas = Bitmap.createBitmap(EDGE, EDGE, Bitmap.Config.ARGB_8888);
        Canvas productPainter = new Canvas(productCanvas);
        for (RectF rect : layoutRects(layout)) drawContained(productPainter, product, rect);
        int[] petPixels = new int[PLANE];
        int[] productPixels = new int[PLANE];
        petCanvas.getPixels(petPixels, 0, EDGE, 0, 0, EDGE, EDGE);
        productCanvas.getPixels(productPixels, 0, EDGE, 0, 0, EDGE, EDGE);
        float[] petRgb = new float[PLANE * 3];
        float[] productRgb = new float[PLANE * 3];
        float[] alpha = new float[PLANE];
        for (int index = 0; index < PLANE; index++) {
            int petPixel = petPixels[index];
            int productPixel = productPixels[index];
            int red = Color.red(productPixel);
            int green = Color.green(productPixel);
            int blue = Color.blue(productPixel);
            petRgb[index] = Color.red(petPixel) / 255f;
            petRgb[PLANE + index] = Color.green(petPixel) / 255f;
            petRgb[PLANE * 2 + index] = Color.blue(petPixel) / 255f;
            productRgb[index] = red / 255f;
            productRgb[PLANE + index] = green / 255f;
            productRgb[PLANE * 2 + index] = blue / 255f;
            float whiteness = Math.min(red, Math.min(green, blue)) / 255f;
            float whiteSuppression = Math.max(0f, 1f - Math.max(0f, whiteness - 0.9f) * 10f);
            alpha[index] = Color.alpha(productPixel) / 255f * whiteSuppression * 0.82f;
        }
        pet.recycle();
        product.recycle();
        petCanvas.recycle();
        productCanvas.recycle();
        return new Prepared(petRgb, productRgb, alpha);
    }

    private static void drawContained(Canvas canvas, Bitmap bitmap, RectF target) {
        float scale = Math.min(target.width() / bitmap.getWidth(), target.height() / bitmap.getHeight());
        float width = bitmap.getWidth() * scale;
        float height = bitmap.getHeight() * scale;
        RectF centered = new RectF(
                target.centerX() - width / 2f,
                target.centerY() - height / 2f,
                target.centerX() + width / 2f,
                target.centerY() + height / 2f);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        canvas.drawBitmap(bitmap, null, centered, paint);
    }

    private static RectF[] layoutRects(String layout) {
        if ("head".equals(layout)) return new RectF[]{new RectF(54, 18, 204, 112)};
        if ("neck".equals(layout)) return new RectF[]{new RectF(78, 62, 184, 120)};
        if ("feet".equals(layout)) return new RectF[]{
                new RectF(43, 185, 85, 237), new RectF(87, 188, 129, 240),
                new RectF(135, 188, 177, 240), new RectF(177, 184, 219, 236)};
        if ("leash".equals(layout)) return new RectF[]{new RectF(62, 55, 220, 187)};
        if ("harness".equals(layout)) return new RectF[]{new RectF(56, 63, 210, 183)};
        return new RectF[]{new RectF(48, 55, 214, 187)};
    }

    private static Bitmap outputBitmap(float[] values) {
        int[] pixels = new int[PLANE];
        for (int index = 0; index < PLANE; index++) {
            int red = Math.round(Math.max(0f, Math.min(1f, values[index])) * 255f);
            int green = Math.round(Math.max(0f, Math.min(1f, values[PLANE + index])) * 255f);
            int blue = Math.round(Math.max(0f, Math.min(1f, values[PLANE * 2 + index])) * 255f);
            pixels[index] = Color.rgb(red, green, blue);
        }
        return Bitmap.createBitmap(pixels, EDGE, EDGE, Bitmap.Config.ARGB_8888);
    }

    private static Bitmap decodeDataUrl(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:image/") || comma < 0 || dataUrl.length() > MAX_DATA_URL_CHARACTERS) {
            throw new IllegalArgumentException("invalid_image_data_url");
        }
        byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
        if (bytes.length > MAX_DECODED_IMAGE_BYTES) throw new IllegalArgumentException("image_too_large");
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = 1;
        while (Math.max(bounds.outWidth, bounds.outHeight) / options.inSampleSize > MAX_SOURCE_EDGE) {
            options.inSampleSize *= 2;
        }
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
        if (bitmap == null) throw new IllegalArgumentException("invalid_image_data_url");
        return bitmap;
    }

    private byte[] readModel() throws IOException {
        try (InputStream stream = getContext().getAssets().open(MODEL_ASSET);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = stream.read(buffer)) >= 0) output.write(buffer, 0, read);
            return output.toByteArray();
        }
    }

    private String bundledModelDigest() {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(readModel());
            StringBuilder hex = new StringBuilder();
            for (byte value : digest) hex.append(String.format("%02x", value));
            return hex.toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String thermalState(PowerManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return "unknown";
        int status = manager.getCurrentThermalStatus();
        if (status >= PowerManager.THERMAL_STATUS_CRITICAL) return "critical";
        if (status >= PowerManager.THERMAL_STATUS_SEVERE) return "serious";
        if (status >= PowerManager.THERMAL_STATUS_MODERATE) return "fair";
        return "nominal";
    }

    @Override
    protected void handleOnDestroy() {
        inferenceExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    private static final class Prepared {
        final float[] petRgb;
        final float[] productRgb;
        final float[] alpha;

        Prepared(float[] petRgb, float[] productRgb, float[] alpha) {
            this.petRgb = petRgb;
            this.productRgb = productRgb;
            this.alpha = alpha;
        }
    }
}
