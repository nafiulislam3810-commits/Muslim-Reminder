import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Undo2, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  ChevronsUpDown, 
  Star, 
  X, 
  Check, 
  BookOpen, 
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toBengaliDigits } from '../utils/prayerTimes';
import { soundManager, triggerHaptic } from '../utils/audio';
import { useSync } from '../context/SyncContext';
import { fastTap } from '../utils/fastTap';

interface TasbihViewProps {
  onBack: () => void;
}

export interface DhikrItem {
  id: string;
  arabic: string;
  nameBn: string;
  meaningBn: string;
  defaultTarget: number;
  rewardBn?: string;
}

export const DHIKR_LIST: DhikrItem[] = [
  {
    id: 'astagfirullah',
    arabic: 'أَسْتَغْفِرُ ٱللَّٰهَ',
    nameBn: 'আস্তাগফিরুল্লাহ',
    meaningBn: 'আমি আল্লাহর কাছে ক্ষমা চাই',
    defaultTarget: 33,
    rewardBn: 'প্রতি ১০০ বারে গুনাহ মাফ ও অন্তরের প্রশান্তি'
  },
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ ٱللَّٰهِ',
    nameBn: 'সুবহানাল্লাহ',
    meaningBn: 'আল্লাহ অতি পবিত্র ও মহান',
    defaultTarget: 33,
    rewardBn: 'জান্নাতে একটি খেজুর গাছ রোপণ করা হয়'
  },
  {
    id: 'alhamdulillah',
    arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
    nameBn: 'আলহামদুলিল্লাহ',
    meaningBn: 'সকল প্রশংসা কেবল আল্লাহর জন্য',
    defaultTarget: 33,
    rewardBn: 'মিজানের পাল্লা নেকিতে পরিপূর্ণ করে দেয়'
  },
  {
    id: 'allahuakbar',
    arabic: 'ٱللَّٰهُ أَكْبَرُ',
    nameBn: 'আল্লাহু আকবার',
    meaningBn: 'আল্লাহ সর্বশ্রেষ্ঠ',
    defaultTarget: 34,
    rewardBn: 'আসমান ও জমিনের মধ্যবর্তী স্থান পূর্ণ করে'
  },
  {
    id: 'lailahaillallah',
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
    nameBn: 'লা ইলাহা ইল্লাল্লাহ',
    meaningBn: 'আল্লাহ ছাড়া সত্য কোনো উপাস্য নেই',
    defaultTarget: 100,
    rewardBn: 'সর্বশ্রেষ্ঠ জিকির ও জান্নাতের চাবিকাঠি'
  },
  {
    id: 'durood',
    arabic: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    nameBn: 'আল্লাহুম্মা সাল্লি আলা মুহাম্মদ',
    meaningBn: 'হে আল্লাহ! মুহাম্মদের ওপর রহমত বর্ষণ করুন',
    defaultTarget: 100,
    rewardBn: 'একবার পাঠে ১০টি রহমত, ১০টি গুনাহ মাফ ও ১০টি মর্যাদা বৃদ্ধি'
  },
  {
    id: 'subhanallahi_bihamdihi',
    arabic: 'سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ',
    nameBn: 'সুবহানাল্লাহি ওয়া বিহামদিহী',
    meaningBn: 'আল্লাহর প্রশংসাসহ তাঁর পবিত্রতা ঘোষণা করছি',
    defaultTarget: 100,
    rewardBn: 'দিনে ১০০ বার পাঠে সমুদ্রের ফেনা পরিমাণ গুনাহও মাফ হয়'
  },
  {
    id: 'hawqala',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ',
    nameBn: 'লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ',
    meaningBn: 'আল্লাহর সাহায্য ছাড়া কোনো শক্তি বা সামর্থ্য নেই',
    defaultTarget: 100,
    rewardBn: 'জান্নাতের অমূল্য রত্নভাণ্ডারের একটি'
  },
  {
    id: 'hasbunallah',
    arabic: 'حَسْبُنَا ٱللَّٰهُ وَنِعْمَ ٱلْوَكِيلُ',
    nameBn: 'হাসবুনাল্লাহু ওয়া নিমাল ওয়াকিল',
    meaningBn: 'আল্লাহই আমাদের জন্য যথেষ্ট এবং তিনিই উত্তম কর্মবিধায়ক',
    defaultTarget: 100,
    rewardBn: 'সকল বিপদ-আপদ ও দুশ্চিন্তা থেকে মুক্তির মহাঔষধ'
  },
  {
    id: 'yunus_dua',
    arabic: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَٰنَكَ إِنِّي كُنتُ مِنَ ٱلظَّٰلِمِينَ',
    nameBn: 'দোয়া ইউনুস',
    meaningBn: 'তুমি ছাড়া সত্য কোনো উপাস্য নেই, তুমি পবিত্র; নিশ্চয় আমি সীমালঙ্ঘনকারীদের অন্তর্ভুক্ত',
    defaultTarget: 100,
    rewardBn: 'কঠিন বিপদ ও সংকট থেকে নিস্তার লাভের পরীক্ষিত আমল'
  }
];

