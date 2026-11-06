import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Channel } from '@capacitor/local-notifications';
import { District, UserSettings, PrayerAlertSound } from '../types';
import { AppPrayerSystemConfig } from '../types/admin';
import { computePrayerTimes, prayerTimeToDate, toBengaliDigits } from './prayerTimes';
import { soundManager, triggerHaptic, sendNotification as sendWebNotification } from './audio';

/**
 * Android 8+ Notification Channels.
 * CRITICAL RULE: On Android, the channel 'sound' property must be the raw resource
 * name WITHOUT any file extension (e.g. 'adhan', not 'adhan.mp3').
 */
export const PRAYER_CHANNELS: Channel[] = [
  {
    id: 'adhan',
    name: 'ওয়াক্ত ও আজান',
    description: 'নামাজের ওয়াক্ত হলে আজানের পূর্ণাঙ্গ ধ্বনি ও নোটিফিকেশন',
    sound: 'adhan',
    importance: 5, // IMPORTANCE_HIGH
    visibility: 1, // NotificationVisibility.PUBLIC
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  },
  {
    id: 'prayer_reminder',
    name: 'সাধারণ রিমাইন্ডার ও সতর্কতা',
    description: 'নামাজের ১০ মিনিট পূর্ববর্তী সতর্কতা, সুন্নাহ রোজা ও ইসলামিক ঘোষণা',
    importance: 4, // IMPORTANCE_DEFAULT
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  },
  // Channels for specific selectable Muazzin sounds (all sound names without .mp3)
  {
    id: 'prayer_azan_makkah',
    name: 'ওয়াক্ত ও আজান (মক্কা শরিফ)',
    description: 'মসজিদুল হারামের আজান ও নামাজের ওয়াক্ত নোটিফিকেশন',
    sound: 'azan_makkah',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  },
  {
    id: 'prayer_azan_madinah',
    name: 'ওয়াক্ত ও আজান (মদিনা শরিফ)',
    description: 'মসজিদুন নববির আজান ও নামাজের ওয়াক্ত নোটিফিকেশন',
    sound: 'azan_madinah',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  },
  {
    id: 'prayer_azan_mishary',
    name: 'ওয়াক্ত ও আজান (মিশারি রাশিদ)',
    description: 'মিশারি রাশিদ আল-আফাসির আজান ও নামাজের ওয়াক্ত নোটিফিকেশন',
    sound: 'azan_mishary',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  },
  {
    id: 'prayer_azan_aqsa',
    name: 'ওয়াক্ত ও আজান (আল-আকসা)',
    description: 'মসজিদুল আকসার আজান ও নামাজের ওয়াক্ত নোটিফিকেশন',
    sound: 'azan_aqsa',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  },
  {
    id: 'prayer_azan_fajr',
    name: 'ওয়াক্ত ও আজান (ফজর বিশেষ)',
    description: 'ফজরের বিশেষ পূর্ণাঙ্গ আজান ও ওয়াক্ত নোটিফিকেশন',
    sound: 'azan_fajr',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#064e3b'
  }
];

let channelsInitialized = false;

/**
 * Initialize native Android notification channels.
 * Runs once per app lifecycle on native Android.
 */
export async function initNativeNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (channelsInitialized) return;

  try {
    for (const ch of PRAYER_CHANNELS) {
      await LocalNotifications.createChannel(ch).catch(() => {});
    }
    channelsInitialized = true;
  } catch (err) {
    console.warn('initNativeNotificationChannels notice:', err);
  }
}

/**
 * Check if Android runtime notification permission is granted.
 */
export async function checkNotificationPermissionStatus(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      return res.display === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }

  return false;
}

/**
 * Check exact alarm permission status specifically on Android 12+ (API 31+).
 */
export async function checkExactAlarmPermissionStatus(): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const exactSetting = await LocalNotifications.checkExactNotificationSetting();
      return exactSetting.exact_alarm === 'granted';
    } catch {
      return true;
    }
  }
  return true;
}

