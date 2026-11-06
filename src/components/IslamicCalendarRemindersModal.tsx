import React, { useState, useMemo } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Send,
  Sparkles,
  Sun,
  X
} from 'lucide-react';
import { UserSettings, SunnahFastingAlertsToggles } from '../types';
import { getHijriDate, toBengaliDigits } from '../utils/prayerTimes';
import {
  DEFAULT_SUNNAH_FASTING_TOGGLES,
  getUpcomingAyyamAlBeedWindow,
  getUpcomingIslamicSpecialDays,
  IslamicSpecialDayEvent
} from '../utils/sunnahFasting';
import {
  requestNotificationPermission,
  sendNotification,
  soundManager,
  triggerHaptic
} from '../utils/audio';

interface IslamicCalendarRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
}

const GREGORIAN_MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const WEEKDAYS_SHORT_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export const IslamicCalendarRemindersModal: React.FC<IslamicCalendarRemindersModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [testToastText, setTestToastText] = useState<string | null>(null);
  const [customSubscribedIds, setCustomSubscribedIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('waqto_islamic_special_day_reminders_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const hijriAdj = settings.hijriDayAdjustment || 0;
  const sunnahToggles: SunnahFastingAlertsToggles = {
    ...DEFAULT_SUNNAH_FASTING_TOGGLES,
    ...(settings.sunnahFastingAlerts || {})
  };

  const ayyamWindow = useMemo(() => {
    return getUpcomingAyyamAlBeedWindow(new Date(), hijriAdj);
  }, [hijriAdj]);

  const specialDays = useMemo(() => {
    return getUpcomingIslamicSpecialDays(new Date(), hijriAdj);
  }, [hijriAdj]);

  // Monthly Calendar Grid calculation
  const calendarData = useMemo(() => {
    const now = new Date();
    const viewMonthDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1, 12, 0, 0);
    const year = viewMonthDate.getFullYear();
    const month = viewMonthDate.getMonth();
    const firstDayWeekIdx = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const startHijri = getHijriDate(new Date(year, month, 1, 12, 0, 0), hijriAdj);
    const endHijri = getHijriDate(new Date(year, month, daysInMonth, 12, 0, 0), hijriAdj);
    const hijriMonthSpanBn =
      startHijri.monthNameBn === endHijri.monthNameBn
        ? `${startHijri.monthNameBn} ${toBengaliDigits(startHijri.year)} হিজরি`
        : `${startHijri.monthNameBn} – ${endHijri.monthNameBn} ${toBengaliDigits(endHijri.year)} হিজরি`;

    const days: Array<{
      dayNumber: number;
      dayNumberBn: string;
      hijriDay: number;
      hijriDayBn: string;
      hijriMonthBn: string;
      isToday: boolean;
      isAyyamAlBeed: boolean;
      isMonThu: boolean;
      specialLabelBn: string | null;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d, 12, 0, 0);
      const h = getHijriDate(dateObj, hijriAdj);
      const isToday =
        d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      const isAyyamAlBeed = h.monthIndex !== 8 && (h.day === 13 || h.day === 14 || h.day === 15);
      const w = dateObj.getDay();
      const isMonThu = h.monthIndex !== 8 && (w === 1 || w === 4);

      let specialLabelBn: string | null = null;
      if (h.monthIndex === 0 && h.day === 10) specialLabelBn = 'পবিত্র আশুরা';
      else if (h.monthIndex === 2 && h.day === 12) specialLabelBn = 'সিরাতুন্নবী (সা.)';
      else if (h.monthIndex === 6 && h.day === 27) specialLabelBn = 'শবে মেরাজ';
      else if (h.monthIndex === 7 && h.day === 15) specialLabelBn = 'মধ্য শাবান';
      else if (h.monthIndex === 8 && h.day === 1) specialLabelBn = '১লা রমজান';
      else if (h.monthIndex === 8 && h.day === 27) specialLabelBn = 'শবে কদর';
      else if (h.monthIndex === 9 && h.day === 1) specialLabelBn = 'ঈদুল ফিতর';
      else if (h.monthIndex === 11 && h.day === 9) specialLabelBn = 'আরাফার রোজা';
      else if (h.monthIndex === 11 && h.day === 10) specialLabelBn = 'ঈদুল আযহা';
      else if (isAyyamAlBeed) specialLabelBn = `আইয়ামে বীজ (${toBengaliDigits(h.day)} ${h.monthNameBn})`;

      days.push({
        dayNumber: d,
        dayNumberBn: toBengaliDigits(d),
        hijriDay: h.day,
        hijriDayBn: toBengaliDigits(h.day),
        hijriMonthBn: h.monthNameBn,
        isToday,
        isAyyamAlBeed,
        isMonThu,
        specialLabelBn
      });
    }

    return {
      monthTitleBn: `${GREGORIAN_MONTHS_BN[month]} ${toBengaliDigits(year)}`,
      hijriMonthSpanBn,
      firstDayWeekIdx,
      days
    };
  }, [calendarMonthOffset, hijriAdj]);

  if (!isOpen) return null;

  const isEventReminderEnabled = (ev: IslamicSpecialDayEvent): boolean => {
    if (ev.toggleKey) {
      return sunnahToggles[ev.toggleKey] !== false;
    }
    return customSubscribedIds[ev.id] !== false;
  };

  const handleToggleEventReminder = async (ev: IslamicSpecialDayEvent) => {
    triggerHaptic(25);
    if (!settings.sunnahFastingNotificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        onUpdateSettings({
          notificationsEnabled: true,
          sunnahFastingNotificationsEnabled: true
        });
      } else {
        onUpdateSettings({
          sunnahFastingNotificationsEnabled: true
        });
      }
    }

    if (ev.toggleKey) {
      const nextVal = !sunnahToggles[ev.toggleKey];
      onUpdateSettings({
        sunnahFastingAlerts: {
          ...sunnahToggles,
          [ev.toggleKey]: nextVal
        }
      });
    } else {
      const nextVal = customSubscribedIds[ev.id] === false ? true : false;
      const updated = { ...customSubscribedIds, [ev.id]: nextVal };
      setCustomSubscribedIds(updated);
      try {
        localStorage.setItem('waqto_islamic_special_day_reminders_v1', JSON.stringify(updated));
      } catch {}
    }
  };

  const handleTriggerLiveNotification = async (ev: IslamicSpecialDayEvent) => {
    triggerHaptic([30, 50, 30]);
    const granted = await requestNotificationPermission();
    if (granted && !settings.sunnahFastingNotificationsEnabled) {
      onUpdateSettings({
        notificationsEnabled: true,
        sunnahFastingNotificationsEnabled: true
      });
    }
    if (settings.soundEnabled) {
      soundManager.playPrayerChime();
    }
    sendNotification(ev.titleBn, ev.notificationMessageBn);
    setTestToastText(`${ev.titleBn}: “${ev.notificationMessageBn}”`);
    setTimeout(() => setTestToastText(null), 4000);
  };

  const enabledRemindersCount = specialDays.filter((e) => isEventReminderEnabled(e)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#f7faf8] dark:bg-[#0c120f] w-full max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-emerald-500/25 flex flex-col overflow-hidden">
        {/* Top Close Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#088a58] text-white border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-300" />
            <span className="text-xs sm:text-sm font-bold">
              ইসলামী বিশেষ দিনের ক্যালেন্ডার ও রিমাইন্ডার
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-4">

          {/* Live Test Notification Feedback Banner */}
          {testToastText && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-950 dark:text-emerald-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0 animate-bounce" />
                <span className="font-semibold">{testToastText}</span>
              </div>
              <button
                onClick={() => setTestToastText(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Master Reminder Switch & Timing Control */}
          <div className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-[#177a56] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    স্বয়ংক্রিয় ক্যালেন্ডার রিমাইন্ডার
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    আইয়ামে বীজ ও বিশেষ দিনের আগের দিন সন্ধ্যায় এবং সেহরির পূর্বে অ্যালার্ট ({toBengaliDigits(enabledRemindersCount)}টি সক্রিয়)
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!settings.sunnahFastingNotificationsEnabled}
                  onChange={async (e) => {
                    const enable = e.target.checked;
                    triggerHaptic(20);
                    if (enable) {
                      await requestNotificationPermission();
                      onUpdateSettings({
                        sunnahFastingNotificationsEnabled: true,
                        notificationsEnabled: true
                      });
                    } else {
                      onUpdateSettings({ sunnahFastingNotificationsEnabled: false });
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#177a56]" />
              </label>
            </div>
          </div>

          {/* 3. Interactive Monthly Hijri & Gregorian Calendar Highlighting Ayyam al-Beed */}
          <div className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCalendarMonthOffset((p) => p - 1)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
                title="পূর্ববর্তী মাস"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {calendarData.monthTitleBn}
                </h4>
                <span className="text-[11px] font-semibold text-[#177a56] dark:text-emerald-400">
                  {calendarData.hijriMonthSpanBn}
                </span>
              </div>

              <button
                onClick={() => setCalendarMonthOffset((p) => p + 1)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
                title="পরবর্তী মাস"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-stone-500 dark:text-stone-400 pb-1 border-b border-stone-100 dark:border-stone-800">
              {WEEKDAYS_SHORT_BN.map((wd) => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: calendarData.firstDayWeekIdx }).map((_, idx) => (
                <div key={`empty_${idx}`} className="h-11" />
              ))}

              {calendarData.days.map((d) => {
                let cellClass =
                  'bg-stone-50/70 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200 border border-transparent';

                if (d.isToday) {
                  cellClass =
                    'bg-[#177a56] text-white font-bold shadow-xs border-[#177a56]';
                } else if (d.isAyyamAlBeed) {
                  cellClass =
                    'bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border border-emerald-500/50 font-bold';
                } else if (d.specialLabelBn) {
                  cellClass =
                    'bg-amber-100/80 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-400/50 font-bold';
                } else if (d.isMonThu) {
                  cellClass =
                    'bg-stone-100 dark:bg-stone-800/70 text-stone-900 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700';
                }

                return (
                  <div
                    key={d.dayNumber}
                    title={
                      d.specialLabelBn
                        ? `${d.specialLabelBn} (${d.hijriDayBn} ${d.hijriMonthBn})`
                        : `${d.hijriDayBn} ${d.hijriMonthBn}`
                    }
                    className={`h-11 rounded-xl flex flex-col items-center justify-center leading-tight transition-colors ${cellClass}`}
                  >
                    <span className="text-xs font-mono tabular-nums font-bold">
                      {d.dayNumberBn}
                    </span>
                    <span
                      className={`text-[9px] font-mono tabular-nums ${
                        d.isToday
                          ? 'text-amber-200'
                          : d.isAyyamAlBeed
                          ? 'text-[#177a56] dark:text-emerald-300 font-bold'
                          : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {d.hijriDayBn} হিজরি
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>আইয়ামে বীজ (১৩, ১৪, ১৫ হিজরি)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>বিশেষ ইসলামী দিন</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                <span>সোম ও বৃহস্পতি</span>
              </div>
            </div>
          </div>

          {/* 4. Upcoming Special Islamic Days & Fasting Reminders List */}
          <div className="bg-white dark:bg-[#131b17] rounded-2xl p-4 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  আসন্ন ইসলামী বিশেষ দিন ও রোজার তালিকা
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  তারিখ ও ফজিলত দেখে আপনার পছন্দের দিনগুলোতে রিমাইন্ডার সক্রিয় রাখুন
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {specialDays.map((ev) => {
                const isEnabled = isEventReminderEnabled(ev);

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl border transition-all space-y-2 bg-stone-50/70 dark:bg-stone-900/50 border-stone-200/80 dark:border-stone-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                            {ev.titleBn}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#177a56] dark:text-emerald-400">
                            ·{' '}
                            {ev.daysRemaining === 0
                              ? 'আজ'
                              : ev.daysRemaining === 1
                              ? 'আগামীকাল'
                              : `${toBengaliDigits(ev.daysRemaining)} দিন বাকি`}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          <span>{ev.gregorianDateLabelBn}</span>
                          <span className="mx-1.5">·</span>
                          <span>{ev.hijriDateLabelBn}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTriggerLiveNotification(ev)}
                          className="px-2 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#177a56] dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                          title="এই রিমাইন্ডারের টেস্ট অ্যালার্ট পাঠান"
                        >
                          <Send className="w-3 h-3" />
                          <span>টেস্ট</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEventReminder(ev)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            isEnabled
                              ? 'bg-[#177a56] text-white shadow-2xs'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>{isEnabled ? 'সক্রিয়' : 'চালু করুন'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-200 font-medium leading-relaxed bg-white/80 dark:bg-stone-950/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800/80">
                      “{ev.notificationMessageBn}”
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-0.5">
                      <span className="line-clamp-1">{ev.virtueBn}</span>
                      <span className="shrink-0 ml-2 font-semibold text-stone-600 dark:text-stone-300">
                        {ev.hadithRefBn}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