const TARGET_OPTIONS = [33, 99, 100, Infinity];

export const TasbihView: React.FC<TasbihViewProps> = ({ onBack }) => {
  const { amalRecords, saveAmalRecord } = useSync();

  // Storage state initialization
  const [selectedDhikrId, setSelectedDhikrId] = useState<string>(() => {
    try {
      return localStorage.getItem('waqto_tasbih_selected_id') || DHIKR_LIST[0].id;
    } catch {
      return DHIKR_LIST[0].id;
    }
  });

  const selectedDhikr = DHIKR_LIST.find(d => d.id === selectedDhikrId) || DHIKR_LIST[0];

  const [target, setTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('waqto_tasbih_target');
      if (saved === 'infinity') return Infinity;
      if (saved) return parseInt(saved, 10);
      return selectedDhikr.defaultTarget;
    } catch {
      return selectedDhikr.defaultTarget;
    }
  });

  // Continuous count displayed on center button
  const [count, setCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`waqto_tasbih_curr_${selectedDhikrId}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Track all-time count per dhikr
  const [dhikrCounts, setDhikrCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('waqto_tasbih_dhikr_totals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Audio & Haptic preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('waqto_tasbih_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('waqto_tasbih_vibrate') !== 'false';
    } catch {
      return true;
    }
  });

  // UI modal and animation states
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const [isTappedAnim, setIsTappedAnim] = useState(false);
  const [coinNotification, setCoinNotification] = useState<string | null>(null);
  const tapAnimTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Today key for Amal Sync
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayAmalCount = amalRecords[todayKey]?.tasbihCount || 0;
  const allTimeTotal = Object.values(dhikrCounts).reduce((acc, c) => acc + c, 0);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('waqto_tasbih_selected_id', selectedDhikrId);
      localStorage.setItem(`waqto_tasbih_curr_${selectedDhikrId}`, count.toString());
      localStorage.setItem('waqto_tasbih_target', target === Infinity ? 'infinity' : target.toString());
      localStorage.setItem('waqto_tasbih_dhikr_totals', JSON.stringify(dhikrCounts));
      localStorage.setItem('waqto_tasbih_sound', soundEnabled.toString());
      localStorage.setItem('waqto_tasbih_vibrate', vibrateEnabled.toString());
    } catch (e) {
      console.warn('Tasbih storage error:', e);
    }
  }, [selectedDhikrId, count, target, dhikrCounts, soundEnabled, vibrateEnabled]);

  // Completed laps calculation based on continuous count and target
  // Completed laps calculation based on continuous count and target
  const completedLaps = target === Infinity ? 0 : Math.floor(count / target);
  const currentLapProgress = target === Infinity ? count % 100 : count % target;
  const progressPercent = target === Infinity ? (currentLapProgress / 100) * 100 : (currentLapProgress / target) * 100;

  // Refs for debouncing single taps and picker toggles
  const lastTapTimeRef = useRef<number>(0);
  const lastPickerToggleRef = useRef<number>(0);

  // Handle tap increment (Strict single increment per touch)
  const handleTap = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    const now = Date.now();
    // Eliminate double-tap increment (ignore triggers within 110ms)
    if (now - lastTapTimeRef.current < 110) return;
    lastTapTimeRef.current = now;

    if (vibrateEnabled) {
      triggerHaptic(22);
    }
    if (soundEnabled) {
      soundManager.playTasbihClick(880 + (count % 33) * 10);
    }

    // Trigger visual scale animation on button
    setIsTappedAnim(true);
    if (tapAnimTimeoutRef.current) clearTimeout(tapAnimTimeoutRef.current);
    tapAnimTimeoutRef.current = setTimeout(() => setIsTappedAnim(false), 90);

    // Trigger subtle ripple pulse
    const rippleId = Date.now();
    setRipples(prev => [...prev.slice(-2), rippleId]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r !== rippleId));
    }, 550);

    const nextCount = count + 1;

    // Update dhikr count
    setDhikrCounts(prev => ({
      ...prev,
      [selectedDhikrId]: (prev[selectedDhikrId] || 0) + 1
    }));

    // Update today's amalRecord
    const currentRec = amalRecords[todayKey] || {
      dateKey: todayKey,
      prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      morningAzkarDone: false,
      eveningAzkarDone: false,
      fastingDone: false,
      sadaqahDone: false,
      tasbihCount: 0
    };
    saveAmalRecord({
      ...currentRec,
      tasbihCount: (currentRec.tasbihCount || 0) + 1
    });

    // Check if a lap cycle was completed
    if (target !== Infinity && nextCount % target === 0) {
      if (vibrateEnabled) {
        triggerHaptic([40, 60, 40]);
      }
      setCoinNotification(`+৫০ কয়েন অর্জিত! (${toBengaliDigits(target)} বার সম্পন্ন)`);
      setTimeout(() => setCoinNotification(null), 2400);

      try {
        confetti({
          particleCount: 26,
          spread: 55,
          origin: { y: 0.65 },
          colors: ['#177a56', '#10b981', '#f59e0b', '#ffffff']
        });
      } catch {}
    }

    setCount(nextCount);
  };

  // Decrement by 1 (Undo)
  const handleDecrement = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (count > 0) {
      if (vibrateEnabled) triggerHaptic(18);
      setCount(prev => prev - 1);
      setDhikrCounts(prev => ({
        ...prev,
        [selectedDhikrId]: Math.max(0, (prev[selectedDhikrId] || 0) - 1)
      }));
    }
  };

  // Reset current count
  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (vibrateEnabled) triggerHaptic(30);
    setCount(0);
  };

  // Open Dhikr Picker Modal with cooldown to prevent ghost clicks
  const handleOpenPicker = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const now = Date.now();
    if (now - lastPickerToggleRef.current < 350) return;
    lastPickerToggleRef.current = now;
    setIsPickerOpen(true);
  };

  // Select a new Dhikr (closes modal and locks against ghost reopening)
  const handleSelectDhikr = (dhikr: DhikrItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    lastPickerToggleRef.current = Date.now();
    setSelectedDhikrId(dhikr.id);
    const savedCurr = parseInt(localStorage.getItem(`waqto_tasbih_curr_${dhikr.id}`) || '0', 10);
    setCount(savedCurr);
    setTarget(dhikr.defaultTarget);
    setIsPickerOpen(false);
    if (vibrateEnabled) triggerHaptic(20);
  };

  // Coins earned today from Tasbih (50 coins per 100, max 300 daily)
  const todayCoins = Math.min(300, Math.floor(todayAmalCount / 100) * 50);

  return (
    <div className="min-h-screen bg-[#f7faf8] dark:bg-[#0c120f] text-stone-900 dark:text-stone-100 select-none pb-28 pt-2 px-3 sm:px-4 max-w-md mx-auto flex flex-col space-y-3.5 animate-fadeIn">
      {/* Coin notification toast */}
      {coinNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-amber-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 border border-amber-300 shadow-xl whitespace-nowrap">
            <Coins className="w-4 h-4 fill-white animate-spin" />
            <span>{coinNotification}</span>
          </div>
        </div>
      )}

      {/* Top Header: Back Button, Title, and Audio/Haptic Controls */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 text-stone-700 dark:text-stone-200 hover:text-[#177a56] transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
            title="ফিরে যান"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-none">
            তাসবিহ
          </h1>
        </div>

        {/* Audio & Haptic Toggle Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/30 text-[#177a56] dark:text-emerald-400'
                : 'bg-white dark:bg-[#131b17] border-stone-200 dark:border-stone-800 text-stone-400'
            }`}
            title={soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
            aria-label="সাউন্ড টগল"
          >
            {soundEnabled ? (
              <Volume2 className="w-4.5 h-4.5 stroke-[2.2]" />
            ) : (
              <VolumeX className="w-4.5 h-4.5 stroke-[2]" />
            )}
          </button>

          <button
            onClick={() => setVibrateEnabled(prev => !prev)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
              vibrateEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/30 text-[#177a56] dark:text-emerald-400'
                : 'bg-white dark:bg-[#131b17] border-stone-200 dark:border-stone-800 text-stone-400'
            }`}
            title={vibrateEnabled ? 'ভাইব্রেশন বন্ধ করুন' : 'ভাইব্রেশন চালু করুন'}
            aria-label="ভাইব্রেশন টগল"
          >
            <Smartphone className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Reward Banner */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-500/20 rounded-2xl py-2 px-3 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-2xs">
        <Coins className="w-4 h-4 text-amber-500 shrink-0" />
        <span>পুরস্কার: প্রতি ১০০ বার = ৫০ কয়েন</span>
      </div>

      {/* Active Dhikr Showcase Card with Arabic Calligraphy */}
      <div 
        onClick={handleOpenPicker}
        style={{ touchAction: 'manipulation' }}
        className="cursor-pointer bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs hover:border-[#177a56]/40 transition-all select-none group"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-[#177a56] dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <span>{selectedDhikr.nameBn}</span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-[#177a56] dark:text-emerald-400" />
          </div>
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 group-hover:text-[#177a56] transition-colors">
            জিকির পরিবর্তন করুন ▾
          </span>
        </div>

        {/* Large Arabic Calligraphy */}
        <div className="text-center py-2">
          <p className="font-arabic text-3xl sm:text-4xl text-[#177a56] dark:text-emerald-400 font-bold tracking-normal leading-relaxed drop-shadow-2xs">
            {selectedDhikr.arabic}
          </p>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-medium mt-1">
            “{selectedDhikr.meaningBn}”
          </p>
        </div>

        {selectedDhikr.rewardBn && (
          <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            <Star className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate">{selectedDhikr.rewardBn}</span>
          </div>
        )}
      </div>

      {/* Target Options Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
          লক্ষ্য নির্ধারণ:
        </span>
        <div className="flex items-center gap-1.5">
          {TARGET_OPTIONS.map((opt) => {
            const isSelected = target === opt;
            const label = opt === Infinity ? 'সীমাহীন' : `${toBengaliDigits(opt)}`;
            return (
              <button
                key={opt.toString()}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTarget(opt);
                  if (vibrateEnabled) triggerHaptic(18);
                }}
                style={{ touchAction: 'manipulation' }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#177a56] text-white shadow-xs'
                    : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CIRCULAR DIAL TASBIH COUNTER CARD */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-5 border border-emerald-950/8 dark:border-emerald-500/15 shadow-sm flex flex-col items-center space-y-4">
        {/* LARGE CIRCULAR COUNTER WITH DYNAMIC PROGRESS RING */}
        <div className="relative flex items-center justify-center py-2 select-none">
          {/* Ripple wave rings on tap */}
          {ripples.map((id) => (
            <span
              key={id}
              className="absolute w-60 h-60 sm:w-68 sm:h-68 rounded-full border-2 border-[#177a56]/40 dark:border-emerald-400/30 animate-ping pointer-events-none"
            />
          ))}

          {/* SVG Progress Ring */}
          {(() => {
            const radius = 104;
            const circumference = 2 * Math.PI * radius; // ~653.45
            const clampedProgress = Math.min(100, Math.max(0, progressPercent));
            const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
            const angleInDeg = (clampedProgress / 100) * 360 - 90;
            const angleInRad = (angleInDeg * Math.PI) / 180;
            const dotX = 125 + radius * Math.cos(angleInRad);
            const dotY = 125 + radius * Math.sin(angleInRad);

            return (
              <svg 
                className="w-64 h-64 sm:w-72 sm:h-72 pointer-events-none select-none" 
                viewBox="0 0 250 250"
              >
                {/* Background track circle */}
                <circle
                  cx="125"
                  cy="125"
                  r={radius}
                  className="stroke-emerald-100 dark:stroke-emerald-950/80"
                  strokeWidth="7"
                  fill="none"
                />
                {/* Active animated progress stroke */}
                <circle
                  cx="125"
                  cy="125"
                  r={radius}
                  className="stroke-[#177a56] dark:stroke-emerald-400 transition-all duration-150"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 125 125)"
                />
                {/* Rotating progress knob dot */}
                {clampedProgress > 0 && (
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r="6.5"
                    className="fill-[#177a56] dark:fill-emerald-400 stroke-white dark:stroke-[#131b17] stroke-2 shadow-sm transition-all duration-150"
                  />
                )}
              </svg>
            );
          })()}

          {/* THE MAIN TAP DIAL: Shows ONLY the count and "বার" */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={handleTap}
              style={{ touchAction: 'manipulation' }}
              className={`w-48 h-48 sm:w-54 sm:h-54 rounded-full bg-gradient-to-b from-emerald-50/90 to-emerald-100/60 dark:from-emerald-950/40 dark:to-[#0f1713] border-4 border-emerald-500/25 hover:border-emerald-500/40 dark:border-emerald-500/30 shadow-[inset_0_3px_10px_rgba(23,122,86,0.12),0_10px_28px_rgba(23,122,86,0.14)] flex flex-col items-center justify-center cursor-pointer select-none transition-transform duration-75 ${
                isTappedAnim ? 'scale-[0.94]' : 'scale-100'
              }`}
              aria-label="তাসবিহ গণনা ট্যাপ করুন"
            >
              <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-[#177a56] dark:text-emerald-400 leading-none select-none drop-shadow-2xs">
                {toBengaliDigits(count)}
              </span>
              <span className="text-sm sm:text-base font-bold text-stone-600 dark:text-stone-300 mt-2 select-none">
                বার
              </span>
            </button>
          </div>
        </div>

        {/* Info Badges: Target and Completed Laps */}
        <div className="flex items-center justify-center gap-3 w-full pt-1">
          <div className="px-3.5 py-1.5 rounded-xl bg-stone-100/80 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 shadow-2xs">
            <span>⚑ লক্ষ্য: {target === Infinity ? 'সীমাহীন' : `${toBengaliDigits(target)} বার`}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-stone-100/80 dark:bg-stone-850 border border-stone-200/70 dark:border-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5 shadow-2xs">
            <span>সম্পূর্ণ চক্র: {toBengaliDigits(completedLaps)}</span>
          </div>
        </div>

        {/* Quick Action Controls: [ ↶ -১ ] and [ 🔄 শূন্য করুন ] */}
        <div className="flex items-center justify-center gap-3 w-full pt-1">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={count === 0}
            style={{ touchAction: 'manipulation' }}
            className={`flex-1 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer select-none ${
              count === 0
                ? 'bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-stone-400 cursor-not-allowed opacity-60'
                : 'bg-white dark:bg-[#131b17] border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-850 active:scale-95'
            }`}
            title="১ বিয়োগ করুন (Undo)"
          >
            <Undo2 className="w-4 h-4" />
            <span>↶ -১</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{ touchAction: 'manipulation' }}
            className="flex-1 py-2.5 rounded-2xl bg-white dark:bg-[#131b17] border border-stone-200 dark:border-stone-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer select-none active:scale-95"
            title="গণনা শূন্য করুন (Reset)"
          >
            <RotateCcw className="w-4 h-4" />
            <span>🔄 শূন্য করুন</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Cards: 3 Columns */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="bg-white dark:bg-[#131b17] rounded-2xl p-3 border border-emerald-950/8 dark:border-emerald-500/15 shadow-2xs">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            আজকের মোট
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-[#177a56] dark:text-emerald-400">
            {toBengaliDigits(todayAmalCount)}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131b17] rounded-2xl p-3 border border-emerald-950/8 dark:border-emerald-500/15 shadow-2xs">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            আজকের লক্ষ্য
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-amber-500">
            {toBengaliDigits(todayAmalCount)}/৫০০
          </span>
        </div>

        <div className="bg-white dark:bg-[#131b17] rounded-2xl p-3 border border-emerald-950/8 dark:border-emerald-500/15 shadow-2xs">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 block mb-0.5 font-medium">
            সর্বমোট
          </span>
          <span className="text-lg sm:text-xl font-black font-mono text-stone-900 dark:text-stone-100">
            {toBengaliDigits(Math.max(allTimeTotal, todayAmalCount))}
          </span>
        </div>
      </div>

      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/15 rounded-2xl p-2.5 text-center text-xs text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs">
        প্রতি ১০০ বার তাসবিহে ৫০ পয়েন্ট (দিনে সর্বোচ্চ ৫০০)
      </div>

      {/* Dhikr Selector Bottom Sheet Modal: Rendered in Portal with z-[9999] completely above BottomNav */}
      {isPickerOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#131b17] rounded-t-3xl sm:rounded-3xl max-h-[82vh] flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 animate-slideUp overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top drag handle indicator */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
                    জিকির নির্বাচন করুন
                  </h3>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    ক্লিক করে আপনার পছন্দের জিকির বেছে নিন
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Dhikr List with bottom padding so bottom nav or screen edge never interferes */}
            <div className="p-3 overflow-y-auto space-y-2 pb-10 max-h-[62vh] overscroll-contain">
              {DHIKR_LIST.map((item) => {
                const isSelected = item.id === selectedDhikrId;
                const countThisDhikr = dhikrCounts[item.id] || 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => handleSelectDhikr(item, e)}
                    style={{ touchAction: 'manipulation' }}
                    className={`w-full p-3.5 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-[#177a56] shadow-2xs'
                        : 'bg-stone-50/70 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-800/80 border border-stone-200/60 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {item.nameBn}
                        </span>
                        {isSelected && (
                          <span className="p-0.5 rounded-full bg-[#177a56] text-white">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                        )}
                      </div>
                      <p className="font-arabic text-base sm:text-lg text-[#177a56] dark:text-emerald-400 font-medium my-0.5">
                        {item.arabic}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                        {item.meaningBn}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shadow-2xs">
                        {toBengaliDigits(countThisDhikr)} বার
                      </span>
                      <span className="block text-[10px] text-stone-400 mt-1">
                        টার্গেট: {toBengaliDigits(item.defaultTarget)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
