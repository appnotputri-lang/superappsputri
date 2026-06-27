import React, { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';

export const RealTimeClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second to keep it accurate, although we only show minutes

    return () => clearInterval(timer);
  }, []);

  const formatID = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(currentTime);

  const formatTime = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(currentTime);

  return (
    <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-medium bg-white/50 backdrop-blur-sm shadow-sm">
      <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
      <span className="capitalize">{formatID}</span>
      <span className="text-slate-300">•</span>
      <span>{formatTime}</span>
    </div>
  );
};
