import React from 'react';
import { createPortal } from 'react-dom';
import { Clock, BatteryCharging, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface ExactAlarmDisclosureModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Google Play Store Policy Compliant In-App Explanation for
 * Exact Alarm (SCHEDULE_EXACT_ALARM) and Battery Optimization Exemption.
 */
export const ExactAlarmDisclosureModal: React.FC<ExactAlarmDisclosureModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const handleAgree = () => {
    triggerHaptic(25);
    onConfirm();
  };

  const handleDismiss = () => {
    triggerHaptic(15);
    onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleDismiss} 
        aria-hidden="true" 
      />

      <div 
        className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/25 p-5 sm:p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-150"
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

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 block">
              অ্যালার্ম ও ব্যাটারি নীতি
            </span>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-50 leading-tight">
              সঠিক সময়ে আজান ও ওয়াক্ত অ্যালার্ট
            </h3>
          </div>
        </div>

        <div className="space-y-2.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-stone-50/80 dark:bg-stone-900/50 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">দেরিমুক্ত আজান (Exact Alarm):</strong> অ্যান্ড্রয়েডের স্লিপ মোডেও যাতে ফজরের সেহরি বা ৫ ওয়াক্তের আজান ১ সেকেন্ডও বিলম্ব না হয়ে নির্ধারিত সময়ে বেজে ওঠে, সেজন্য 'সঠিক অ্যালার্ম' অনুমতি প্রয়োজন।
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <BatteryCharging className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">ব্যাটারি অপটিমাইজেশন:</strong> ফোনের ব্যাটারি সেভার যেন আজানের অ্যালার্ম বাতিল না করে দেয়, এজন্য এটিকে অপটিমাইজেশন থেকে অব্যাহতি দেওয়ার অনুরোধ করা হয়। এটি কোনো অতিরিক্ত চার্জ অপচয় করে না।
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">শুধুমাত্র নির্ধারিত ওয়াক্তে:</strong> এই সার্ভিসটি সার্বক্ষণিক ব্যাকগ্রাউন্ডে সক্রিয় থাকে না; কেবল নামাজের ৫টি ওয়াক্তে স্বয়ংক্রিয়ভাবে নোটিফিকেশন প্রদান করে বন্ধ হয়ে যায়।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-stone-200 dark:border-stone-700/60"
          >
            পরে করব
          </button>

          <button
            type="button"
            onClick={handleAgree}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <span>অনুমোদন করুন</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
