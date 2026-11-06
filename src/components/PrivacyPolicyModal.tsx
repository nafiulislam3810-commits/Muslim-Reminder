import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Lock, MapPin, Bell, Trash2, Globe, HeartHandshake, X } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountDeletion?: () => void;
}

/**
 * Google Play Store 2026 Compliant In-App Privacy Policy.
 * Fully transparent, covering location, exact alarm, account deletion, and data safety.
 */
export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenAccountDeletion
}) => {
  if (!isOpen) return null;

  const handleDismiss = () => {
    triggerHaptic(15);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleDismiss} 
        aria-hidden="true" 
      />

      <div 
        className="relative z-10 w-full max-w-lg max-h-[88vh] rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/25 shadow-2xl flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200/70 dark:border-stone-800/80 flex items-center justify-between shrink-0 bg-stone-50/70 dark:bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/25 flex items-center justify-center text-[#177a56] dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-stone-50 leading-tight">
                গোপনীয়তা নীতি (Privacy Policy)
              </h3>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Muslim Reminder · সংস্করণ ২০২৬ নীতিসম্মত
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-all cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
          <p className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/20 text-[#177a56] dark:text-emerald-300 font-medium text-xs">
            ‘Muslim Reminder (মুসলিম রিমাইন্ডার)’ অ্যাপটি আপনার গোপনীয়তা ও ব্যক্তিগত তথ্যের নিরাপত্তাকে সর্বোচ্চ অগ্রাধিকার দেয়। আমরা কোনো বিভ্রান্তিকর ডেটা সংগ্রহ করি না।
          </p>

          {/* Section 1: Location */}
          <div className="space-y-1.5 border-b border-stone-200/50 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold">
              <MapPin className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
              <h4>১. অবস্থান তথ্য (Location Policy)</h4>
            </div>
            <p>
              • <strong>শুধুমাত্র ফোরগ্রাউন্ডে (Foreground Only):</strong> আপনার অবস্থান শুধুমাত্র অ্যাপ চালু থাকা অবস্থায় আপনার অনুমতিক্রমে ব্যবহার করা হয়। অ্যাপ কখনোই ব্যাকগ্রাউন্ডে লোকেশন ট্র্যাক করে না।<br />
              • <strong>উদ্দেশ্য:</strong> আপনার ভৌগোলিক অক্ষাংশ-দ্রাঘিমাংশের ওপর ভিত্তি করে সূর্যোদয়, সূর্যাস্ত, সেহরি-ইফতার এবং ৫ ওয়াক্ত সালাতের সঠিক মিনিট ও কিবলার ডিগ্রি নির্ধারণ।<br />
              • <strong>বিকল্প ব্যবস্থা:</strong> লোকেশন না দিয়েও আপনি যেকোনো সময় বাংলাদেশের ৬৪টি জেলা থেকে ম্যানুয়ালি নিজের শহর নির্বাচন করতে পারেন।
            </p>
          </div>

          {/* Section 2: Exact Alarm */}
          <div className="space-y-1.5 border-b border-stone-200/50 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold">
              <Bell className="w-4 h-4 text-amber-500" />
              <h4>২. অ্যালার্ম ও ওয়াক্ত নোটিফিকেশন (Exact Alarm Policy)</h4>
            </div>
            <p>
              • <strong>SCHEDULE_EXACT_ALARM:</strong> অ্যান্ড্রয়েডের ব্যাটারি সেভারের কারণে ওয়াক্তের সময় যেন আজান মিস না হয়, সেজন্য নির্ধারিত সময়ে সিস্টেম অ্যালার্ম ব্যবহৃত হয়।<br />
              • এটি ব্যাকগ্রাউন্ডে সার্বক্ষণিক রান করে না, বরং ওয়াক্ত শুরু হওয়ার ঠিক মুহূর্তে সতর্কবার্তা পাঠিয়ে সমাপ্ত হয়।
            </p>
          </div>

          {/* Section 3: Data Collection & Storage */}
          <div className="space-y-1.5 border-b border-stone-200/50 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4>৩. তথ্যের ব্যবহার ও ক্লাউড সিঙ্ক</h4>
            </div>
            <p>
              • <strong>অ্যাকাউন্ট তথ্য:</strong> আপনি যখন গুগল সাইন-ইন বা ইমেইল দিয়ে লগইন করেন, তখন আপনার নাম, ইমেইল এবং আপনার আমল ট্র্যাকার, বুকমার্ক ও কয়েন Firebase-এর নিরাপদ ডেটাবেজে সংরক্ষিত হয় যাতে ফোন পরিবর্তন করলেও আপনার ডেটা নষ্ট না হয়।<br />
              • <strong>কোনো বিজ্ঞাপন নেই:</strong> এই অ্যাপে কোনো থার্ড-পার্টি বাণিজ্যিক বিজ্ঞাপনী ট্র্যাকার বা ডেটা ব্রোকার নেই।
            </p>
          </div>

          {/* Section 4: Account Deletion */}
          <div className="space-y-1.5 border-b border-stone-200/50 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <h4>৪. অ্যাকাউন্ট ডিলিটেশন ও ডেটা মুছে ফেলা (Account Deletion)</h4>
            </div>
            <p>
              Google Play নীতিমালার পূর্ণ সম্মতিতে, আপনি যেকোনো সময় অ্যাপের প্রোফাইল বা সেটিংস থেকে <strong>“অ্যাকাউন্ট মুছে ফেলুন (Delete Account)”</strong> বাটনে চাপ দিয়ে আপনার সম্পূর্ণ অ্যাকাউন্ট, প্রোফাইল, লিডারবোর্ড রেকর্ড ও সমস্ত ধর্মীয় ডেটা স্থায়ীভাবে ডিলিট করে দিতে পারেন।
            </p>
            {onOpenAccountDeletion && (
              <button
                type="button"
                onClick={() => {
                  handleDismiss();
                  onOpenAccountDeletion();
                }}
                className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-bold underline cursor-pointer hover:text-rose-700"
              >
                এখানে ক্লিক করে অ্যাকাউন্ট ডিলিটেশন পেজে যান &rarr;
              </button>
            )}
          </div>

          {/* Section 5: Children & Safety */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold">
              <HeartHandshake className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
              <h4>৫. নিরাপত্তা, ধর্মীয় অডিও স্বত্ব ও যোগাযোগ</h4>
            </div>
            <p>
              • <strong>আজান ও তিলাওয়াত অডিও:</strong> অ্যাপে ব্যবহৃত আজানের সুরসমূহ উন্মুক্ত পাবলিক দ্বীনি প্রচার ও ওয়াকফের অংশ হিসেবে শুধুমাত্র নামাজের ওয়াক্তের সতর্কবার্তার কাজে ব্যবহৃত।<br />
              • <strong>নিরাপত্তা:</strong> এই অ্যাপটি সব বয়সের মুসলিম ব্যবহারকারীদের জন্য সম্পূর্ণ নিরাপদ ও বিজ্ঞাপনমুক্ত। আপনার কোনো মতামত বা গোপনীয়তা সংক্রান্ত অনুসন্ধানের জন্য আমাদের সাথে যোগাযোগ করতে পারেন।<br />
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono block mt-1">
                ইমেইল সাপোর্ট: support@muslimreminder.app · শেষ আপডেট: নভেম্বর ২০২৬
              </span>
            </p>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200/70 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-900/60 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-[0.99] text-center"
          >
            বুঝেছি ও বন্ধ করুন
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
