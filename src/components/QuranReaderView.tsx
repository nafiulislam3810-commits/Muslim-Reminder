import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Play, 
  Pause, 
  Bookmark, 
  Share2, 
  Copy, 
  ChevronRight,
  ArrowLeft,
  Check,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  Volume2,
  MoreVertical,
  X,
  BookOpen,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { ALL_SURAHS_META, getSurahDetails, OFFLINE_SURAHS } from '../data/quranSurahs';
import { convertQuranTranslitToBengali } from '../utils/quranTransliteration';
import { SurahDetail, Ayah, UserSettings } from '../types';
import { toBengaliDigits } from '../utils/prayerTimes';
import { soundManager, triggerHaptic } from '../utils/audio';
import { storage } from '../utils/storage';
import { useSync } from '../context/SyncContext';
import { fastTap } from '../utils/fastTap';

interface QuranReaderViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenShareModal: (content: { title: string; arabic?: string; translation: string; reference: string }) => void;
  selectedSurahNumber?: number | null;
  onSelectSurah?: (surahNumber: number | null) => void;
}

interface QuranParaMeta {
  number: number;
  nameArabic: string;
  nameBengali: string;
  startingSurahNumber: number;
  startingSurahName: string;
  startingAyahNumber: number;
}

// 30 Paras (Juz) in the Holy Quran
const ALL_PARAS_META: QuranParaMeta[] = [
  { number: 1, nameArabic: 'الم', nameBengali: 'আলিফ লাম মীম', startingSurahNumber: 1, startingSurahName: 'আল-ফাতিহা', startingAyahNumber: 1 },
  { number: 2, nameArabic: 'سَيَقُولُ', nameBengali: 'সায়াকুলু', startingSurahNumber: 2, startingSurahName: 'আল-বাকারা', startingAyahNumber: 142 },
  { number: 3, nameArabic: 'تِلْكَ الرُّسُلُ', nameBengali: 'তিলকার রুসুল', startingSurahNumber: 2, startingSurahName: 'আল-বাকারা', startingAyahNumber: 253 },
  { number: 4, nameArabic: 'لَنْ تَنَالُوا', nameBengali: 'লান তানালু', startingSurahNumber: 3, startingSurahName: 'আলে ইমরান', startingAyahNumber: 93 },
  { number: 5, nameArabic: 'وَالْمُحْصَنَاتُ', nameBengali: 'ওয়াল মুহসানাত', startingSurahNumber: 4, startingSurahName: 'আন-নিসা', startingAyahNumber: 24 },
  { number: 6, nameArabic: 'لَا يُحِبُّ اللَّهُ', nameBengali: 'লা ইউহিব্বুল্লাহ', startingSurahNumber: 4, startingSurahName: 'আন-নিসা', startingAyahNumber: 148 },
  { number: 7, nameArabic: 'وَإِذَا سَمِعُوا', nameBengali: 'ওয়া ইযা সামিউ', startingSurahNumber: 5, startingSurahName: 'আল-মায়েদা', startingAyahNumber: 82 },
  { number: 8, nameArabic: 'وَلَوْ أَنَّنَا', nameBengali: 'ওয়া লাও আন্নানা', startingSurahNumber: 6, startingSurahName: 'আল-আনআম', startingAyahNumber: 111 },
  { number: 9, nameArabic: 'قَالَ الْمَلَأُ', nameBengali: 'কালাল মালাউ', startingSurahNumber: 7, startingSurahName: 'আল-আরাফ', startingAyahNumber: 88 },
  { number: 10, nameArabic: 'وَاعْلَمُوا', nameBengali: 'ওয়া\'লামু', startingSurahNumber: 8, startingSurahName: 'আল-আনফাল', startingAyahNumber: 41 },
  { number: 11, nameArabic: 'يَعْتَذِرُونَ', nameBengali: 'ইয়া\'তাযিরুন', startingSurahNumber: 9, startingSurahName: 'আত-তাওবাহ', startingAyahNumber: 93 },
  { number: 12, nameArabic: 'وَمَا مِنْ دَابَّةٍ', nameBengali: 'ওয়া মা মিন দাব্বাহ', startingSurahNumber: 11, startingSurahName: 'হুদ', startingAyahNumber: 6 },
  { number: 13, nameArabic: 'وَمَا أُبَرِّئُ', nameBengali: 'ওয়া মা উবাররিউ', startingSurahNumber: 12, startingSurahName: 'ইউসুফ', startingAyahNumber: 53 },
  { number: 14, nameArabic: 'رُبَمَا', nameBengali: 'রুবামা', startingSurahNumber: 15, startingSurahName: 'আল-হিজর', startingAyahNumber: 2 },
  { number: 15, nameArabic: 'سُبْحَانَ الَّذِي', nameBengali: 'সুবহানাল্লাযী', startingSurahNumber: 17, startingSurahName: 'আল-ইসরা', startingAyahNumber: 1 },
  { number: 16, nameArabic: 'قَالَ أَلَمْ', nameBengali: 'ক্বালা আলাম', startingSurahNumber: 18, startingSurahName: 'আল-কাহাফ', startingAyahNumber: 75 },
  { number: 17, nameArabic: 'اقْتَرَبَ لِلنَّاسِ', nameBengali: 'ইক্বতারা বা লিন্নাস', startingSurahNumber: 21, startingSurahName: 'আল-আম্বিয়া', startingAyahNumber: 1 },
  { number: 18, nameArabic: 'قَدْ أَفْلَحَ', nameBengali: 'ক্বাদ আফলাহা', startingSurahNumber: 23, startingSurahName: 'আল-মুমিনুন', startingAyahNumber: 1 },
  { number: 19, nameArabic: 'وَقَالَ الَّذِينَ', nameBengali: 'ওয়া ক্বালাল্লাযীনা', startingSurahNumber: 25, startingSurahName: 'আল-ফুরকান', startingAyahNumber: 21 },
  { number: 20, nameArabic: 'أَمَّنْ خَلَقَ', nameBengali: 'আম্মান খালাক্বা', startingSurahNumber: 27, startingSurahName: 'আন-নামল', startingAyahNumber: 60 },
  { number: 21, nameArabic: 'اتْلُ مَا أُوحِيَ', nameBengali: 'উতলু মা উহিয়া', startingSurahNumber: 29, startingSurahName: 'আল-আনকাবুত', startingAyahNumber: 46 },
  { number: 22, nameArabic: 'وَمَنْ يَقْنُتْ', nameBengali: 'ওয়া মান ইয়াক্বনুত', startingSurahNumber: 33, startingSurahName: 'আল-আহযাব', startingAyahNumber: 31 },
  { number: 23, nameArabic: 'وَمَا لِيَ', nameBengali: 'ওয়া মা লিয়া', startingSurahNumber: 36, startingSurahName: 'ইয়াসিন', startingAyahNumber: 22 },
  { number: 24, nameArabic: 'فَمَنْ أَظْلَمُ', nameBengali: 'ফামান আযলামু', startingSurahNumber: 39, startingSurahName: 'আজ-জুমার', startingAyahNumber: 32 },
  { number: 25, nameArabic: 'إِلَيْهِ يُرَدُّ', nameBengali: 'ইলাইহি ইউরাদ্দু', startingSurahNumber: 41, startingSurahName: 'ফুসসিলাত', startingAyahNumber: 47 },
  { number: 26, nameArabic: 'حم', nameBengali: 'হা-মীম', startingSurahNumber: 46, startingSurahName: 'আল-আহকাফ', startingAyahNumber: 1 },
  { number: 27, nameArabic: 'قَالَ فَمَا خَطْبُكُمْ', nameBengali: 'ক্বালা ফামা খাতবুকুম', startingSurahNumber: 51, startingSurahName: 'আজ-যারিয়াত', startingAyahNumber: 31 },
  { number: 28, nameArabic: 'قَدْ سَمِعَ اللَّهُ', nameBengali: 'ক্বাদ সামিয়াল্লাহ', startingSurahNumber: 58, startingSurahName: 'আল-মুজাদালাহ', startingAyahNumber: 1 },
  { number: 29, nameArabic: 'تَبَارَكَ الَّذِي', nameBengali: 'তাবারাকাল্লাযী', startingSurahNumber: 67, startingSurahName: 'আল-মুলক', startingAyahNumber: 1 },
  { number: 30, nameArabic: 'عَمَّ يَتَسَاءَلُونَ', nameBengali: 'আম্মা ইয়াতাসাআলুন', startingSurahNumber: 78, startingSurahName: 'আন-নাবা', startingAyahNumber: 1 }
];

