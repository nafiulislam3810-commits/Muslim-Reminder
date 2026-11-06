import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { useSync } from '../context/SyncContext';
import { triggerHaptic } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

// Official Google 'G' 4-color Vector Icon
const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login'
}) => {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    resetPassword 
  } = useSync();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Field validation touch states for inline helper messages
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  if (!isOpen) return null;

  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot') => {
    triggerHaptic(15);
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordTouched(false);
  };

  const isEmailValid = (em: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim());

  // Real Google Sign-In: triggers Google's authentic account chooser for that specific device
  const handleGoogleSignIn = async () => {
    triggerHaptic(20);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await signInWithGoogle();
    setLoading(false);

    if (res.success) {
      triggerHaptic([30, 50, 30]);
      onClose();
    } else {
      if (res.error && !res.error.includes('বাতিল')) {
        triggerHaptic(40);
        setErrorMsg(res.error);
      }
    }
  };

  // Manual Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!isEmailValid(email)) {
      setErrorMsg('সঠিক ইমেইল দিন');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await signInWithEmail(email, password);
    setLoading(false);

    if (res.success) {
      triggerHaptic([30, 50, 30]);
      onClose();
    } else {
      triggerHaptic(40);
      setErrorMsg(res.error || 'লগইন ব্যর্থ হয়েছে।');
    }
  };

  // Manual Sign-Up (Registration) Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (!name.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    if (!isEmailValid(email)) {
      setErrorMsg('সঠিক ইমেইল দিন');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('পাসওয়ার্ড দুটি মেলেনি। অনুগ্রহ করে একই পাসওয়ার্ড দিন।');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await signUpWithEmail(email, password, name);
    setLoading(false);

    if (res.success) {
      triggerHaptic([30, 50, 30]);
      onClose();
    } else {
      triggerHaptic(40);
      setErrorMsg(res.error || 'অ্যাকাউন্ট তৈরি ব্যর্থ হয়েছে।');
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid(email)) {
      setErrorMsg('সঠিক ইমেইল ঠিকানা দিন');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await resetPassword(email);
    setLoading(false);

    if (res.success) {
      triggerHaptic(25);
      setSuccessMsg(`আপনার ইমেইলে (${email.trim()}) পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।`);
    } else {
      triggerHaptic(40);
      setErrorMsg(res.error || 'পাসওয়ার্ড রিসেট লিংক পাঠানো যায়নি।');
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-white dark:bg-[#101713] sm:bg-black/60 sm:backdrop-blur-xs flex items-center justify-center sm:p-4 overflow-y-auto animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md min-h-screen sm:min-h-0 bg-white dark:bg-[#131b17] sm:rounded-3xl border-0 sm:border border-emerald-950/10 dark:border-emerald-500/20 sm:shadow-2xl relative overflow-hidden flex flex-col justify-between p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar: ← লগ ইন / ← নিবন্ধন */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/80 pt-[env(safe-area-inset-top,0px)]">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              if (mode === 'forgot') {
                handleModeChange('login');
              } else {
                onClose();
              }
            }}
            className="flex items-center gap-2 py-1.5 px-1 rounded-xl text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            <span className="text-base sm:text-lg font-bold">
              {mode === 'login' && 'লগ ইন'}
              {mode === 'signup' && 'নিবন্ধন'}
              {mode === 'forgot' && 'পাসওয়ার্ড পুনরুদ্ধার'}
            </span>
          </button>
        </div>

        {/* Central Content Container */}
        <div className="py-5 sm:py-6 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          {/* Official App Logo Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src="/app-logo.png" 
              alt="Muslim Reminder" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md mb-3 border border-emerald-950/10 dark:border-emerald-500/20 drop-shadow-xs" 
            />
            
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              স্বাগতম
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-[280px]">
              {mode === 'login' && 'আপনার অ্যাকাউন্টে লগ ইন করে আমল ও তথ্য সংরক্ষণ করুন'}
              {mode === 'signup' && 'আপনার তথ্য দিয়ে নতুন অ্যাকাউন্ট খুলে আমল সংরক্ষণ করুন'}
              {mode === 'forgot' && 'আপনার অ্যাকাউন্টের ইমেইল দিন, পাসওয়ার্ড রিসেট লিংক পাঠানো হবে'}
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="leading-snug font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Success Message Box */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-snug font-medium">{successMsg}</span>
            </div>
          )}

          {/* ================= MODE: LOGIN ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input Field */}
              <div className="space-y-1">
                <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Mail className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ইমেইল"
                    className="w-full pl-3 pr-4 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                </div>
                {emailTouched && !isEmailValid(email) && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pl-2">
                    সঠিক ইমেইল দিন
                  </p>
                )}
              </div>

              {/* Password Input Field */}
              <div className="space-y-1">
                <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Lock className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onBlur={() => setPasswordTouched(true)}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড"
                    className="w-full pl-3 pr-10 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordTouched && password.length < 6 && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pl-2">
                    পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => handleModeChange('forgot')}
                  className="text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>

              {/* Primary Green "লগ ইন" Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#177a56] hover:bg-[#126446] active:scale-[0.99] text-white text-sm font-bold shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>লগইন হচ্ছে...</span>
                  </>
                ) : (
                  <span>লগ ইন</span>
                )}
              </button>

              {/* Divider: অথবা */}
              <div className="flex items-center gap-3 pt-2 pb-1">
                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                <span className="text-xs text-stone-400 font-medium">অথবা</span>
                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Real Google Sign-In Button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-[#19231e] hover:bg-stone-50 dark:hover:bg-[#202d27] border border-stone-200 dark:border-stone-700/80 shadow-xs flex items-center justify-center gap-3 text-stone-800 dark:text-stone-100 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                <GoogleGIcon className="w-5 h-5" />
                <span>Google দিয়ে লগ ইন</span>
              </button>
            </form>
          )}

          {/* ================= MODE: SIGN UP ================= */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              {/* Name Field */}
              <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                <UserIcon className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম"
                  className="w-full pl-3 pr-4 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-1">
                <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Mail className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ইমেইল"
                    className="w-full pl-3 pr-4 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                </div>
                {emailTouched && !isEmailValid(email) && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pl-2">
                    সঠিক ইমেইল দিন
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Lock className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onBlur={() => setPasswordTouched(true)}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড"
                    className="w-full pl-3 pr-10 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordTouched && password.length < 6 && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pl-2">
                    পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Lock className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড আবার দিন"
                    className="w-full pl-3 pr-4 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                </div>
                {confirmPasswordTouched && confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pl-2">
                    পাসওয়ার্ড দুটি মেলেনি
                  </p>
                )}
              </div>

              {/* Primary Green "অ্যাকাউন্ট খুলুন" Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-2xl bg-[#177a56] hover:bg-[#126446] active:scale-[0.99] text-white text-sm font-bold shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>অ্যাকাউন্ট খোলা হচ্ছে...</span>
                  </>
                ) : (
                  <span>অ্যাকাউন্ট খুলুন</span>
                )}
              </button>

              {/* Divider: অথবা */}
              <div className="flex items-center gap-3 pt-2 pb-1">
                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                <span className="text-xs text-stone-400 font-medium">অথবা</span>
                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Real Google Register Button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-[#19231e] hover:bg-stone-50 dark:hover:bg-[#202d27] border border-stone-200 dark:border-stone-700/80 shadow-xs flex items-center justify-center gap-3 text-stone-800 dark:text-stone-100 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                <GoogleGIcon className="w-5 h-5" />
                <span>Google দিয়ে নিবন্ধন</span>
              </button>
            </form>
          )}

          {/* ================= MODE: FORGOT PASSWORD ================= */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <div className="relative flex items-center bg-emerald-50/50 dark:bg-stone-900/80 rounded-2xl border border-stone-200 dark:border-stone-800 focus-within:border-[#177a56] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <Mail className="w-5 h-5 ml-4 text-stone-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ইমেইল"
                    className="w-full pl-3 pr-4 py-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#177a56] hover:bg-[#126446] active:scale-[0.99] text-white text-sm font-bold shadow-md shadow-emerald-950/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <span>রিসেট লিংক পাঠান</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="w-full text-center text-xs font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer pt-2"
              >
                ← লগ ইনে ফিরে যান
              </button>
            </form>
          )}
        </div>

        {/* Bottom Switch Footer */}
        <div className="pt-3 pb-[env(safe-area-inset-bottom,0px)] text-center text-xs text-stone-600 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800/80">
          {mode === 'login' ? (
            <p>
              অ্যাকাউন্ট নেই?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className="font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                নিবন্ধন
              </button>
            </p>
          ) : mode === 'signup' ? (
            <p>
              আগে থেকেই একাউন্ট আছে?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="font-bold text-[#177a56] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                লগ ইন
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};
