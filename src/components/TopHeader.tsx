import React from 'react';
import { Flame, Bell } from 'lucide-react';
import { District, UserSettings } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { WaqtoLogo } from './WaqtoLogo';

interface TopHeaderProps {
  district?: District;
  settings?: UserSettings;
  streakDays?: number;
  totalPoints?: number;
  onOpenDistrictModal?: () => void;
  onOpenSearch?: () => void;
  onOpenDeenNavigator?: () => void;
  onOpenCalendarReminders?: () => void;
  onToggleSound?: () => void;
  onOpenQibla?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToRanking?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = React.memo(({
  district,
  settings,
  streakDays = 1,
  totalPoints = 120,
  onOpenDistrictModal,
  onOpenSearch,
  onOpenDeenNavigator,
  onOpenCalendarReminders,
  onToggleSound,
  onOpenQibla,
  onNavigateToProfile,
  onNavigateToRanking
}) => {
  const lastTriggerTimeRef = React.useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const handleAction = (id: string, action?: () => void) => {
    if (!action) return;
    const now = Date.now();
    if (lastTriggerTimeRef.current.id === id && now - lastTriggerTimeRef.current.time < 300) {
      return;
    }
    lastTriggerTimeRef.current = { id, time: now };
    action();
  };

  return (
    <header 
      style={{ touchAction: 'none' }}
      className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#131b17] text-stone-900 dark:text-stone-100 border-b border-emerald-950/10 dark:border-emerald-500/15 shadow-[0_2px_10px_rgba(0,0,0,0.04)] pt-[env(safe-area-inset-top,0px)] gpu-layer select-none pointer-events-auto"
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        {/* Zone 1: Wordmark & Brand Identity */}
        <div className="flex items-center gap-2 shrink-0">
          <WaqtoLogo size={36} className="shadow-xs" />
          <div className="flex flex-col justify-center">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#177a56] dark:text-emerald-400 select-none leading-tight">
              Muslim Reminder
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 select-none leading-none mt-0.5">
              মুসলিম রিমাইন্ডার
            </span>
          </div>
        </div>

        {/* Zone 2: Streak & Notification Bell on Right Side */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Streak & Points Pill */}
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.pointerType === 'touch' || e.button === 0) {
                handleAction('streak', onNavigateToRanking || onNavigateToProfile);
              }
            }}
            onClick={() => handleAction('streak', onNavigateToRanking || onNavigateToProfile)}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/50 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer"
            title="আপনার স্ট্রিক ও দ্বীনি পয়েন্ট"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-mono tabular-nums">{toBengaliDigits(streakDays)} দিন</span>
          </button>

          {/* Islamic Special Days Calendar Reminder Bell (Rightmost item) */}
          {onOpenCalendarReminders && (
            <button
              type="button"
              onPointerDown={(e) => {
                if (e.pointerType === 'touch' || e.button === 0) {
                  handleAction('calendar', onOpenCalendarReminders);
                }
              }}
              onClick={() => handleAction('calendar', onOpenCalendarReminders)}
              style={{ touchAction: 'manipulation' }}
              className="relative w-9 h-9 rounded-full bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-500/25 text-[#177a56] dark:text-emerald-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0"
              title="ইসলামী বিশেষ দিনের ক্যালেন্ডার রিমাইন্ডার"
              aria-label="ইসলামী বিশেষ দিনের রিমাইন্ডার"
            >
              <Bell className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-mono text-[10px] font-black flex items-center justify-center shadow-2xs border-2 border-white dark:border-[#131b17]">
                ১
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
