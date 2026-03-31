package com.jukai.jukai;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Plugin nativo de cámara que evita OOM al decodificar con inSampleSize.
 *
 * El plugin de Capacitor Camera hace BitmapFactory.decodeFile() sin inSampleSize,
 * lo que en fotos de 12 MP+ consume ~48 MB de RAM y causa que Android mate la
 * Activity/WebView. Este plugin:
 *
 *  1. Guarda la ruta del archivo y contexto del campo en SharedPreferences
 *     ANTES de lanzar la cámara (persiste aunque Android mate la Activity).
 *  2. Lanza un camera intent con EXTRA_OUTPUT apuntando a un archivo en disco.
 *  3. Al volver, decodifica con inSampleSize (2 pasadas) para usar ~4× menos RAM.
 *  4. Maneja rotación EXIF, redimensionado y compresión JPEG.
 *  5. Si Android mató la Activity, checkPendingCapture() recupera la foto
 *     desde el archivo que la cámara nativa ya escribió a disco.
 */
@CapacitorPlugin(
    name = "SafeCamera",
    permissions = {
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera")
    }
)
public class SafeCameraPlugin extends Plugin {

    private static final String PREF_NAME = "safe_camera_prefs";
    private static final String KEY_PHOTO_PATH = "pending_photo_path";
    private static final String KEY_FIELD = "pending_field";
    private static final String KEY_FIELD_KEY = "pending_field_key";
    private static final String KEY_URL = "pending_url";
    private static final String KEY_TIMESTAMP = "pending_timestamp";
    private static final String KEY_MAX_DIM = "pending_max_dim";
    private static final String KEY_QUALITY = "pending_quality";

