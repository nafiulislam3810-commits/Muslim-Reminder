import React from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ShieldCheck, Compass, CheckCircle2, X } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface LocationDisclosureModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Google Play Store Policy Compliant Prominent In-App Disclosure for Location.
 * Displays BEFORE the Android/browser runtime permission prompt is triggered.
 * Clarifies foreground-only usage, zero remote tracking, and manual alternative.
 */
export const LocationDisclosureModal: React.FC<LocationDisclosureModalProps> = ({
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
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/25 flex items-center justify-center text-[#177a56] dark:text-emerald-400 shrink-0 shadow-xs">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#177a56] dark:text-emerald-400 block">
              Google Play নীতিসম্মত ঘোষণা
            </span>
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-50 leading-tight">
              লোকেশন তথ্যের ব্যবহার ও গোপনীয়তা
            </h3>
          </div>
        </div>

        {/* Core Disclosure Statements */}
        <div className="space-y-2.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-stone-50/80 dark:bg-stone-900/50 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
          <div className="flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-[#177a56] dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">নামাজের সঠিক ওয়াক্ত ও কিবলা:</strong> আপনার বর্তমান অক্ষাংশ ও দ্রাঘিমাংশের ভিত্তিতে সেহরি, ইফতার, ৫ ওয়াক্ত নামাজের সঠিক মিনিট ও কিবলার দিক গণনার জন্য লোকেশন প্রয়োজন।
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">শুধুমাত্র অ্যাপ চলাকালীন (Foreground):</strong> এই অ্যাপ কখনোই ব্যাকগ্রাউন্ডে আপনার লোকেশন ট্র্যাক করে না। শুধুমাত্র আপনি যখন জিপিএস অপশনটি চালু করবেন তখনই এটি ব্যবহৃত হয়।
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">সম্পূর্ণ গোপনীয় ও নিরাপদ:</strong> আপনার অবস্থানের তথ্য ডিভাইসের বাইরে কোনো সার্ভারে সংরক্ষণ করা হয় না এবং কোনো বিজ্ঞাপনী সংস্থার সাথে শেয়ার করা হয় না।
            </p>
          </div>
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
          * আপনি অনুমতি না দিতে চাইলে যেকোনো সময় ৬৪টি জেলার তালিকা থেকে ম্যানুয়ালি আপনার জেলা বেছে নিতে পারেন।
        </p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-stone-200 dark:border-stone-700/60"
          >
            এখন নয় (জেলা বাছুন)
          </button>

          <button
            type="button"
            onClick={handleAgree}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <span>সম্মত ও অনুমতি দিন</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