/**
 * Open exact alarm setting screen on Android 12+.
 */
export async function requestExactAlarmSetting(): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.changeExactNotificationSetting();
    } catch (e) {
      console.warn('Exact alarm change notice:', e);
    }
  }
}

/**
 * Request all required notification and exact alarm permissions.
 */
export async function requestAllNotificationPermissions(): Promise<{
  notificationsGranted: boolean;
  exactAlarmGranted: boolean;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      await initNativeNotificationChannels();
      const res = await LocalNotifications.requestPermissions();
      const notifGranted = res.display === 'granted';

      let exactGranted = true;
      if (Capacitor.getPlatform() === 'android') {
        try {
          const exactSetting = await LocalNotifications.checkExactNotificationSetting();
          exactGranted = exactSetting.exact_alarm === 'granted';
          if (!exactGranted) {
            await LocalNotifications.changeExactNotificationSetting();
          }
        } catch {
          exactGranted = true;
        }
      }

      return {
        notificationsGranted: notifGranted,
        exactAlarmGranted: exactGranted
      };
    } catch (err) {
      console.warn('Native notification permission error:', err);
      return { notificationsGranted: false, exactAlarmGranted: false };
    }
  }

  // Web fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      return { notificationsGranted: true, exactAlarmGranted: true };
    }
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      return { notificationsGranted: perm === 'granted', exactAlarmGranted: true };
    }
  }

  return { notificationsGranted: false, exactAlarmGranted: false };
}

/**
 * Resolves the channel ID and raw sound filename (without extension) for a given sound selection.
 */
function resolveChannelAndSound(soundId?: PrayerAlertSound): { channelId: string; sound: string } {
  switch (soundId) {
    case 'azan_makkah':
      return { channelId: 'prayer_azan_makkah', sound: 'azan_makkah' };
    case 'azan_madinah':
      return { channelId: 'prayer_azan_madinah', sound: 'azan_madinah' };
    case 'azan_mishary':
      return { channelId: 'prayer_azan_mishary', sound: 'azan_mishary' };
    case 'azan_aqsa':
      return { channelId: 'prayer_azan_aqsa', sound: 'azan_aqsa' };
    case 'azan_fajr':
      return { channelId: 'prayer_azan_fajr', sound: 'azan_fajr' };
    default:
      // Default primary channel 'adhan' with raw sound 'adhan'
      return { channelId: 'adhan', sound: 'adhan' };
  }
}

/**
 * Schedule upcoming prayer notifications natively on Android AlarmManager.
 * Schedules all 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) for the next 7 days in advance.
 * Always cancels old schedules first, uses unique integer IDs, and specifies allowWhileIdle: true.
 */
