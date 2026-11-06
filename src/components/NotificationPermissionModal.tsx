import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  Clock, 
  BatteryCharging, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  X, 
  Smartphone, 
  Volume2, 
  ShieldCheck, 
  RefreshCw,
  Play
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { 
  checkNotificationPermissionStatus, 
  checkExactAlarmPermissionStatus, 
  requestAllNotificationPermissions, 
  requestExactAlarmSetting,
  schedule10SecondTestAdhan
} from '../utils/nativeNotifications';
import { triggerHaptic } from '../utils/audio';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionsUpdated
}) => {
  const [notifGranted, setNotifGranted] = useState<boolean>(false);
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(true);
  const [activeBrandTab, setActiveBrandTab] = useState<'xiaomi' | 'samsung' | 'oppo' | 'general'>('xiaomi');
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  // Check current permission statuses on modal open
  const checkStatuses = async () => {
    setChecking(true);
    const n = await checkNotificationPermissionStatus();
    const e = await checkExactAlarmPermissionStatus();
    setNotifGranted(n);
    setExactAlarmGranted(e);
    setChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatuses();
    }
  }, [isOpen]);

  // Request all permissions
  const handleRequestPermissions = async () => {
    triggerHaptic(30);
    const result = await requestAllNotificationPermissions();
    setNotifGranted(result.notificationsGranted);
    setExactAlarmGranted(result.exactAlarmGranted);

    if (onPermissionsUpdated) {
      onPermissionsUpdated();
    }

    if (result.notificationsGranted && result.exactAlarmGranted) {
      triggerHaptic([100, 50, 100]);
    }
  };

  // Open exact alarm setting intent on Android 12+
  const handleOpenExactAlarmSetting = async () => {
    triggerHaptic(20);
    await requestExactAlarmSetting();
    setTimeout(() => {
      checkStatuses();
    }, 2000);
  };

  // Requirement 8: 10-Second Test Adhan
  const handleRun10SecTest = async () => {
    triggerHaptic(40);
    setTestStatusMsg('শিডিউল হচ্ছে...');
    const res = await schedule10SecondTestAdhan();
    if (!res.success) {
      setTestStatusMsg(res.error || 'টেস্ট শিডিউল করতে ব্যর্থ হয়েছে।');
      return;
    }

    setTestStatusMsg('শিডিউল সফল! ১০ সেকেন্ড পর আজান ও নোটিফিকেশন আসবে। ফোন লক বা স্ক্রিন অফ করে পরীক্ষা করতে পারেন...');
    setTestCountdown(10);

    const interval = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTestStatusMsg('আজান বাজছে / সম্পন্ন হয়েছে!');
          setTimeout(() => {
            setTestCountdown(null);
            setTestStatusMsg(null);
          }, 6000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div 
        className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/15 dark:border-emerald-500/30 p-5 sm:p-6 shadow-2xl space-y-4 text-left text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-xs">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 block">
              আজান ও ওয়াক্ত নোটিফিকেশন অনুমতি
            </span>
            <h3 className="text-base sm:text-lg font-black leading-tight text-stone-900 dark:text-white">
              সঠিক সময়ে আজান ও নোটিফিকেশন নিশ্চিত করুন
            </h3>
          </div>
        </div>

        {/* Key explanation */}
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-900/60 p-3 rounded-2xl border border-stone-200/60 dark:border-stone-800">
          অ্যাপ বন্ধ থাকলে বা <strong>ফোনের স্ক্রিন অফ (লক)</strong> থাকলেও ৫ ওয়াক্ত নামাজের সঠিক সময়ে আজানের অডিও বাজাতে এবং নোটিফিকেশন পেতে অ্যান্ড্রয়েডের দুটি অনুমতি চালু থাকা জরুরি:
        </p>

        {/* Permission Status Badges & Action Buttons */}
        <div className="space-y-2.5">
          {/* 1. Notification Permission */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${notifGranted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs sm:text-sm block">১. নোটিফিকেশন অনুমতি (POST_NOTIFICATIONS)</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                  {notifGranted ? 'অনুমতি সচল রয়েছে' : 'নামাজের নোটিফিকেশন স্ট্যাটাস বারে দেখানোর জন্য আবশ্যক'}
                </span>
              </div>
            </div>

            {notifGranted ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-bold shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                অনুমোদিত
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermissions}
                className="px-3 py-1.5 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                অনুমতি দিন
              </button>
            )}
          </div>

          {/* 2. Exact Alarm Permission (Android 12+) */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${exactAlarmGranted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs sm:text-sm block">২. সঠিক সময়ে অ্যালার্ম (SCHEDULE_EXACT_ALARM)</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                  {exactAlarmGranted ? 'সঠিক অ্যালার্ম পারমিশন সক্রিয়' : 'Android 12+ এ স্লিপ মোডেও দেরিমুক্ত আজানের জন্য আবশ্যক'}
                </span>
              </div>
            </div>

            {exactAlarmGranted ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-bold shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                সক্রিয়
              </span>
            ) : (
              <button
                type="button"
                onClick={handleOpenExactAlarmSetting}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>অন করুন</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 10-Second Test Adhan Button (Requirement 8) */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                ১০ সেকেন্ড পর টেস্ট আজান পরীক্ষা করুন
              </span>
            </div>
            <button
              type="button"
              disabled={testCountdown !== null}
              onClick={handleRun10SecTest}
              className="py-1.5 px-3 rounded-xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              {testCountdown !== null ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{testCountdown} সেকেন্ড...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>টেস্ট চালান</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-normal">
            বাটন চাপার পর <strong>ফোন লক বা স্ক্রিন অফ করে রাখুন</strong>। ঠিক ১০ সেকেন্ড পর সাউন্ড ও নোটিফিকেশন আসে কি না তাৎক্ষণিক যাচাই করতে পারেন।
          </p>

          {testStatusMsg && (
            <div className="text-[11px] p-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800 font-semibold text-emerald-900 dark:text-emerald-200 animate-in fade-in">
              {testStatusMsg}
            </div>
          )}
        </div>

        {/* OEM Battery Optimization Guide Tabs (Xiaomi, Samsung, Oppo, General) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
              ফোনের ব্যাটারি অপটিমাইজেশন বন্ধের নিয়ম
            </h4>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
            কিছু ফোনে স্ক্রিন লক থাকলে ব্যাকগ্রাউন্ড অ্যালার্ম বন্ধ হয়ে যায়। আপনার ফোনের ব্যান্ড অনুযায়ী নিচের সেটিংসটি নিশ্চিত করুন:
          </p>

          {/* Brand Selection Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl text-xs font-bold text-center">
            <button
              type="button"
              onClick={() => setActiveBrandTab('xiaomi')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'xiaomi' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500 dark:text-stone-400'}`}
            >
              Xiaomi
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('samsung')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'samsung' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500 dark:text-stone-400'}`}
            >
              Samsung
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('oppo')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'oppo' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500 dark:text-stone-400'}`}
            >
              Oppo/Vivo
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('general')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'general' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500 dark:text-stone-400'}`}
            >
              অন্যান্য
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
            {activeBrandTab === 'xiaomi' && (
              <>
                <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                  <span>Xiaomi / Redmi / POCO (MIUI ও HyperOS):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>ফোনের <strong>Security</strong> অ্যাপ ওপেন করুন &gt; <strong>Manage Apps</strong>-এ যান।</li>
                  <li><strong>Muslim Reminder</strong> খুঁজে বের করে <strong>Autostart (অটোস্টার্ট)</strong> চালু করুন।</li>
                  <li>একই পেজে নিচে <strong>Battery Saver</strong>-এ গিয়ে <strong>No restrictions</strong> নির্বাচন করুন।</li>
                  <li>রিসেন্ট অ্যাপস স্ক্রিনে Muslim Reminder চেপে ধরে <strong>Lock (লক)</strong> আইকনে চাপ দিন।</li>
                </ol>
              </>
            )}

            {activeBrandTab === 'samsung' && (
              <>
                <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                  <span>Samsung Galaxy (One UI):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>ফোনের <strong>Settings &gt; Apps &gt; Muslim Reminder &gt; Battery</strong>-তে যান।</li>
                  <li><strong>Unrestricted (সীমাহীন)</strong> নির্বাচন করুন।</li>
                  <li><strong>Settings &gt; Device Care &gt; Battery &gt; Background usage limits</strong>-এ যান।</li>
                  <li><strong>Never sleeping apps</strong> তালিকায় Muslim Reminder যোগ করুন।</li>
                </ol>
              </>
            )}

            {activeBrandTab === 'oppo' && (
              <>
                <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Oppo, Realme, Vivo ও OnePlus:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li><strong>Settings &gt; Battery &gt; App Battery Management &gt; Muslim Reminder</strong>-এ যান।</li>
                  <li><strong>Allow background activity</strong> এবং <strong>Allow auto-launch</strong> অপশন দুটি অন করুন।</li>
                  <li>Battery Optimization অপশনে <strong>Don't optimize</strong> নির্বাচন করুন।</li>
                </ol>
              </>
            )}

            {activeBrandTab === 'general' && (
              <>
                <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-stone-500" />
                  <span>Pixel, Motorola ও স্ট্যান্ডার্ড অ্যান্ড্রয়েড:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li><strong>Settings &gt; Apps &gt; Muslim Reminder</strong>-এ যান।</li>
                  <li><strong>App battery usage</strong>-এ গিয়ে <strong>Unrestricted</strong> নির্বাচন করুন।</li>
                  <li><strong>Alarms &amp; reminders</strong> পারমিশনটি Allow রয়েছে কি না নিশ্চিত করুন।</li>
                </ol>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-stone-200 dark:border-stone-700/60"
          >
            পরে করব
          </button>

          <button
            type="button"
            onClick={async () => {
              await handleRequestPermissions();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ঠিক আছে, সম্পন্ন হয়েছে</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
