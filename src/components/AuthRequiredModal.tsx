import React from 'react';
import { createPortal } from 'react-dom';
import { LogIn, ShieldAlert, X } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface AuthRequiredModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void; // User clicked "লগইন করুন" (OK)
  onCancel: () => void;  // User clicked "এখন নয়" (Cancel)
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  title = 'লগইন প্রয়োজন',
  message = 'ডেটা সংরক্ষণের জন্য লগইন করুন',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    triggerHaptic(20);
    onConfirm();
  };

  const handleCancel = () => {
    triggerHaptic(15);
    onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop tap to dismiss */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/25 p-5 sm:p-6 shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          aria-label="বন্ধ করুন"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Header */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-[#177a56] dark:text-emerald-400 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-stone-900 dark:text-stone-50 leading-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-[#177a56] dark:text-emerald-400">
            {message}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal pt-1">
            আপনার নামাজ, আমল ট্র্যাকার, বুকমার্ক এবং অর্জিত নেক আমল ও কয়েন আজীবনের জন্য সুরক্ষিত রাখতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {/* Cancel button: "এখন নয়" */}
          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-2.5 px-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-stone-200 dark:border-stone-700/60 active:scale-[0.98]"
          >
            এখন নয়
          </button>

          {/* Confirm button: "লগইন করুন" */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#177a56] hover:bg-[#126446] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>লগইন করুন</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