export async function scheduleNativePrayerAlarms(
  district: District,
  settings: UserSettings,
  prayerSystemConfig: AppPrayerSystemConfig | null
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await initNativeNotificationChannels();

    // Cancel all previous pending notifications to prevent duplicates or obsolete schedules
    await LocalNotifications.cancelAll().catch(() => {});

    // If notifications are disabled by the user, we stop here
    if (!settings.notificationsEnabled) {
      return;
    }

    const hasPermission = await checkNotificationPermissionStatus();
    if (!hasPermission) return;

    const prayerKeys: Array<{ key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; bnName: string; index: number }> = [
      { key: 'fajr', bnName: 'ফজর', index: 0 },
      { key: 'dhuhr', bnName: 'যোহর', index: 1 },
      { key: 'asr', bnName: 'আসর', index: 2 },
      { key: 'maghrib', bnName: 'মাগরিব', index: 3 },
      { key: 'isha', bnName: 'ইশা', index: 4 }
    ];

    const notificationsToSchedule: any[] = [];
    const now = Date.now();
    const activeJuristic = prayerSystemConfig?.juristicMethod || settings.juristicMethod || 'hanafi';
    const activeCalcMethod = prayerSystemConfig?.calcMethod || settings.calcMethod || 'karachi';
    const offsets = {
      fajr: (settings.fajrOffset || 0) + (prayerSystemConfig?.fajrOffset || 0),
      dhuhr: (settings.dhuhrOffset || 0) + (prayerSystemConfig?.dhuhrOffset || 0),
      asr: (settings.asrOffset || 0) + (prayerSystemConfig?.asrOffset || 0),
      maghrib: (settings.maghribOffset || 0) + (prayerSystemConfig?.maghribOffset || 0),
      isha: (settings.ishaOffset || 0) + (prayerSystemConfig?.ishaOffset || 0)
    };
    const hijriAdj = (settings.hijriDayAdjustment || 0) + (prayerSystemConfig?.hijriDayAdjustment || 0);

    // Schedule for the next 7 days ahead
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now + dayOffset * 24 * 60 * 60 * 1000);
      const dayPrayers = computePrayerTimes(
        targetDate,
        district.lat,
        district.lng,
        activeJuristic,
        activeCalcMethod,
        offsets,
        hijriAdj
      );

      for (const p of prayerKeys) {
        // Check if individual prayer is enabled in user settings
        const isEnabled = settings.prayerAlerts ? settings.prayerAlerts[p.key] !== false : true;
        if (!isEnabled) continue;

        const timeStr = dayPrayers[p.key as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'];
        if (!timeStr) continue;

        const prayerDate = prayerTimeToDate(timeStr, targetDate);
        const prayerTimestamp = prayerDate.getTime();

        // 1. Exact Prayer Waqt Azan Notification
        // Must be in the future (minimum 3 seconds from now)
        if (prayerTimestamp > now + 3000) {
          const chosenSound =
            settings.prayerCustomSounds?.[p.key] || settings.prayerAlertSound || 'azan_makkah';
          const { channelId, sound } = resolveChannelAndSound(chosenSound);

          // Unique positive integer ID for each prayer slot
          const notificationId = dayOffset * 10 + p.index + 1;

          notificationsToSchedule.push({
            id: notificationId,
            title: `ওয়াক্ত হয়েছে — ${p.bnName} (${toBengaliDigits(timeStr)})`,
            body: `${district.nameBn}-এ এখন ${p.bnName} নামাজের সময় হয়েছে। আজান শুরু হচ্ছে। “হাইয়া আলাস-সালাহ — নামাজের দিকে এসো।”`,
            largeBody: `${district.nameBn}-এ এখন ${p.bnName} ওয়াক্ত শুরু হয়েছে। নামাজের প্রস্তুতি নিয়ে সময়মত জামাতে সালাত আদায় করুন।`,
            summaryText: 'নামাজের ওয়াক্ত ও আজান',
            schedule: {
              at: prayerDate,
              allowWhileIdle: true // CRITICAL: Wakes device and fires even in Android Doze mode
            },
            channelId,
            sound, // Without .mp3 extension for Android raw resource resolution
            smallIcon: 'ic_launcher_round',
            iconColor: '#064e3b',
            actionTypeId: 'PRAYER_ALERT',
            extra: {
              prayerKey: p.key,
              sound,
              district: district.nameBn,
              type: 'prayer_azan'
            }
          });
        }

        // 2. 10-Minute Early Reminder (Optional)
        if (settings.remind10MinBefore) {
          const earlyDate = new Date(prayerTimestamp - 10 * 60 * 1000);
          if (earlyDate.getTime() > now + 3000) {
            const earlyNotificationId = 100 + dayOffset * 10 + p.index + 1;

            notificationsToSchedule.push({
              id: earlyNotificationId,
              title: `আগাম সতর্কতা — ${p.bnName} আর ১০ মিনিট বাকি`,
              body: `${district.nameBn}-এ আর ১০ মিনিট পর ${p.bnName} ওয়াক্ত শুরু হবে (${toBengaliDigits(timeStr)})। নামাজের প্রস্তুতি নিন।`,
              schedule: {
                at: earlyDate,
                allowWhileIdle: true
              },
              channelId: 'prayer_reminder',
              smallIcon: 'ic_launcher_round',
              iconColor: '#064e3b',
              extra: {
                prayerKey: p.key,
                type: 'prayer_early_10min'
              }
            });
          }
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      // Chunk schedules into groups of 35 to prevent binder buffer transaction overflow
      for (let i = 0; i < notificationsToSchedule.length; i += 35) {
        const chunk = notificationsToSchedule.slice(i, i + 35);
        await LocalNotifications.schedule({ notifications: chunk });
      }
    }
  } catch (err) {
    console.warn('scheduleNativePrayerAlarms error:', err);
  }
}

