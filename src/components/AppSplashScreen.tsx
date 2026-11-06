import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AppSplashScreenProps {
  onFinish?: () => void;
  duration?: number; // total duration before completing in ms (default ~1900ms)
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  duration = 1900,
}) => {
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'exit' | 'done'>('enter');

  useEffect(() => {
    // Lock body scrolling while splash is active so background cannot move
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Hold cleanly, then start smooth exit transition
    const exitTimer = setTimeout(() => {
      setAnimationPhase('exit');
    }, Math.max(800, duration - 350));

    const finishTimer = setTimeout(() => {
      setAnimationPhase('done');
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, [duration, onFinish]);

  const handleSkip = () => {
    if (animationPhase === 'exit' || animationPhase === 'done') return;
    setAnimationPhase('exit');
    setTimeout(() => {
      setAnimationPhase('done');
      onFinish?.();
    }, 280);
  };

  if (animationPhase === 'done') {
    return null;
  }

  const isExiting = animationPhase === 'exit';

  return (
    <motion.div
      key="app-splash-screen"
      onClick={handleSkip}
      initial={{ opacity: 1 }}
      animate={{
        opacity: isExiting ? 0 : 1,
      }}
      transition={{
        duration: 0.35,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center w-full h-[100dvh] min-h-screen select-none bg-white dark:bg-[#0c1410] cursor-pointer overflow-hidden touch-none"
      style={{
        // 100% solid opaque background to prevent any background/dashboard leaking through
        backgroundColor: undefined,
      }}
      role="presentation"
      aria-label="Muslim Reminder Splash Screen"
    >
      {/* Central Brand Unit (Logo + Name + Subtitle) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          scale: isExiting ? 1.08 : 1,
          y: isExiting ? -4 : 0,
        }}
        transition={{
          duration: isExiting ? 0.35 : 0.55,
          ease: isExiting ? [0.4, 0.0, 0.2, 1] : [0.16, 1, 0.3, 1], // Buttery smooth single ease curve, no bounce/jitter
        }}
        className="relative flex flex-col items-center justify-center transform-gpu will-change-transform"
      >
        {/* Rounded Squircle Logo Card matching reference video */}
        <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-[38px] sm:rounded-[42px] shadow-[0_20px_45px_rgba(15,76,58,0.18)] dark:shadow-[0_25px_50px_rgba(0,0,0,0.6)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex items-center justify-center bg-[#0e4a38]">
          <img
            src="/app-logo.png"
            alt="Muslim Reminder Logo"
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="eager"
            decoding="sync"
          />
        </div>

        {/* Clean Typography */}
        <div className="flex flex-col items-center justify-center mt-6 select-none text-center">
          <h1 className="text-[24px] sm:text-[27px] font-bold text-[#1f382e] dark:text-[#ecfdf5] tracking-tight leading-tight">
            Muslim Reminder
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#6b7280] dark:text-[#9ca3af] font-normal tracking-wide mt-1.5">
            Remember Allah
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
