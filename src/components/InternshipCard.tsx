import React from 'react';
import {
  MapPin,
  Sparkles,
  ExternalLink,
  Bot,
  GraduationCap,
  Globe,
  Home,
  Building2,
  CircleAlert,
  Star,
  Calendar,
  CheckCircle2,
  ListOrdered,
  Clock,
  X,
} from 'lucide-react';
import type { Internship, Question, RoadmapTopic, UserProgress } from '../types';
import { triggerHaptic } from '../lib/telegram';
import {
  formatSalary,
  getVacancySourceDetails,
  getInternshipRecruitmentStatus,
} from '../lib/vacancyUrl';
import { getCompanyInfo } from '../data/companies';

interface InternshipCardProps {
  internship: Internship;
  userProgress: UserProgress;
  roadmapTopics: RoadmapTopic[];
  questions: Question[];
  onOpenPlan: (internship: Internship) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onOpenCompanyInfo?: (companyName: string) => void;
  isApplied?: boolean;
  appliedDeadline?: string;
  onApplyVacancy?: (internship: Internship) => void;
  onRemoveApplication?: (id: string) => void;
}

// Helper to clean repetitive noise and trailing stack/program descriptions from title
export function cleanVacancyTitle(title: string): string {
  if (!title) return '';
  // 1. Remove trailing parenthetical details (stack, program, company names)
  let cleaned = title.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  // 2. Remove any remaining program/company references in parens
  cleaned = cleaned.replace(/\s*\([^)]*(?:Контур|Т-Банк|Ozon|Т1|Сбер|Avito|Авито|VK|Яндекс|Directum)[^)]*\)/gi, '').trim();
  return cleaned || title;
}

// Helper to filter out duplicate tags that repeat company name, program names or noise
export function cleanVacancyTags(tags: string[], company: string, _title?: string): string[] {
  const companyLower = (company || '').toLowerCase();
  const excludeWords = [
    'контур.старт',
    'контур старт',
    'контур',
    'скб контур',
    'kontur',
    'т-банк',
    'тинькофф',
    'tbank',
    'т1',
    'директум',
    'directum',
    'directum rx',
    'директум rx',
    'ozon camp',
    'ozon tech',
    'ozon',
    'озон',
    'vk team',
    'vk',
    'вконтакте',
    'сбер',
    'sber',
    'sberseasons',
    'сберseasons',
    'авито',
    'avito',
    'авито старт',
    'avito tech',
    'открытая школа',
    'открытая школа т1',
    'т1 облако',
    'инфраструктура т1',
    'яндекс',
    'yandex',
    'яндекс интерны',
    'интерны',
    'стажировка',
    'старт',
    'финтех',
    'постоянный набор',
  ];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags || []) {
    const tagLower = tag.toLowerCase().trim();
    if (!tagLower) continue;

    // Skip if it matches company, known programs, or internal deadline markers
    if (tagLower.startsWith('набор до ')) continue;
    if (excludeWords.some((w) => tagLower === w || tagLower.includes(w))) continue;
    if (companyLower && companyLower.includes(tagLower)) continue;

    if (seen.has(tagLower)) continue;
    seen.add(tagLower);

    result.push(tag.trim());
  }

  return result.length > 0 ? result : tags;
}

// Helper to clean location strings (removes street addresses and redundant format notes)
export function cleanLocation(loc: string): string {
  if (!loc) return '';
  let cleaned = loc.replace(/\s*\([^)]*\)/g, '').trim();
  cleaned = cleaned.replace(/\s*\/\s*(?:Удаленно|Гибрид|Офис)/gi, '').trim();
  return cleaned || loc;
}

