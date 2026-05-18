package ru.vintaste.winequiz;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

/** Запуск MainActivity после загрузки (прямой startActivity из BOOT часто блокируется на Android 10+). */
public final class BootLaunchScheduler {
    private static final int REQUEST_CODE = 1001;
    private static final long DELAY_MS = 12_000L;

    private BootLaunchScheduler() {}

    public static void schedule(Context context) {
        Context app = context.getApplicationContext();
        scheduleHandler(app);
        scheduleAlarm(app);
    }

    private static Intent launchIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return intent;
    }

    private static void scheduleHandler(Context context) {
        new Handler(Looper.getMainLooper()).postDelayed(
                () -> context.startActivity(launchIntent(context)),
                DELAY_MS);
    }

    private static void scheduleAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                REQUEST_CODE,
                launchIntent(context),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        long triggerAt = SystemClock.elapsedRealtime() + DELAY_MS;

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
            }
        } catch (SecurityException ignored) {
            alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent);
        }
    }
}
