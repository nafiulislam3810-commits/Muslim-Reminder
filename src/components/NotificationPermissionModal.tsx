import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  Clock, 
  BatteryCharging, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Settings,
  Volume2,
  Check
} from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { 
  requestAllNotificationPermissions, 
  requestExactAlarmSetting,
  schedule10SecondTestAdhan 
} from '../utils/nativeNotifications';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
  notificationGranted: boolean;
  exactAlarmGranted: boolean;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
  notificationGranted,
  exactAlarmGranted
}) => {
  const [requesting, setRequesting] = useState(false);
  const [deniedExplanation, setDeniedExplanation] = useState(false);
  const [expandedOem, setExpandedOem] = useState<'xiaomi' | 'samsung' | 'oppo' | null>(null);

  // 10-Second Test Adhan state
  const [isSchedulingTest, setIsSchedulingTest] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestPermissions = async () => {
    triggerHaptic(25);
    setRequesting(true);
    setTestResultMsg(null);

    try {
      const res = await requestAllNotificationPermissions();
      setRequesting(false);

      if (res.notificationsGranted && res.exactAlarmGranted) {
        triggerHaptic([60, 40, 60]);
        if (onPermissionGranted) onPermissionGranted();
        onClose();
      } else {
        triggerHaptic(40);
        setDeniedExplanation(true);
      }
    } catch {
      setRequesting(false);
      setDeniedExplanation(true);
    }
  };

  const handleOpenExactSetting = async () => {
    triggerHaptic(20);
    await requestExactAlarmSetting();
  };

  const handleStart10SecondTest = async () => {
    triggerHaptic(30);
    setIsSchedulingTest(true);
    setTestResultMsg(null);

    const res = await schedule10SecondTestAdhan();
    setIsSchedulingTest(false);

    if (res.success) {
      setTestResultMsg('১০ সেকেন্ড পরের টেস্ট আজান শিডিউল করা হয়েছে! এখন ফোন লক বা স্ক্রিন অফ করে পরীক্ষা করুন।');
      setTestCountdown(10);

      const interval = setInterval(() => {
        setTestCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTestResultMsg(res.error || 'টেস্ট শিডিউল করতে ব্যর্থ হয়েছে। পারমিশন অন করুন।');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="fixed inset-0 cursor-pointer" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div 
        className="relative z-10 w-full max-w-lg rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/15 dark:border-emerald-500/25 p-5 sm:p-6 shadow-2xl space-y-4 text-left my-auto animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/25 flex items-center justify-center text-[#177a56] dark:text-emerald-400 shrink-0 shadow-xs">
            <Bell className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#177a56] dark:text-emerald-400 block">
              আজান ও ওয়াক্ত সতর্কতা
            </span>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-50 leading-tight">
              সঠিক সময়ে আজান পেতে অনুমতি দিন
            </h3>
          </div>
        </div>

        {/* Overview Notice */}
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          আপনার ফোন বন্ধ থাকলে বা স্ক্রিন অফ থাকলেও ৫ ওয়াক্ত নামাজের সঠিক সময়ে আজানের মিষ্টি ধ্বনি ও নোটিফিকেশন পেতে অ্যান্ড্রয়েডের দুটি অনুমতি প্রয়োজন:
        </p>

        {/* Permission items list */}
        <div className="space-y-2 text-xs sm:text-sm">
          {/* Permission 1: Notification */}
          <div className={`p-3 rounded-2xl border transition-all ${
            notificationGranted 
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
          }`}>
            <div className="flex items-start gap-2.5">
              {notificationGranted ? (
                <CheckCircle2 className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="font-bold">১. নোটিফিকেশন অনুমতি (POST_NOTIFICATIONS)</strong>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    notificationGranted 
                      ? 'bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200' 
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}>
                    {notificationGranted ? 'অনুমোদিত' : 'অনুমতি প্রয়োজন'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-normal">
                  ওয়াক্তের সময় ফোনের স্ট্যাটাস বারে নোটিফিকেশন প্রদর্শন এবং আজানের সাউন্ড প্লে করার জন্য।
                </p>
              </div>
            </div>
          </div>

          {/* Permission 2: Exact Alarm */}
          <div className={`p-3 rounded-2xl border transition-all ${
            exactAlarmGranted 
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200'
          }`}>
            <div className="flex items-start gap-2.5">
              {exactAlarmGranted ? (
                <CheckCircle2 className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="font-bold">২. সঠিক অ্যালার্ম (SCHEDULE_EXACT_ALARM)</strong>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    exactAlarmGranted 
                      ? 'bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200' 
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}>
                    {exactAlarmGranted ? 'অনুমোদিত' : 'অনুমতি প্রয়োজন'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-normal">
                  অ্যান্ড্রয়েড ১২+ এ স্লিপ মোডেও এক সেকেন্ড বিলম্ব না করে নির্ধারিত মিনিটে আজান বাজার জন্য।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* If permissions denied or explanation requested */}
        {deniedExplanation && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>অনুমতি এখনও সম্পূর্ণ হয়নি!</strong>
                <p className="text-[11px] leading-relaxed mt-0.5 text-rose-700 dark:text-rose-300">
                  নিচের বোতামে ট্যাপ করে ফোনের Settings &gt; Apps &gt; Muslim Reminder-এ যান। সেখানে <b>Notifications</b> চালু করুন এবং <b>Alarms &amp; reminders</b> অনুমোদন করুন।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenExactSetting}
              className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ফোনের সেটিংসে যান ও চালু করুন</span>
            </button>
          </div>
        )}

        {/* 10-Second Test Adhan verification card (Requirement 8) */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                দ্রুত পরীক্ষা: ১০ সেকেন্ড পর টেস্ট আজান
              </span>
            </div>
            {testCountdown !== null && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-500 text-white rounded-md animate-pulse">
                {testCountdown}s
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
            বোতামে চাপ দিয়ে ফোন লক করুন। ১০ সেকেন্ড পর স্ক্রিন অফ থাকলেও আজান বেজে উঠবে।
          </p>
          <button
            type="button"
            disabled={isSchedulingTest || testCountdown !== null}
            onClick={handleStart10SecondTest}
            className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {testCountdown !== null
                ? `আজান বাজতে বাকি ${testCountdown} সেকেন্ড... (ফোন লক করুন)`
                : isSchedulingTest
                ? 'শিডিউল হচ্ছে...'
                : '১০ সেকেন্ড পর টেস্ট আজান বাজান'}
            </span>
          </button>
          {testResultMsg && (
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium text-center">
              {testResultMsg}
            </p>
          )}
        </div>

        {/* Battery Optimization Guidance Accordion (Requirement 7 - Xiaomi/Samsung/Oppo) */}
        <div className="border border-stone-200 dark:border-stone-800 rounded-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-bold">
            <BatteryCharging className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>ব্যাটারি অপটিমাইজেশন বন্ধের নির্দেশিকা (Xiaomi/Samsung/Oppo)</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
            Android-এর পাওয়ার সেভার যাতে আজানের অ্যালার্ম বাতিল না করে দেয়, এজন্য আপনার ফোনের ব্র্যান্ড অনুযায়ী সেটিংস করুন:
          </p>

          <div className="space-y-1.5 pt-1">
            {/* Xiaomi */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedOem(expandedOem === 'xiaomi' ? null : 'xiaomi')}
                className="w-full py-2 px-3 flex items-center justify-between font-bold text-[11px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-900/40 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <span>📱 Xiaomi / Redmi / POCO (MIUI / HyperOS)</span>
                {expandedOem === 'xiaomi' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {expandedOem === 'xiaomi' && (
                <div className="p-2.5 text-[11px] text-stone-600 dark:text-stone-300 bg-white dark:bg-[#131b17] space-y-1 leading-relaxed">
                  <p>১. ফোনের <b>Security App</b> &gt; <b>Manage Apps</b> &gt; <b>Muslim Reminder</b>-এ যান।</p>
                  <p>২. <b>Autostart (অটোস্টার্ট)</b> চালু করুন।</p>
                  <p>৩. Battery Saver-এ গিয়ে <b>No restrictions (কোনো সীমাবদ্ধতা নেই)</b> নির্বাচন করুন।</p>
                </div>
              )}
            </div>

            {/* Samsung */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedOem(expandedOem === 'samsung' ? null : 'samsung')}
                className="w-full py-2 px-3 flex items-center justify-between font-bold text-[11px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-900/40 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <span>📱 Samsung (One UI)</span>
                {expandedOem === 'samsung' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {expandedOem === 'samsung' && (
                <div className="p-2.5 text-[11px] text-stone-600 dark:text-stone-300 bg-white dark:bg-[#131b17] space-y-1 leading-relaxed">
                  <p>১. <b>Settings</b> &gt; <b>Apps</b> &gt; <b>Muslim Reminder</b> &gt; <b>Battery</b>-তে যান।</p>
                  <p>২. <b>Unrestricted (সীমাহীন)</b> সিলেক্ট করুন।</p>
                  <p>৩. Device Care &gt; Battery &gt; Background usage limits &gt; <b>Never sleeping apps</b>-এ যোগ করুন।</p>
                </div>
              )}
            </div>

            {/* Oppo / Vivo / Realme */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedOem(expandedOem === 'oppo' ? null : 'oppo')}
                className="w-full py-2 px-3 flex items-center justify-between font-bold text-[11px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-900/40 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <span>📱 Oppo / Realme / Vivo / OnePlus</span>
                {expandedOem === 'oppo' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {expandedOem === 'oppo' && (
                <div className="p-2.5 text-[11px] text-stone-600 dark:text-stone-300 bg-white dark:bg-[#131b17] space-y-1 leading-relaxed">
                  <p>১. <b>Settings</b> &gt; <b>Battery</b> &gt; <b>App Battery Management</b> &gt; <b>Muslim Reminder</b>-এ যান।</p>
                  <p>২. <b>Allow background activity</b> এবং <b>Allow auto-launch</b> অপশন দুটি চালু করুন।</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-stone-200 dark:border-stone-700/60"
          >
            পরে করব
          </button>

          <button
            type="button"
            disabled={requesting}
            onClick={handleRequestPermissions}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {requesting ? (
              <span>অনুমতি চাওয়া হচ্ছে...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>অনুমোদন দিন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