/**
 * Requirement 8: Schedule a test adhan exactly 10 seconds in the future.
 * Allows instant verification of sound playback and notification arrival even with screen locked.
 */
export async function schedule10SecondTestAdhan(): Promise<{
  success: boolean;
  scheduledTime: Date;
  isNative: boolean;
  error?: string;
}> {
  triggerHaptic([100, 50, 100]);
  const testTime = new Date(Date.now() + 10 * 1000);
  const testId = 99990;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNativeNotificationChannels();
      const perms = await requestAllNotificationPermissions();
      if (!perms.notificationsGranted) {
        return {
          success: false,
          scheduledTime: testTime,
          isNative: true,
          error: 'নোটিফিকেশন অনুমতি প্রদান করা হয়নি।'
        };
      }

      // Cancel previous test notification if any
      await LocalNotifications.cancel({
        notifications: [{ id: testId }]
      }).catch(() => {});

      await LocalNotifications.schedule({
        notifications: [
          {
            id: testId,
            title: 'টেস্ট আজান — মুসলিম রিমাইন্ডার',
            body: 'আলহামদুলিল্লাহ! ১০ সেকেন্ড পরের টেস্ট আজান সফলভাবে সম্পন্ন হয়েছে। ওয়াক্ত অনুযায়ী ব্যাকগ্রাউন্ডে আজান বাজবে।',
            schedule: {
              at: testTime,
              allowWhileIdle: true // Wakes device and fires even when screen is locked
            },
            channelId: 'adhan',
            sound: 'adhan', // Refers to res/raw/adhan.mp3 without extension
            smallIcon: 'ic_launcher_round',
            iconColor: '#064e3b',
            extra: {
              type: 'test_adhan_10s',
              sound: 'adhan'
            }
          }
        ]
      });

      return {
        success: true,
        scheduledTime: testTime,
        isNative: true
      };
    } catch (err: any) {
      console.warn('Native test adhan schedule error:', err);
      return {
        success: false,
        scheduledTime: testTime,
        isNative: true,
        error: err?.message || 'টেস্ট শিডিউল করতে সমস্যা হয়েছে।'
      };
    }
  }

  // Web Browser fallback
  setTimeout(() => {
    soundManager.playPrayerAlert('azan_makkah');
    sendWebNotification(
      'টেস্ট আজান — মুসলিম রিমাইন্ডার',
      'ওয়েব ব্রাউজারে ১০ সেকেন্ড পরের টেস্ট আজান সফল হয়েছে। অ্যান্ড্রয়েড অ্যাপে এটি সরাসরি অ্যালার্ম ম্যানেজারে বাজবে।'
    );
  }, 10000);

  return {
    success: true,
    scheduledTime: testTime,
    isNative: false
  };
}

/**
 * Send an immediate test prayer notification (used by SettingsView).
 * Fires right now with the selected Muazzin sound, so the user can verify
 * notification + sound without waiting.
 */
