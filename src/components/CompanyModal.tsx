import React from 'react';
import {
  X,
  Users,
  Trophy,
  MapPin,
  GraduationCap,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react';
import { getCompanyInfo } from '../data/companies';
import { useScrollLock } from '../lib/useScrollLock';

interface CompanyModalProps {
  companyName: string | null;
  onClose: () => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({ companyName, onClose }) => {
  useScrollLock(Boolean(companyName));

  React.useEffect(() => {
    if (!companyName) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [companyName, onClose]);

  if (!companyName) return null;

  const info = getCompanyInfo(companyName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-3 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold shadow-xs">
              <CircleAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  О работодателе
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                  Аккредитованная IT-компания
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
                {info.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full transition-all duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white shrink-0 cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-sm bg-white dark:bg-neutral-900">
          {/* Key Facts Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Employees */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Штат сотрудников</span>
              </div>
              <p className="font-bold text-neutral-900 dark:text-white text-sm sm:text-base leading-snug">
                {info.employeesCount}
              </p>
            </div>

            {/* Market Position */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Место на рынке</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">
                {info.marketPosition}
              </p>
            </div>
          </div>

          {/* Headquarters */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs text-xs text-neutral-700 dark:text-neutral-300">
            <MapPin className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-900 dark:text-white">Локации и хабы: </span>
              <span>{info.headquarters}</span>
            </div>
          </div>

          {/* About Company */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              О компании
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {info.description}
            </p>
          </div>

          {/* Internship Program & Perks */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                Программа стажировок: {info.internshipProgram}
              </h3>
            </div>
            <ul className="space-y-2">
              {info.internshipPerks.map((perk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selection Steps (Что нужно сделать, чтобы пройти на стажировку) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Как попасть на стажировку (этапы отбора):
            </h3>
            <div className="space-y-1.5">
              {info.selectionSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto opacity-70" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-xs"
          >
            Закрыть
          </button>

          <a
            href={info.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs font-semibold bg-neutral-900 hover:bg-black text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-transform active:scale-95 shadow-xs cursor-pointer"
          >
            <span>Карьерный сайт {info.shortName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
