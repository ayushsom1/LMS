'use client';

import { useEffect, useState } from 'react';

interface TimerProps {
  durationMinutes: number;
  startTime: number;
  onTimeUp: () => void;
}

export default function Timer({ durationMinutes, startTime, onTimeUp }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const endTime = startTime + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) {
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [durationMinutes, startTime, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const isLow = minutes < 5;
  const isCritical = minutes < 1;

  return (
    <div
      className={`font-mono text-xl font-bold px-4 py-2 rounded-lg ${
        isCritical
          ? 'bg-red-600 text-white animate-pulse'
          : isLow
          ? 'bg-yellow-600 text-white'
          : 'bg-slate-700 text-white'
      }`}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