export async function sendTestPrayerNotification(
  soundId?: PrayerAlertSound
): Promise<{ success: boolean; isNative: boolean; error?: string }> {
  triggerHaptic([100, 50, 100]);

  const title = 'টেস্ট নোটিফিকেশন — মুসলিম রিমাইন্ডার';
  const body = 'আলহামদুলিল্লাহ! নোটিফিকেশন সফলভাবে কাজ করছে। ওয়াক্ত হলে এভাবেই আজানসহ নোটিফিকেশন আসবে।';

  if (Capacitor.isNativePlatform()) {
    try {
      await initNativeNotificationChannels();
      const perms = await requestAllNotificationPermissions();
      if (!perms.notificationsGranted) {
        return {
          success: false,
          isNative: true,
          error: 'নোটিফিকেশন অনুমতি প্রদান করা হয়নি।'
        };
      }

      const { channelId, sound } = resolveChannelAndSound(soundId || 'azan_makkah');
      const notifId = 99991;

      await LocalNotifications.cancel({
        notifications: [{ id: notifId }]
      }).catch(() => {});

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: {
              at: new Date(Date.now() + 1000),
              allowWhileIdle: true
            },
            channelId,
            sound,
            smallIcon: 'ic_launcher_round',
            iconColor: '#064e3b',
            extra: {
              type: 'test_prayer_notification',
              sound
            }
          }
        ]
      });

      return { success: true, isNative: true };
    } catch (err: any) {
      console.warn('sendTestPrayerNotification error:', err);
      return {
        success: false,
        isNative: true,
        error: err?.message || 'টেস্ট নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।'
      };
    }
  }

  // Web browser fallback
  try {
    soundManager.playPrayerAlert(soundId || 'azan_makkah');
    sendWebNotification(title, body);
    return { success: true, isNative: false };
  } catch (err: any) {
    return {
      success: false,
      isNative: false,
      error: err?.message || 'টেস্ট নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।'
    };
  }
}

/**
 * Send an immediate notification (Unified for Native and Web).
 */
export async function sendUnifiedNotification(
  title: string,
  body: string,
  channelId: string = 'prayer_reminder',
  soundId?: PrayerAlertSound
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await initNativeNotificationChannels();
      const notifId = Math.floor(Date.now() % 100000) + 1;
      const { channelId: targetChannel, sound } = resolveChannelAndSound(soundId);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: soundId ? targetChannel : channelId,
            sound: soundId ? sound : undefined,
            smallIcon: 'ic_launcher_round',
            iconColor: '#064e3b',
            extra: { type: 'immediate' }
          }
        ]
      });
      return;
    } catch (err) {
      console.warn('Native notification send notice:', err);
    }
  }

  // Fallback to Web Notification
  sendWebNotification(title, body, '/icons/icon-192x192.png', false);
}

/**
 * Cancel all scheduled local notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.cancelAll().catch(() => {});
  }
}

/**
 * Attach native notification listeners (Foreground & Tap Handling).
 */
export function setupNativeNotificationListeners(
  onNavigateToPrayers?: () => void
): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let receivedHandle: { remove: () => void } | null = null;
  let actionHandle: { remove: () => void } | null = null;

  // When notification is delivered while the app is active/foreground
  LocalNotifications.addListener('localNotificationReceived', (notification) => {
    try {
      const extra = notification.extra;
      if (extra?.type === 'prayer_azan' && extra.sound) {
        soundManager.playPrayerAlert(extra.sound as PrayerAlertSound);
        triggerHaptic([120, 60, 120]);
      }
    } catch {}
  }).then((handle) => {
    receivedHandle = handle;
  });

  // When user taps on notification in the Android notification bar
  LocalNotifications.addListener('localNotificationActionPerformed', () => {
    try {
      if (onNavigateToPrayers) {
        onNavigateToPrayers();
      }
    } catch {}
  }).then((handle) => {
    actionHandle = handle;
  });

  return () => {
    if (receivedHandle) receivedHandle.remove();
    if (actionHandle) actionHandle.remove();
  };
}
