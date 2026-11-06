import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  BatteryCharging, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  Smartphone, 
  Volume2, 
  Play, 
  RefreshCw 
} from 'lucide-react';
import { triggerHaptic } from '../utils/audio';
import { schedule10SecondTestAdhan } from '../utils/nativeNotifications';

interface ExactAlarmDisclosureModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Google Play Store Policy Compliant In-App Explanation for
 * Exact Alarm (SCHEDULE_EXACT_ALARM) and Battery Optimization Exemption.
 * Includes OEM-specific steps for Xiaomi, Samsung, and Oppo/Vivo/Realme.
 */
export const ExactAlarmDisclosureModal: React.FC<ExactAlarmDisclosureModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  const [activeBrandTab, setActiveBrandTab] = useState<'xiaomi' | 'samsung' | 'oppo' | 'general'>('xiaomi');
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAgree = () => {
    triggerHaptic(25);
    onConfirm();
  };

  const handleDismiss = () => {
    triggerHaptic(15);
    onCancel();
  };

  const handleRun10SecTest = async () => {
    triggerHaptic(40);
    setTestStatusMsg('শিডিউল হচ্ছে...');
    const res = await schedule10SecondTestAdhan();
    if (!res.success) {
      setTestStatusMsg(res.error || 'টেস্ট শিডিউল করা যায়নি।');
      return;
    }

    setTestStatusMsg('১০ সেকেন্ড পর আজান বাজবে। এখন স্ক্রিন অফ করে পরীক্ষা করুন...');
    setTestCountdown(10);

    const interval = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTestStatusMsg('আজান সম্পন্ন হয়েছে!');
          setTimeout(() => {
            setTestCountdown(null);
            setTestStatusMsg(null);
          }, 5000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleDismiss} 
        aria-hidden="true" 
      />

      <div 
        className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/15 dark:border-emerald-500/30 p-5 sm:p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-150 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 block">
              সঠিক অ্যালার্ম ও ব্যাকগ্রাউন্ড নীতি
            </span>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-50 leading-tight">
              স্ক্রিন অফ থাকলেও সঠিক সময়ে আজান ও নোটিফিকেশন
            </h3>
          </div>
        </div>

        <div className="space-y-2.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-stone-50/80 dark:bg-stone-900/50 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">দেরিমুক্ত আজান (Exact Alarm):</strong> অ্যান্ড্রয়েডের স্লিপ বা ডোয (Doze) মোডেও যাতে ৫ ওয়াক্তের আজান ১ সেকেন্ডও বিলম্ব না হয়ে নির্ধারিত সময়ে বেজে ওঠে, সেজন্য 'সঠিক অ্যালার্ম' অনুমতি প্রয়োজন।
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <BatteryCharging className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">ব্যাটারি অপটিমাইজেশন:</strong> ফোনের আগ্রাসী ব্যাটারি সেভার যেন আজানের অ্যালার্ম বন্ধ না করে দেয়, এজন্য এটিকে অপটিমাইজেশন থেকে অব্যাহতি (Unrestricted) দেওয়া প্রয়োজন।
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">ফোন রিস্টার্ট হলেও শিডিউল নিরাপদ:</strong> ফোন বন্ধ বা রিস্টার্ট হলেও অ্যাপ পুনরায় ৭ দিনের নোটিফিকেশন অ্যালার্ম ম্যানেজারে সক্রিয় রাখে।
            </p>
          </div>
        </div>

        {/* 10-Second Test Adhan Button */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                ১০ সেকেন্ড পর টেস্ট আজান পরীক্ষা
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
                  <span>{testCountdown}s...</span>
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
            বাটন চেপে ফোন লক করে রাখুন। ১০ সেকেন্ড পর আজান বাজে কি না দ্রুত নিশ্চিত করুন।
          </p>

          {testStatusMsg && (
            <div className="text-[11px] p-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800 font-semibold text-emerald-900 dark:text-emerald-200 animate-in fade-in">
              {testStatusMsg}
            </div>
          )}
        </div>

        {/* Brand Specific Battery Guide Tabs */}
        <div className="space-y-2 pt-1">
          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 block">
            আপনার ফোনের ব্যান্ড অনুযায়ী ব্যাটারি সেটিং নির্দেশিকা:
          </span>

          <div className="grid grid-cols-4 gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl text-xs font-bold text-center">
            <button
              type="button"
              onClick={() => setActiveBrandTab('xiaomi')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'xiaomi' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500'}`}
            >
              Xiaomi
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('samsung')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'samsung' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500'}`}
            >
              Samsung
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('oppo')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'oppo' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500'}`}
            >
              Oppo/Vivo
            </button>
            <button
              type="button"
              onClick={() => setActiveBrandTab('general')}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${activeBrandTab === 'general' ? 'bg-white dark:bg-[#131b17] text-[#177a56] dark:text-emerald-400 shadow-xs' : 'text-stone-500'}`}
            >
              অন্যান্য
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 space-y-1">
            {activeBrandTab === 'xiaomi' && (
              <>
                <p className="font-bold text-stone-900 dark:text-stone-100">Xiaomi / Redmi / POCO (MIUI / HyperOS):</p>
                <p>১. Security অ্যাপ &gt; Manage Apps &gt; Muslim Reminder &gt; <strong>Autostart</strong> চালু করুন।</p>
                <p>২. Battery Saver &gt; <strong>No restrictions</strong> নির্বাচন করুন।</p>
              </>
            )}
            {activeBrandTab === 'samsung' && (
              <>
                <p className="font-bold text-stone-900 dark:text-stone-100">Samsung (One UI):</p>
                <p>১. Settings &gt; Apps &gt; Muslim Reminder &gt; Battery &gt; <strong>Unrestricted</strong> সিলেক্ট করুন।</p>
                <p>২. Background usage limits &gt; <strong>Never sleeping apps</strong>-এ যুক্ত করুন।</p>
              </>
            )}
            {activeBrandTab === 'oppo' && (
              <>
                <p className="font-bold text-stone-900 dark:text-stone-100">Oppo / Realme / Vivo / OnePlus:</p>
                <p>১. Settings &gt; Battery &gt; App Battery Management &gt; Muslim Reminder-এ যান।</p>
                <p>২. <strong>Allow background activity</strong> এবং <strong>Allow auto-launch</strong> চালু করুন।</p>
              </>
            )}
            {activeBrandTab === 'general' && (
              <>
                <p className="font-bold text-stone-900 dark:text-stone-100">স্ট্যান্ডার্ড অ্যান্ড্রয়েড:</p>
                <p>Settings &gt; Apps &gt; Muslim Reminder &gt; Battery &gt; <strong>Unrestricted</strong> নির্বাচন করুন।</p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-stone-200 dark:border-stone-700/60"
          >
            বন্ধ করুন
          </button>

          <button
            type="button"
            onClick={handleAgree}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <span>সেটিংস অনুমোদন করুন</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