export const QuranReaderView: React.FC<QuranReaderViewProps> = React.memo(({
  settings,
  onUpdateSettings,
  onOpenShareModal,
  selectedSurahNumber: propSurahNumber,
  onSelectSurah
}) => {
  const { saveBookmark, deleteBookmark, bookmarks, requireAuth } = useSync();
  const [internalSurahNumber, setInternalSurahNumber] = useState<number | null>(null);
  const activeSurahNumber = propSurahNumber !== undefined ? propSurahNumber : internalSurahNumber;

  const handleSurahSelect = (num: number | null) => {
    if (onSelectSurah) {
      onSelectSurah(num);
    } else {
      setInternalSurahNumber(num);
    }
  };

  // Directory screen state
  const [activeTab, setActiveTab] = useState<'surah' | 'para' | 'bookmark'>('surah');
  const [searchQuery, setSearchQuery] = useState('');

  // Surah reader view state
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  // Audio playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);
  const [ayahProgressPercent, setAyahProgressPercent] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(() => soundManager.getPlaybackRate());
  const [repeatAyahMode, setRepeatAyahMode] = useState<boolean>(false);
  const repeatAyahRef = useRef<boolean>(false);
  repeatAyahRef.current = repeatAyahMode;
  const [copiedAyahNumber, setCopiedAyahNumber] = useState<number | null>(null);

  // Last read record
  const [lastRead, setLastRead] = useState<{ surahNumber: number; ayahNumber: number; surahNameBn: string } | null>(() => storage.getLastRead());

  // Scroll to top when switching Surah
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    setIsOptionsMenuOpen(false);
    setIsFontModalOpen(false);
  }, [activeSurahNumber]);

  // Load selected Surah details
  useEffect(() => {
    if (!activeSurahNumber) {
      soundManager.stopAudio();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
      setPlayingAyahNumber(null);
      setAyahProgressPercent(0);
      setSurahDetail(null);
      return;
    }

    let isMounted = true;
    setLoadingSurah(true);
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setPlayingAyahNumber(null);
    setAyahProgressPercent(0);

    getSurahDetails(activeSurahNumber)
      .then((detail) => {
        if (isMounted) {
          setSurahDetail(detail);
          setLoadingSurah(false);
          const record = {
            surahNumber: detail.number,
            ayahNumber: 1,
            surahNameBn: detail.nameBengali
          };
          setLastRead(record);
          storage.saveLastRead(record);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSurahDetail(OFFLINE_SURAHS[1]);
          setLoadingSurah(false);
        }
      });

    return () => {
      isMounted = false;
      soundManager.stopAudio();
    };
  }, [activeSurahNumber]);

  // Attach timeupdate listener for smooth audio progress bar
  useEffect(() => {
    if (!isPlayingAudio) return;
    const audioEl = soundManager.getCurrentAudio();
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      if (audioEl.duration && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
        setAyahProgressPercent(Math.min(100, Math.round((audioEl.currentTime / audioEl.duration) * 100)));
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlayingAudio, playingAyahNumber]);

  // Start playing a specific Ayah by number and index
  const startAyahPlayback = (ayahNumber: number, index: number) => {
    if (!activeSurahNumber || !surahDetail) return;

    triggerHaptic(25);
    setIsPlayingAudio(true);
    setIsPausedAudio(false);
    setPlayingAyahNumber(ayahNumber);
    setAyahProgressPercent(0);

    // Update lastRead record to current Ayah
    const record = {
      surahNumber: surahDetail.number,
      ayahNumber,
      surahNameBn: surahDetail.nameBengali
    };
    setLastRead(record);
    storage.saveLastRead(record);

    // Smoothly scroll the active Ayah into view if out of viewport
    setTimeout(() => {
      const el = document.getElementById(`ayah-card-${ayahNumber}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isOutOfView = rect.top < 90 || rect.bottom > window.innerHeight - 150;
        if (isOutOfView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 80);

    soundManager.playAyahAudio(
      activeSurahNumber,
      ayahNumber,
      () => {
        if (repeatAyahRef.current) {
          startAyahPlayback(ayahNumber, index);
        } else if (surahDetail && index + 1 < surahDetail.ayahs.length) {
          startAyahPlayback(surahDetail.ayahs[index + 1].numberInSurah, index + 1);
        } else {
          setIsPlayingAudio(false);
          setIsPausedAudio(false);
          setPlayingAyahNumber(null);
          setAyahProgressPercent(0);
        }
      },
      () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      }
    );
  };

  // Toggle Ayah Audio Play/Pause
  const handleToggleAyahAudio = (ayahNumber: number, index: number) => {
    if (isPlayingAudio && playingAyahNumber === ayahNumber) {
      triggerHaptic(20);
      soundManager.pauseAudio();
      setIsPlayingAudio(false);
      setIsPausedAudio(true);
      return;
    }

    if (isPausedAudio && playingAyahNumber === ayahNumber) {
      triggerHaptic(20);
      const resumed = soundManager.resumeAudio(() => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      });
      if (resumed) {
        setIsPlayingAudio(true);
        setIsPausedAudio(false);
        return;
      }
    }

    startAyahPlayback(ayahNumber, index);
  };

  // Toggle Whole Surah Recitation from Top Bar
  const handleToggleSurahRecitation = () => {
    if (!surahDetail || surahDetail.ayahs.length === 0) return;

    if (isPlayingAudio && playingAyahNumber !== null) {
      triggerHaptic(20);
      soundManager.pauseAudio();
      setIsPlayingAudio(false);
      setIsPausedAudio(true);
      return;
    }

    if (isPausedAudio && playingAyahNumber !== null) {
      triggerHaptic(20);
      const resumed = soundManager.resumeAudio(() => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      });
      if (resumed) {
        setIsPlayingAudio(true);
        setIsPausedAudio(false);
        return;
      }
    }

    const targetAyahNumber = playingAyahNumber || surahDetail.ayahs[0].numberInSurah;
    const targetIdx = Math.max(
      0,
      surahDetail.ayahs.findIndex((a) => a.numberInSurah === targetAyahNumber)
    );
    startAyahPlayback(surahDetail.ayahs[targetIdx].numberInSurah, targetIdx);
  };

  // Skip to Previous Ayah
  const handlePrevAyah = () => {
    if (!surahDetail || surahDetail.ayahs.length === 0) return;
    const currentNum = playingAyahNumber || 1;
    const currentIdx = surahDetail.ayahs.findIndex((a) => a.numberInSurah === currentNum);
    const prevIdx = Math.max(0, (currentIdx > 0 ? currentIdx : 0) - 1);
    startAyahPlayback(surahDetail.ayahs[prevIdx].numberInSurah, prevIdx);
  };

  // Skip to Next Ayah
  const handleNextAyah = () => {
    if (!surahDetail || surahDetail.ayahs.length === 0) return;
    const currentNum = playingAyahNumber || 1;
    const currentIdx = surahDetail.ayahs.findIndex((a) => a.numberInSurah === currentNum);
    const nextIdx = Math.min(surahDetail.ayahs.length - 1, (currentIdx >= 0 ? currentIdx : 0) + 1);
    startAyahPlayback(surahDetail.ayahs[nextIdx].numberInSurah, nextIdx);
  };

  // Stop Audio
  const handleStopRecitation = () => {
    triggerHaptic(20);
    soundManager.stopAudio();
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setPlayingAyahNumber(null);
    setAyahProgressPercent(0);
  };

  // Cycle Speed (1x -> 1.25x -> 1.5x -> 0.85x)
  const handleCyclePlaybackRate = () => {
    triggerHaptic(15);
    const rates = [1, 1.25, 1.5, 0.85];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length] || 1;
    setPlaybackRate(nextRate);
    soundManager.setPlaybackRate(nextRate);
  };

  // Copy Ayah Text
  const handleCopyAyah = (ayah: Ayah, surahName: string) => {
    const textToCopy = `${ayah.textArabic}\n\nঅনুবাদ:\n${ayah.textBengali}\n\n― আল-কুরআন, সূরা ${surahName}, আয়াত: ${toBengaliDigits(ayah.numberInSurah)}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedAyahNumber(ayah.numberInSurah);
    triggerHaptic(20);
    setTimeout(() => setCopiedAyahNumber(null), 2000);
  };

  // Bookmark Ayah
  const handleBookmarkAyah = (ayah: Ayah) => {
    if (!requireAuth('কুরআন আয়াত বুকমার্ক সংরক্ষণের জন্য লগইন করুন')) return;
    if (!surahDetail) return;

    const bmarkId = `ayah_${surahDetail.number}_${ayah.numberInSurah}`;
    const isBookmarked = (bookmarks || []).some((b) => b.id === bmarkId);

    if (isBookmarked) {
      deleteBookmark(bmarkId);
    } else {
      const newBookmark = {
        id: bmarkId,
        type: 'ayah' as const,
        title: `সূরা ${surahDetail.nameBengali}, আয়াত: ${toBengaliDigits(ayah.numberInSurah)}`,
        subtitle: ayah.textBengali.slice(0, 60) + '...',
        reference: `কুরআন ${toBengaliDigits(surahDetail.number)}:${toBengaliDigits(ayah.numberInSurah)}`,
        dataRefId: `${surahDetail.number}:${ayah.numberInSurah}`,
        createdAt: Date.now()
      };
      saveBookmark(newBookmark);
    }
    triggerHaptic(30);
  };

  // Filter Surahs
  const filteredSurahs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_SURAHS_META;
    return ALL_SURAHS_META.filter((s) => (
      s.nameBengali.toLowerCase().includes(q) ||
      s.nameEnglish.toLowerCase().includes(q) ||
      s.meaningBengali.toLowerCase().includes(q) ||
      s.number.toString().includes(q)
    ));
  }, [searchQuery]);

  // Filter Paras
  const filteredParas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_PARAS_META;
    return ALL_PARAS_META.filter((p) => (
      p.nameBengali.toLowerCase().includes(q) ||
      p.nameArabic.toLowerCase().includes(q) ||
      p.startingSurahName.toLowerCase().includes(q) ||
      p.number.toString().includes(q)
    ));
  }, [searchQuery]);

  // Bookmarked Ayahs list
  const quranBookmarks = useMemo(() => {
    return (bookmarks || []).filter((b) => b.type === 'ayah');
  }, [bookmarks]);

  // Arabic Font Size map
  const arabicFontClasses = {
    normal: 'text-2xl sm:text-3xl leading-[2.2]',
    large: 'text-3xl sm:text-4xl leading-[2.3]',
    xlarge: 'text-4xl sm:text-5xl leading-[2.4]'
  };

  // -------------------------------------------------------------
  // VIEW: LOADING SURAH
  // -------------------------------------------------------------
  if (activeSurahNumber && loadingSurah && !surahDetail) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 px-4">
        <div className="w-10 h-10 rounded-full border-3 border-[#177a56] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
          কুরআনুল কারীম লোড হচ্ছে...
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: SURAH AYAH READING VIEW (MATCHING APP'S THEME & SCREENSHOT 2)
  // -------------------------------------------------------------
  if (activeSurahNumber && surahDetail) {
    const activeAyahNumberForPlayer = playingAyahNumber || 1;
    const activeAyahObj =
      surahDetail.ayahs.find((a) => a.numberInSurah === activeAyahNumberForPlayer) ||
      surahDetail.ayahs[0];
    const surahProgressPercent =
      surahDetail.versesCount > 0
        ? Math.min(
            100,
            Math.max(
              2,
              Math.round(
                (((activeAyahNumberForPlayer - 1) + ayahProgressPercent / 100) /
                  surahDetail.versesCount) *
                  100
              )
            )
          )
        : 0;

    return (
      <div className="pb-36 pt-1 px-3 sm:px-4 max-w-2xl mx-auto space-y-4">
        {/* TOP BAR MATCHING APP'S SIGNATURE HEADER */}
        <header className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-white/95 dark:bg-[#131b17]/95 backdrop-blur-md border-b border-emerald-950/8 dark:border-emerald-500/15 flex items-center justify-between gap-2 shadow-2xs">
          {/* Left: Back Button + Surah Name & Arabic */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                soundManager.stopAudio();
                setIsPlayingAudio(false);
                setIsPausedAudio(false);
                setPlayingAyahNumber(null);
                handleSurahSelect(null);
              }}
              className="p-2 -ml-1 text-stone-700 dark:text-stone-200 hover:text-[#177a56] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-2xl cursor-pointer transition-colors"
              aria-label="ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                <span>{surahDetail.nameBengali}</span>
                <span className="font-arabic text-[#177a56] dark:text-emerald-400 text-sm font-semibold">({surahDetail.nameArabic})</span>
              </h1>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 font-medium">
                <span>{surahDetail.revelationType}</span>
                <span>•</span>
                <span>{toBengaliDigits(surahDetail.versesCount)}টি আয়াত</span>
                <span>•</span>
                <span>পারা {toBengaliDigits(surahDetail.juzNumber)}</span>
              </div>
            </div>
          </div>

          {/* Right: Audio Play, Font Size ("Tt"), and Dropdown Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Play Button matching App's Emerald Gradient */}
            <button
              onClick={handleToggleSurahRecitation}
              className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#126446] to-[#177a56] hover:from-[#136847] hover:to-[#1a8860] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer border border-emerald-400/30"
              title={isPlayingAudio ? 'তিলাওয়াত বিরতি দিন' : 'তিলাওয়াত শুনুন'}
              aria-label="তিলাওয়াত"
            >
              {isPlayingAudio ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            {/* Font Size Button ("Tt") */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setIsFontModalOpen((prev) => !prev);
              }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-900 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-[#177a56] font-extrabold text-sm cursor-pointer transition-colors"
              title="ফন্ট সাইজ পরিবর্তন"
              aria-label="ফন্ট সাইজ"
            >
              <span className="font-serif tracking-tighter text-base">Tᴛ</span>
            </button>

            {/* Three-dot Options Menu Button */}
            <div className="relative">
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setIsOptionsMenuOpen((prev) => !prev);
                }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-900 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-[#177a56] cursor-pointer transition-colors"
                title="আরও অপশন"
                aria-label="মেনু"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {isOptionsMenuOpen && (
                <div className="absolute right-0 top-11 w-60 rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/20 shadow-xl py-2 z-30 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setShowTranslit((prev) => !prev);
                      setIsOptionsMenuOpen(false);
                      triggerHaptic(15);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-between"
                  >
                    <span>উচ্চারণ {showTranslit ? 'বন্ধ করুন' : 'চালু করুন'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-[#177a56] dark:text-emerald-300 font-bold border border-emerald-500/20">
                      {showTranslit ? 'চালু' : 'বন্ধ'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleCyclePlaybackRate();
                      setIsOptionsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-between"
                  >
                    <span>অডিও স্পিড</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-[#177a56] dark:text-emerald-300 font-bold border border-emerald-500/20 font-mono">
                      {playbackRate}x
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setRepeatAyahMode((prev) => !prev);
                      setIsOptionsMenuOpen(false);
                      triggerHaptic(15);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-between"
                  >
                    <span>একই আয়াত পুনরাবৃত্তি</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-[#177a56] dark:text-emerald-300 font-bold border border-emerald-500/20">
                      {repeatAyahMode ? 'চালু' : 'বন্ধ'}
                    </span>
                  </button>
                  <div className="h-[1px] bg-stone-100 dark:bg-stone-800 my-1" />
                  <div className="px-4 py-2 text-[11px] text-stone-500 dark:text-stone-400">
                    সূরা {surahDetail.nameBengali} ({surahDetail.meaningBengali})
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* FONT SIZE & READING SETTINGS MODAL */}
        {isFontModalOpen && (
          <div className="p-4 rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/20 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#177a56] dark:text-emerald-400" />
                <span>আরবি ফন্ট সাইজ ও পাঠ সেটিংস</span>
              </span>
              <button
                onClick={() => setIsFontModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(['normal', 'large', 'xlarge'] as const).map((size) => {
                const labels = { normal: 'স্বাভাবিক', large: 'বড়', xlarge: 'খুব বড়' };
                const isActive = settings.arabicFontSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => {
                      triggerHaptic(15);
                      onUpdateSettings({ arabicFontSize: size });
                    }}
                    className={`flex-1 py-2 px-2 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#177a56] text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {labels[size]}
                  </button>
                );
              })}
            </div>

            {/* Transliteration toggle */}
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                বাংলা উচ্চারণ দেখান
              </span>
              <button
                onClick={() => {
                  triggerHaptic(15);
                  setShowTranslit((prev) => !prev);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  showTranslit
                    ? 'bg-[#177a56] text-white'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {showTranslit ? 'চালু আছে' : 'বন্ধ'}
              </button>
            </div>
          </div>
        )}

        {/* BISMILLAH CARD (For all surahs except Surah 9 and Surah 1) */}
        {surahDetail.bismillahPre && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs text-center space-y-2">
            <p dir="rtl" className="font-arabic text-2xl sm:text-3xl text-stone-900 dark:text-stone-50 font-normal leading-relaxed">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <div className="pt-1">
              <span className="text-xs font-bold text-[#177a56] dark:text-emerald-400 block mb-0.5">অনুবাদ</span>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
                পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে শুরু করছি।
              </p>
            </div>
          </div>
        )}

        {/* AYAH CARDS (100% HARMONIZED WITH APP'S DUA & HADITH VIEW CARDS) */}
        <div className="space-y-4">
          {surahDetail.ayahs.map((ayah, index) => {
            const isThisPlaying = isPlayingAudio && playingAyahNumber === ayah.numberInSurah;
            const bmarkId = `ayah_${surahDetail.number}_${ayah.numberInSurah}`;
            const isBookmarked = (bookmarks || []).some((b) => b.id === bmarkId);

            return (
              <article
                key={ayah.numberInSurah}
                id={`ayah-card-${ayah.numberInSurah}`}
                className={`p-4 sm:p-5 rounded-3xl transition-all space-y-3.5 ${
                  isThisPlaying
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-2 border-[#177a56] dark:border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs'
                }`}
              >
                {/* Header Row: Left Ayah Badge + Right Action Buttons */}
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 pb-2.5">
                  {/* Left: Soft Rounded Badge with Bengali Ayah Number */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500/20 text-[#177a56] dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                      <span>আয়াত</span>
                      <span>{toBengaliDigits(ayah.numberInSurah)}</span>
                    </span>
                  </div>

                  {/* Right: Actions (Copy, Bookmark, Play, Share) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Audio Play Button */}
                    <button
                      onClick={() => handleToggleAyahAudio(ayah.numberInSurah, index)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isThisPlaying
                          ? 'text-[#177a56] dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80'
                          : 'text-stone-400 hover:text-[#177a56] hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                      }`}
                      title={isThisPlaying ? 'বিরতি দিন' : 'তিলাওয়াত শুনুন'}
                      aria-label="আয়াত তিলাওয়াত"
                    >
                      {isThisPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Bookmark Button */}
                    <button
                      onClick={() => handleBookmarkAyah(ayah)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isBookmarked
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                      title={isBookmarked ? 'বুকমার্ক সরানো হয়েছে' : 'বুকমার্ক করুন'}
                      aria-label="বুকমার্ক"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyAyah(ayah, surahDetail.nameBengali)}
                      className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                      title="কপি করুন"
                      aria-label="কপি"
                    >
                      {copiedAyahNumber === ayah.numberInSurah ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() =>
                        onOpenShareModal({
                          title: `সূরা ${surahDetail.nameBengali}`,
                          arabic: ayah.textArabic,
                          translation: ayah.textBengali,
                          reference: `আল-কুরআন, সূরা ${surahDetail.nameBengali} (${toBengaliDigits(surahDetail.number)}:${toBengaliDigits(ayah.numberInSurah)})`
                        })
                      }
                      className="p-2 rounded-xl text-stone-400 hover:text-[#177a56] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer transition-colors"
                      title="শেয়ার কার্ড বানান"
                      aria-label="শেয়ার"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle: Arabic Text (Large, Clean, Right-Aligned) */}
                <p
                  dir="rtl"
                  className={`font-arabic text-right text-stone-900 dark:text-stone-50 select-text font-normal my-2 ${
                    arabicFontClasses[settings.arabicFontSize] || arabicFontClasses.normal
                  }`}
                >
                  {ayah.textArabic}
                </p>

                {/* Optional Transliteration Box matching DuaView */}
                {showTranslit && (
                  <div className="bg-stone-50 dark:bg-stone-900/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-1">
                    <span className="text-xs font-bold text-[#177a56] dark:text-emerald-400 block">উচ্চারণ:</span>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                      {ayah.transliterationBn || convertQuranTranslitToBengali(ayah.textEnglish, ayah.textArabic)}
                    </p>
                  </div>
                )}

                {/* Bottom: Bengali Translation */}
                <div className="space-y-1 pt-0.5">
                  <span className="text-xs font-bold text-[#177a56] dark:text-emerald-400 block">
                    অনুবাদ:
                  </span>
                  <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed select-text font-normal">
                    {ayah.textBengali}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* BOTTOM SURAH NAVIGATION BUTTONS */}
        <div className="pt-2 pb-6 flex items-center justify-between text-xs font-bold text-[#177a56] dark:text-emerald-400">
          <button
            disabled={surahDetail.number <= 1}
            onClick={() => surahDetail.number > 1 && handleSurahSelect(surahDetail.number - 1)}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/20 disabled:opacity-40 hover:bg-stone-50 cursor-pointer disabled:cursor-not-allowed shadow-2xs transition-colors"
          >
            ← পূর্ববর্তী সূরা
          </button>

          <span className="font-arabic text-base text-[#177a56] dark:text-emerald-300">
            صَدَقَ اللَّهُ الْعَظِيمُ
          </span>

          <button
            disabled={surahDetail.number >= 114}
            onClick={() => surahDetail.number < 114 && handleSurahSelect(surahDetail.number + 1)}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b17] border border-emerald-950/10 dark:border-emerald-500/20 disabled:opacity-40 hover:bg-stone-50 cursor-pointer disabled:cursor-not-allowed shadow-2xs transition-colors"
          >
            পরবর্তী সূরা →
          </button>
        </div>

        {/* FLOATING MINI AUDIO PLAYER (MATCHING APP'S THEME) */}
        {(isPlayingAudio || isPausedAudio) && (
          <div
            role="region"
            aria-label="কুরআন তিলাওয়াত অডিও প্লেয়ার"
            className="fixed bottom-[68px] left-0 right-0 z-30 px-3 sm:px-4 pointer-events-none"
          >
            <div className="max-w-xl mx-auto pointer-events-auto rounded-3xl bg-white/95 dark:bg-[#131b17]/95 backdrop-blur-xl border border-emerald-500/30 shadow-[0_-8px_30px_rgba(23,122,86,0.18)] overflow-hidden">
              {/* Scrubbable Progress Bar */}
              <div
                onClick={(e) => {
                  if (!surahDetail || surahDetail.versesCount === 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const targetIdx = Math.min(
                    surahDetail.ayahs.length - 1,
                    Math.floor(ratio * surahDetail.ayahs.length)
                  );
                  startAyahPlayback(surahDetail.ayahs[targetIdx].numberInSurah, targetIdx);
                }}
                className="relative h-1.5 w-full bg-emerald-100 dark:bg-emerald-950 cursor-pointer"
                title="প্রোগ্রেস বারে ট্যাপ করুন"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#126446] to-[#177a56] transition-all duration-200"
                  style={{ width: `${surahProgressPercent}%` }}
                />
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2.5">
                {/* Left: Info */}
                <div
                  onClick={() => {
                    const el = document.getElementById(`ayah-card-${activeAyahNumberForPlayer}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isPlayingAudio
                        ? 'bg-gradient-to-br from-[#126446] to-[#177a56] text-white border-emerald-400/50 shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#177a56] dark:text-emerald-400 border-emerald-600/25'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <div className="flex items-end gap-0.5 h-3.5">
                        <span className="w-0.5 h-full bg-emerald-200 rounded-full animate-pulse" />
                        <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" />
                        <span className="w-0.5 h-3 bg-emerald-200 rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 truncate">
                        সূরা {surahDetail.nameBengali}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-[10px] font-extrabold text-[#177a56] dark:text-emerald-300 font-mono shrink-0">
                        আয়াত {toBengaliDigits(activeAyahNumberForPlayer)}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {activeAyahObj?.textBengali || 'কারী মিশারি আল-আফাসি'}
                    </p>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Repeat Toggle */}
                  <button
                    onClick={() => {
                      triggerHaptic(15);
                      setRepeatAyahMode((prev) => !prev);
                    }}
                    title={repeatAyahMode ? 'একই আয়াত পুনরাবৃত্তি চালু' : 'একই আয়াত পুনরাবৃত্তি'}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      repeatAyahMode
                        ? 'bg-[#177a56] text-white border-[#177a56]'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>

                  {/* Previous Ayah */}
                  <button
                    onClick={handlePrevAyah}
                    disabled={activeAyahNumberForPlayer <= 1}
                    className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40 hover:bg-stone-200 cursor-pointer disabled:cursor-not-allowed"
                    title="পূর্ববর্তী আয়াত"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={handleToggleSurahRecitation}
                    className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#126446] to-[#177a56] hover:from-[#136847] hover:to-[#1a8860] text-white shadow-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    title={isPlayingAudio ? 'বিরতি দিন' : 'চালু করুন'}
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>

                  {/* Next Ayah */}
                  <button
                    onClick={handleNextAyah}
                    disabled={activeAyahNumberForPlayer >= surahDetail.versesCount}
                    className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40 hover:bg-stone-200 cursor-pointer disabled:cursor-not-allowed"
                    title="পরবর্তী আয়াত"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Stop */}
                  <button
                    onClick={handleStopRecitation}
                    className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer"
                    title="বন্ধ করুন"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW A: QURAN DIRECTORY & SEARCH SCREEN (MATCHING APP'S THEME)
  // -------------------------------------------------------------
  return (
    <div className="pb-28 pt-2 px-3 sm:px-4 max-w-2xl mx-auto space-y-4">
      {/* 1. TOP HEADER & SEARCH CARD (MATCHING HADITH & DUA VIEWS) */}
      <div className="bg-white dark:bg-[#131b17] rounded-3xl p-4 sm:p-5 shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#177a56] dark:text-emerald-400 shrink-0" />
              <span>পবিত্র আল-কুরআন</span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              ১১৪টি পূর্ণাঙ্গ সূরা, বাংলা উচ্চারণ, অর্থ ও অডিও তিলাওয়াত
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic(15);
              setActiveTab('bookmark');
            }}
            className={`p-2 rounded-2xl transition-colors cursor-pointer border ${
              activeTab === 'bookmark'
                ? 'text-[#177a56] bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/20'
                : 'text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-stone-800 hover:bg-stone-50'
            }`}
            title="সংরক্ষিত বুকমার্ক"
            aria-label="বুকমার্ক"
          >
            <Bookmark className={`w-4 h-4 ${activeTab === 'bookmark' ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Search Bar matching Hadith & Dua */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সূরার নাম বা নম্বর খুঁজুন..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs sm:text-sm focus:outline-none focus:border-[#177a56] dark:text-stone-100 placeholder-stone-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. THREE SEGMENTED PILL TABS (100% MATCHING DUA CATEGORY PILLS) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          {...fastTap(() => {
            triggerHaptic(10);
            setActiveTab('surah');
          })}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none ${
            activeTab === 'surah'
              ? 'bg-[#177a56] text-white shadow-xs'
              : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
          }`}
        >
          সূরা তালিকা ({toBengaliDigits(filteredSurahs.length)})
        </button>

        <button
          {...fastTap(() => {
            triggerHaptic(10);
            setActiveTab('para');
          })}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none ${
            activeTab === 'para'
              ? 'bg-[#177a56] text-white shadow-xs'
              : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
          }`}
        >
          ৩০ পারা
        </button>

        <button
          {...fastTap(() => {
            triggerHaptic(10);
            setActiveTab('bookmark');
          })}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none ${
            activeTab === 'bookmark'
              ? 'bg-[#177a56] text-white shadow-xs'
              : 'bg-white dark:bg-[#131b17] text-stone-700 dark:text-stone-300 border border-emerald-950/8 dark:border-emerald-500/15 hover:bg-stone-50'
          }`}
        >
          বুকমার্ক ({toBengaliDigits(quranBookmarks.length)})
        </button>
      </div>

      {/* 3. "শেষ পড়া" (LAST READ) HERO RESUME BANNER (MATCHING APP'S SIGNATURE EMERALD HERO) */}
      <section
        {...fastTap(() => handleSurahSelect(lastRead?.surahNumber || 7))}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#126446] via-[#177a56] to-[#0c432f] text-white p-4 sm:p-5 shadow-md border border-emerald-500/20 cursor-pointer active:scale-[0.99] transition-all select-none group"
      >
        {/* Subtle geometric circles matching Home hero */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 border border-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 w-44 h-44 border border-white/10 rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bookmark className="w-5 h-5 fill-white/80" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[10px] text-emerald-100 font-bold border border-white/10">
                <Bookmark className="w-2.5 h-2.5 fill-current text-emerald-200" />
                <span>শেষ পঠিত আয়াত</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight mt-1 truncate">
                {lastRead ? `সূরা ${lastRead.surahNameBn}, আয়াত ${toBengaliDigits(lastRead.ayahNumber)}` : 'সূরা আল-আরাফ, আয়াত ২৫৩'}
              </h3>
              <p className="text-[11px] text-emerald-100/80 font-medium mt-0.5">
                পড়া চালিয়ে যেতে এখানে ট্যাপ করুন
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </section>

      {/* 4. TAB CONTENT: SURAH / PARA / BOOKMARK */}
      {activeTab === 'surah' && (
        <div className="space-y-3">
          {/* Surah List in App-Standard Rounded Card */}
          <div className="bg-white dark:bg-[#131b17] rounded-3xl shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 divide-y divide-stone-100 dark:divide-stone-800/80 overflow-hidden">
            {filteredSurahs.map((surah) => (
              <div
                key={surah.number}
                {...fastTap(() => handleSurahSelect(surah.number))}
                className="py-3.5 px-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors select-none group"
              >
                {/* Left: Soft Mint Circle with Bengali Number + Bengali Name & Subtitle */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-[#177a56] dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    {toBengaliDigits(surah.number)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-tight truncate">
                      {surah.nameBengali}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">
                      <span>{surah.meaningBengali}</span>
                      <span>·</span>
                      <span className="text-[#177a56] dark:text-emerald-400 font-semibold">{toBengaliDigits(surah.versesCount)} আয়াত</span>
                      <span>·</span>
                      <span>{surah.revelationType}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Signature Deep Emerald Arabic Calligraphy */}
                <div className="shrink-0 text-right">
                  <span className="font-arabic text-xl sm:text-2xl font-bold text-[#177a56] dark:text-emerald-400">
                    {surah.nameArabic}
                  </span>
                </div>
              </div>
            ))}

            {filteredSurahs.length === 0 && (
              <div className="text-center py-12 text-stone-500 text-sm font-semibold">
                কোনো সূরা পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'para' && (
        <div className="space-y-3">
          {/* Para List in App-Standard Rounded Card */}
          <div className="bg-white dark:bg-[#131b17] rounded-3xl shadow-xs border border-emerald-950/8 dark:border-emerald-500/15 divide-y divide-stone-100 dark:divide-stone-800/80 overflow-hidden">
            {filteredParas.map((para) => (
              <div
                key={para.number}
                {...fastTap(() => handleSurahSelect(para.startingSurahNumber))}
                className="py-3.5 px-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors select-none group"
              >
                {/* Left: Number circle + Bengali name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-[#177a56] dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    {toBengaliDigits(para.number)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-tight truncate">
                      পারা {toBengaliDigits(para.number)}: {para.nameBengali}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-1">
                      {para.startingSurahName} (আয়াত {toBengaliDigits(para.startingAyahNumber)} থেকে শুরু)
                    </p>
                  </div>
                </div>

                {/* Right: Arabic Name */}
                <div className="shrink-0 text-right">
                  <span className="font-arabic text-xl sm:text-2xl font-bold text-[#177a56] dark:text-emerald-400">
                    {para.nameArabic}
                  </span>
                </div>
              </div>
            ))}

            {filteredParas.length === 0 && (
              <div className="text-center py-12 text-stone-500 text-sm font-semibold">
                কোনো পারা পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bookmark' && (
        <div className="space-y-3">
          {quranBookmarks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs space-y-2">
              <Bookmark className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                আপনার কোনো সংরক্ষিত আয়াত নেই
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                সূরা পড়ার সময় যেকোনো আয়াতের বুকমার্ক আইকনে চাপ দিয়ে তা এখানে দ্রুত পড়ার জন্য সংরক্ষণ করে রাখতে পারেন।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quranBookmarks.map((bmark) => {
                const parts = (bmark.dataRefId || '').split(':');
                const surahNum = parts[0] ? parseInt(parts[0], 10) : 1;
                return (
                  <div
                    key={bmark.id}
                    className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131b17] border border-emerald-950/8 dark:border-emerald-500/15 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#177a56] dark:text-emerald-400" />
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {bmark.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => deleteBookmark(bmark.id)}
                        className="text-stone-400 hover:text-rose-500 p-1 text-xs rounded-lg transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {bmark.subtitle}
                    </p>

                    <div className="pt-1 flex items-center justify-end">
                      <button
                        onClick={() => handleSurahSelect(surahNum)}
                        className="px-4 py-1.5 rounded-full bg-[#177a56] hover:bg-[#136847] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <span>আয়াতে যান</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