    /**
     * Lanza la cámara nativa. El archivo de foto se crea ANTES de lanzar la cámara
     * y su ruta se guarda en SharedPreferences para poder recuperarlo si la Activity muere.
     *
     * Opciones JS:
     *  - maxDimension (int, default 1280): lado máximo en px
     *  - quality (int, default 60): calidad JPEG 0-100
     *  - field (string): nombre del campo del formulario
     *  - fieldKey (string): key auxiliar del campo
     *  - url (string): pathname actual para futuro redirect
     */
    @PluginMethod()
    public void takePhoto(PluginCall call) {
        // Solicitar permiso de cámara si no está otorgado
        if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }
        launchCamera(call);
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        if (getPermissionState("camera") == com.getcapacitor.PermissionState.GRANTED) {
            launchCamera(call);
        } else {
            call.reject("Permiso de cámara denegado");
        }
    }

    private void launchCamera(PluginCall call) {
        int maxDimension = call.getInt("maxDimension", 1280);
        int quality = call.getInt("quality", 60);
        String field = call.getString("field", "");
        String fieldKey = call.getString("fieldKey", "");
        String url = call.getString("url", "");

        try {
            File photoFile = createImageFile();
            String photoPath = photoFile.getAbsolutePath();

            // Guardar en SharedPreferences ANTES de abrir la cámara.
            // Si Android mata la Activity durante la captura, estos datos sobreviven.
            SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(KEY_PHOTO_PATH, photoPath)
                .putString(KEY_FIELD, field)
                .putString(KEY_FIELD_KEY, fieldKey)
                .putString(KEY_URL, url)
                .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
                .putInt(KEY_MAX_DIM, maxDimension)
                .putInt(KEY_QUALITY, quality)
                .apply();

            Uri photoUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                photoFile
            );

            // Iniciar foreground service para evitar que Oppo/realme mate el proceso
            startCameraService();

            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            startActivityForResult(call, intent, "cameraResult");
        } catch (Exception e) {
            stopCameraService();
            clearPending();
            call.reject("Error launching camera: " + e.getMessage());
        }
    }

    /**
     * Callback de la cámara nativa. Decodifica la foto con inSampleSize
     * y devuelve un data:image/jpeg;base64 al WebView.
     */
    @ActivityCallback
    private void cameraResult(PluginCall call, ActivityResult result) {
        // Detener foreground service — ya no necesitamos mantener el proceso vivo
        stopCameraService();

        if (call == null) {
            // Call perdido — la foto se recuperará vía checkPendingCapture()
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            clearPending();
            call.reject("User cancelled");
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String photoPath = prefs.getString(KEY_PHOTO_PATH, null);

        if (photoPath == null || !new File(photoPath).exists()) {
            clearPending();
            call.reject("Photo file not found");
            return;
        }

        try {
            int maxDimension = prefs.getInt(KEY_MAX_DIM, 1280);
            int quality = prefs.getInt(KEY_QUALITY, 60);

            String base64 = decodeResizeAndCompress(photoPath, maxDimension, quality);
            clearPending();

            JSObject res = new JSObject();
            res.put("dataUrl", "data:image/jpeg;base64," + base64);
            call.resolve(res);
        } catch (Exception e) {
            clearPending();
            call.reject("Error processing photo: " + e.getMessage());
        }
    }

    /**
     * Verifica si hay una captura pendiente que se perdió porque Android mató la Activity.
     * Si el archivo de foto existe y tiene menos de 10 minutos, lo decodifica y devuelve.
     *
     * Retorna:
     *  - hasPending (boolean)
     *  - dataUrl (string): data:image/jpeg;base64,...
     *  - field, fieldKey, url (strings): contexto del campo
     */
    @PluginMethod()
    public void checkPendingCapture(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String photoPath = prefs.getString(KEY_PHOTO_PATH, null);
        long timestamp = prefs.getLong(KEY_TIMESTAMP, 0);

        // Solo recuperar si tiene menos de 10 minutos
        boolean expired = (System.currentTimeMillis() - timestamp) > 600_000;

        if (photoPath == null || expired || !new File(photoPath).exists()) {
            if (photoPath != null) clearPending();
            JSObject res = new JSObject();
            res.put("hasPending", false);
            call.resolve(res);
            return;
        }

        try {
            int maxDimension = prefs.getInt(KEY_MAX_DIM, 1280);
            int quality = prefs.getInt(KEY_QUALITY, 60);
            String field = prefs.getString(KEY_FIELD, "");
            String fieldKey = prefs.getString(KEY_FIELD_KEY, "");
            String url = prefs.getString(KEY_URL, "");

            String base64 = decodeResizeAndCompress(photoPath, maxDimension, quality);
            clearPending();

            JSObject res = new JSObject();
            res.put("hasPending", true);
            res.put("dataUrl", "data:image/jpeg;base64," + base64);
            res.put("field", field);
            res.put("fieldKey", fieldKey);
            res.put("url", url);
            call.resolve(res);
        } catch (Exception e) {
            clearPending();
            JSObject res = new JSObject();
            res.put("hasPending", false);
            res.put("error", e.getMessage());
            call.resolve(res);
        }
    }

    /**
     * Limpia cualquier captura pendiente y elimina el archivo temporal.
     */
    @PluginMethod()
    public void clearPendingCapture(PluginCall call) {
        clearPending();
        JSObject res = new JSObject();
        res.put("cleared", true);
        call.resolve(res);
    }

    // ─── Utilidades internas ─────────────────────────────────────────────────

    /**
     * Decodifica una imagen con inSampleSize (2 pasadas), rota según EXIF,
     * redimensiona al tamaño máximo, y comprime como JPEG base64.
     *
     * Pasada 1: solo lee dimensiones (inJustDecodeBounds = true), 0 RAM.
     * Pasada 2: decodifica con inSampleSize calculado, ~4× menos RAM.
     */
    private String decodeResizeAndCompress(String path, int maxDimension, int quality) throws IOException {
        // Pasada 1: obtener dimensiones sin cargar bitmap en RAM
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(path, opts);

        // Calcular inSampleSize para que el bitmap decodificado quepa en RAM
        int width = opts.outWidth;
        int height = opts.outHeight;
        int inSampleSize = 1;
        while ((width / inSampleSize) > maxDimension * 2 || (height / inSampleSize) > maxDimension * 2) {
            inSampleSize *= 2;
        }

        // Pasada 2: decodificar con inSampleSize
        opts = new BitmapFactory.Options();
        opts.inSampleSize = inSampleSize;
        Bitmap bitmap = BitmapFactory.decodeFile(path, opts);

        if (bitmap == null) {
            throw new IOException("Failed to decode image at " + path);
        }

        // Rotación EXIF
        try {
            ExifInterface exif = new ExifInterface(path);
            int orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL
            );
            Matrix matrix = new Matrix();
            switch (orientation) {
                case ExifInterface.ORIENTATION_ROTATE_90:  matrix.postRotate(90);  break;
                case ExifInterface.ORIENTATION_ROTATE_180: matrix.postRotate(180); break;
                case ExifInterface.ORIENTATION_ROTATE_270: matrix.postRotate(270); break;
                default: break;
            }
            if (orientation != ExifInterface.ORIENTATION_NORMAL
                && orientation != ExifInterface.ORIENTATION_UNDEFINED) {
                Bitmap rotated = Bitmap.createBitmap(
                    bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true
                );
                bitmap.recycle();
                bitmap = rotated;
            }
        } catch (Exception ignored) {
            // Si falla la lectura EXIF, usar imagen tal cual
        }

        // Redimensionar si excede maxDimension
        if (bitmap.getWidth() > maxDimension || bitmap.getHeight() > maxDimension) {
            float scale = Math.min(
                (float) maxDimension / bitmap.getWidth(),
                (float) maxDimension / bitmap.getHeight()
            );
            Bitmap scaled = Bitmap.createScaledBitmap(
                bitmap,
                Math.round(bitmap.getWidth() * scale),
                Math.round(bitmap.getHeight() * scale),
                true
            );
            bitmap.recycle();
            bitmap = scaled;
        }

        // Comprimir a JPEG base64
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
        bitmap.recycle();

        return Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
    }

    /**
     * Crea un archivo temporal para la foto en el directorio externo de la app.
     * Este directorio es privado de la app pero persiste aunque la Activity muera.
     */
    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File storageDir = getContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (storageDir != null && !storageDir.exists()) {
            storageDir.mkdirs();
        }
        return new File(storageDir, "SAFE_CAM_" + timeStamp + ".jpg");
    }

    /**
     * Inicia CameraForegroundService para elevar la prioridad del proceso
     * de adj 900 (cached) a adj ~200 (foreground service).
     * Esto evita que Oppo/realme/Xiaomi maten el proceso mientras la cámara está abierta.
     */
    private void startCameraService() {
        try {
            Context ctx = getContext();
            Intent serviceIntent = new Intent(ctx, CameraForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(serviceIntent);
            } else {
                ctx.startService(serviceIntent);
            }
        } catch (Exception e) {
            // No bloquear la cámara si el servicio falla
            android.util.Log.w("SafeCamera", "Could not start foreground service: " + e.getMessage());
        }
    }

    /**
     * Detiene CameraForegroundService al volver de la cámara.
     */
    private void stopCameraService() {
        try {
            Context ctx = getContext();
            ctx.stopService(new Intent(ctx, CameraForegroundService.class));
        } catch (Exception ignored) {
        }
    }

    /**
     * Limpia SharedPreferences y elimina el archivo temporal de foto.
     */
    private void clearPending() {
        SharedPreferences prefs = getContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        String path = prefs.getString(KEY_PHOTO_PATH, null);
        if (path != null) {
            File file = new File(path);
            if (file.exists()) {
                file.delete();
            }
        }
        prefs.edit().clear().apply();
    }
}