// Helper to format published date nicely
export function formatPublishedDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Недавно';
    const months = [
      'янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.',
      'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return 'Недавно';
  }
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  userProgress,
  roadmapTopics,
  questions,
  onOpenPlan,
  isFavorite = false,
  onToggleFavorite,
  onOpenCompanyInfo,
  isApplied = false,
  appliedDeadline,
  onApplyVacancy,
  onRemoveApplication,
}) => {
  const [showSteps, setShowSteps] = React.useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = React.useState(false);
  const companyInfo = getCompanyInfo(internship.company);
  const recruitmentInfo = getInternshipRecruitmentStatus(internship);
  const selectionSteps = companyInfo.selectionSteps && companyInfo.selectionSteps.length > 0
    ? companyInfo.selectionSteps
    : [
        'Подача онлайн-заявки и резюме',
        'Онлайн-тестирование по профильному стеку',
        'Тестовое задание с установленным дедлайном',
        'Техническое онлайн-собеседование',
        'Получение оффера и старт стажировки',
      ];

  // Compute readiness percentage
  const relevantTopics = roadmapTopics.filter(
    (t) =>
      t.directionId === internship.directionId &&
      (t.category === 'core' || t.subTrackId === internship.subTrackId)
  );

  const relevantQuestions = questions.filter(
    (q) =>
      q.directionId === internship.directionId &&
      (q.subTrackId === 'core' || q.subTrackId === internship.subTrackId)
  );

  const totalItems = relevantTopics.length + relevantQuestions.length;
  const completedCount =
    relevantTopics.filter((t) => userProgress.completedTopics.includes(t.id)).length +
    relevantQuestions.filter((q) => userProgress.completedQuestions.includes(q.id)).length;

  const readinessPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const handleOpenPlan = () => {
    triggerHaptic('medium');
    onOpenPlan(internship);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onToggleFavorite?.(internship.id);
  };

  const handleOpenCompanyInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onOpenCompanyInfo?.(internship.company);
  };

  const handleApplyClick = () => {
    triggerHaptic('medium');
    if (!isApplied) {
      setShowApplyConfirm(true);
    }
  };

  const handleRemoveApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('selection');
    onRemoveApplication?.(internship.id);
  };

  // Format badge rendering with clean, subtle, minimalist monochrome styling
  const renderFormatBadge = () => {
    let label = 'Гибрид';
    let icon = <Building2 className="w-3 h-3 opacity-60 shrink-0" />;

    if (internship.format === 'Удаленно') {
      label = 'Дома';
      icon = <Home className="w-3 h-3 opacity-60 shrink-0" />;
    } else if (internship.format === 'Офис') {
      label = 'В офисе';
      icon = <Building2 className="w-3 h-3 opacity-60 shrink-0" />;
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300 shrink-0"
        title={`Формат: ${internship.format}`}
      >
        {icon}
        <span>{label}</span>
      </span>
    );
  };

  // Concise, subtle recruitment chip (no glowing neon colors)
  const renderRecruitmentChip = () => {
    let label = 'Постоянно';
    let note = recruitmentInfo.note || 'Постоянный набор';

    if (recruitmentInfo.type === 'scheduled') {
      if (recruitmentInfo.deadline === 'Набор закрыт') {
        label = 'Закрыт';
      } else if (recruitmentInfo.deadline.startsWith('до ')) {
        label = recruitmentInfo.deadline;
      } else {
        label = `до ${recruitmentInfo.deadline}`;
      }
      note = recruitmentInfo.note || `Приём заявок ${recruitmentInfo.deadline}`;
    }

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300 shrink-0"
        title={note}
      >
        <Clock className="w-3 h-3 opacity-60 shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  const cleanedTitle = cleanVacancyTitle(internship.title);
  const cleanedTags = cleanVacancyTags(internship.tags, internship.company, cleanedTitle);
  const publishedDateText = formatPublishedDate(internship.publishedAt);

  return (
    <div className="group relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between liquid-glass liquid-glass-interactive overflow-hidden">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-2.5 sm:gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            {/* Company & Info button (bound together in inline-flex to prevent wrapping circle) */}
            <div className="inline-flex items-center gap-1.5 max-w-full min-w-0">
              <span className="font-bold text-sm text-neutral-950 dark:text-white font-sans tracking-tight truncate min-w-0">
                {internship.company}
              </span>

              {/* Information icon: circle with exclamation mark as specified in requirements */}
              <button
                type="button"
                onClick={handleOpenCompanyInfo}
                className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title={`Информация о компании ${internship.company}`}
                aria-label={`О компании ${internship.company}`}
              >
                <CircleAlert className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clean minimalist metadata row without stray dots */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mt-2 flex-wrap font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300 shrink-0">
                <MapPin className="w-3 h-3 opacity-60 shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{cleanLocation(internship.location)}</span>
              </span>
              {renderFormatBadge()}
              {renderRecruitmentChip()}
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0 ml-0.5">
                <Calendar className="w-3 h-3 opacity-60 shrink-0" />
                <span>{publishedDateText}</span>
              </span>
            </div>
          </div>

          {/* Right Header Capsule: Favorite Star & Clean Salary Pill (without "оплата") */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Yellow Favorite Star */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-full transition-all duration-150 active:scale-90 cursor-pointer ${
                isFavorite
                  ? 'bg-amber-400/15 text-amber-500'
                  : 'text-neutral-400 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isFavorite ? 'В избранном (нажмите, чтобы убрать)' : 'Добавить в избранное'}
              aria-label="В избранное"
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? 'fill-amber-400 text-amber-500' : ''
                }`}
              />
            </button>

            {/* Salary badge (clean, without word "оплата") */}
            <div className="text-right shrink-0">
              <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold block liquid-glass-pill text-neutral-900 dark:text-white tracking-tight">
                {formatSalary(internship.salary)}
              </span>
            </div>
          </div>
        </div>

        {/* Position Title (clean and concise with standardized line-clamp) */}
        <h3 className="text-sm sm:text-base font-bold transition-colors tracking-tight line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] mb-2 leading-snug text-neutral-950 group-hover:text-black dark:text-white dark:group-hover:text-neutral-100 font-sans">
          {cleanedTitle}
        </h3>

        {/* Applied vacancy notice if user applied: subtle and clean */}
        {isApplied && (
          <div className="mb-3 px-3 py-1.5 rounded-xl liquid-glass-subtle border border-black/5 dark:border-white/10 text-neutral-700 dark:text-neutral-300 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2 truncate min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-neutral-600 dark:text-neutral-400" />
              <span className="truncate">
                Отклик подан {appliedDeadline ? `• ${appliedDeadline}` : ''}
              </span>
            </div>
            {onRemoveApplication && (
              <button
                type="button"
                onClick={handleRemoveApply}
                className="text-[11px] text-neutral-400 hover:text-red-500 underline ml-2 shrink-0 cursor-pointer"
                title="Удалить из трекера откликов"
              >
                Отменить
              </button>
            )}
          </div>
        )}

        {/* Clean Tech Stack Tags (filtered against company name & title repetitions) */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {cleanedTags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors liquid-glass-pill text-neutral-700 dark:text-neutral-300 hover:bg-white/50 cursor-default"
            >
              {tag}
            </span>
          ))}
          {cleanedTags.length > 4 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-medium liquid-glass-pill text-neutral-500 dark:text-neutral-400">
              +{cleanedTags.length - 4}
            </span>
          )}
        </div>

        {/* Selection Steps Toggle (Что нужно сделать для того, чтобы пройти на стажировку) */}
        <div className="mb-3.5">
          <button
            type="button"
            onClick={() => setShowSteps(!showSteps)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-neutral-500" />
            <span>{showSteps ? 'Скрыть этапы отбора' : 'Как пройти на стажировку (этапы)'}</span>
          </button>

          {showSteps && (
            <div className="mt-2 p-2.5 rounded-xl liquid-glass-subtle space-y-1 text-[11px] text-neutral-700 dark:text-neutral-300 animate-fade-in">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white mb-1">
                <Clock className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                <span>Этапы отбора в {companyInfo.shortName || internship.company}:</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 pl-0.5">
                {selectionSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section: Readiness bar & Buttons */}
      <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
        {/* Readiness Bar */}
        <div className="rounded-2xl p-3 liquid-glass-subtle">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
              <Sparkles className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              Готовность к стеку:
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 bg-neutral-800 dark:bg-neutral-200"
              style={{ width: `${readinessPercent}%` }}
            />
          </div>
        </div>

        {/* Source and Actions */}
        <div className="flex items-center justify-between gap-2">
          {(() => {
            const src = getVacancySourceDetails(
              internship.applyUrl,
              internship.company,
              internship.sourceChannel,
              internship.directionId,
              internship.subTrackId,
              internship.sourcePostUrl
            );
            const isTelegramOrigin = src.type === 'telegram_post' || internship.sourceType === 'telegram';

            return (
              <>
                {isTelegramOrigin ? (
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <a
                      href={src.officialChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors truncate max-w-[140px]"
                      title={`Перейти в Telegram-канал / группу: ${src.officialChannelHandle}`}
                    >
                      <Bot className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                      <span className="truncate underline decoration-neutral-300 dark:decoration-neutral-700">
                        {src.officialChannelHandle}
                      </span>
                    </a>
                    {src.postUrl && (
                      <a
                        href={src.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-black dark:bg-white/10 dark:text-neutral-300 transition-colors shrink-0"
                        title={`Открыть именно это сообщение в Telegram: ${src.postUrl}`}
                      >
                        <span>К посту</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    )}
                  </div>
                ) : (
                  <a
                    href={src.badgeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-semibold truncate min-w-0 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors"
                    title={src.badgeTooltip}
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    <span className="truncate underline decoration-neutral-300 dark:decoration-neutral-700">
                      {src.badgeLabel}
                    </span>
                  </a>
                )}

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Minimalist Tracker Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('selection');
                      if (isApplied) {
                        onRemoveApplication?.(internship.id);
                      } else {
                        onApplyVacancy?.(internship);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 cursor-pointer ${
                      isApplied
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-xs'
                        : 'liquid-glass-pill hover:bg-white/50 text-neutral-700 dark:text-neutral-300'
                    }`}
                    title={isApplied ? 'Отклик уже в трекере (нажмите, чтобы убрать)' : 'Отметить отклик в трекере откликов'}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isApplied ? 'text-white dark:text-neutral-950' : 'text-neutral-400'}`} />
                    <span className="hidden sm:inline">{isApplied ? 'В откликах' : 'Откликнулся'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenPlan}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 liquid-glass-pill hover:bg-white/50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                    <span>План</span>
                  </button>

                  <a
                    href={src.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleApplyClick}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-2 min-h-[38px] rounded-full text-xs font-semibold transition-transform duration-150 active:scale-95 bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shadow-xs cursor-pointer"
                    title={src.actionLabel}
                  >
                    <span>{src.type === 'telegram_post' ? 'В Telegram' : 'Отклик'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </>
            );
          })()}
        </div>

        {/* Sleek Minimal Post-Apply Confirmation */}
        {showApplyConfirm && !isApplied && (
          <div className="mt-2.5 px-3 py-2 rounded-xl liquid-glass-subtle border border-black/5 dark:border-white/10 flex items-center justify-between gap-2 text-xs animate-fade-in">
            <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate">
              Добавить в отклики?
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('success');
                  onApplyVacancy?.(internship);
                  setShowApplyConfirm(false);
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Да
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApplyConfirm(false);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Закрыть"
                aria-label="Закрыть"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
