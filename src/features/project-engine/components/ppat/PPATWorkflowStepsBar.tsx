import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

interface PPATWorkflowStepsBarProps {
  currentStep: string;
  steps: string[];
  onSelectStep?: (step: string) => void;
}

export const PPATWorkflowStepsBar: React.FC<PPATWorkflowStepsBarProps> = ({
  currentStep,
  steps,
  onSelectStep
}) => {
  const currentIndex = steps.findIndex(
    (s) => s.toLowerCase().trim() === (currentStep || '').toLowerCase().trim()
  );

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Alur Kerja Akta PPAT (8 Tahapan)
          </h4>
        </div>
        <span className="text-xs font-medium text-slate-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Tahap {currentIndex >= 0 ? currentIndex + 1 : 1} dari {steps.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentIndex;
          const isPassed = currentIndex >= 0 && idx < currentIndex;

          let stepBg = "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100";
          let badgeBg = "bg-slate-200 text-slate-600";

          if (isCurrent) {
            stepBg = "bg-amber-500 border-amber-600 text-white shadow-sm ring-2 ring-amber-200";
            badgeBg = "bg-white text-amber-600";
          } else if (isPassed) {
            stepBg = "bg-emerald-50 border-emerald-200 text-emerald-800";
            badgeBg = "bg-emerald-600 text-white";
          }

          return (
            <button
              key={step}
              onClick={() => onSelectStep?.(step)}
              className={`p-2.5 rounded-lg border text-left transition-all relative flex flex-col justify-between min-h-[64px] ${stepBg}`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeBg}`}>
                  {idx + 1}
                </span>
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : isCurrent ? (
                  <span className="text-[10px] font-bold uppercase tracking-tight bg-white/30 px-1 py-0.5 rounded text-white">
                    Aktif
                  </span>
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
              </div>
              <p
                className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                  isCurrent ? 'text-white' : isPassed ? 'text-emerald-900' : 'text-slate-700'
                }`}
              >
                {step}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
