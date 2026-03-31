package com.jukai.jukai;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/**
 * Foreground Service que se activa mientras la cámara está abierta.
 *
 * Cuando SafeCameraPlugin lanza ACTION_IMAGE_CAPTURE, nuestra Activity pasa a
 * background con adj ~900 (cached). En dispositivos Oppo/realme/Xiaomi con
 * gestión agresiva de RAM, Android mata el proceso en segundos.
 *
 * Este servicio eleva la prioridad del proceso a ~200 (foreground service)
 * mostrando una notificación mínima. Se detiene automáticamente al volver
 * de la cámara o tras 2 minutos de timeout.
 */
public class CameraForegroundService extends Service {

    public static final String CHANNEL_ID = "safe_camera_channel";
    private static final int NOTIFICATION_ID = 9999;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);

        // Auto-stop tras 2 minutos por seguridad (si la cámara se cierra sin notificarnos)
        new android.os.Handler(getMainLooper()).postDelayed(this::stopSelf, 120_000);

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopForeground(true);
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Captura de cámara",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Mantiene la app activa mientras se captura una foto");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        return builder
            .setContentTitle("Capturando foto")
            .setContentText("La app permanece activa mientras usa la cámara")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .build();
    }
}
