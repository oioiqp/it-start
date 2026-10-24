import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Layers,
  HelpCircle,
  Check,
  Trophy,
  GitFork,
  ArrowDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, RoadmapTopic, SubTrackId, UserProgress } from '../types';
import { DIRECTIONS } from '../data/directions';
import { triggerHaptic } from '../lib/telegram';

interface RoadmapViewerProps {
  topics: RoadmapTopic[];
  userProgress: UserProgress;
  onToggleTopic: (topicId: string) => void;
  onToggleSubtopic?: (topicId: string, subtopicIndex: number) => void;
}

export const RoadmapViewer: React.FC<RoadmapViewerProps> = ({
  topics,
  userProgress,
  onToggleTopic,
  onToggleSubtopic,
}) => {
  const [selectedDirectionId, setSelectedDirectionId] = useState<DirectionId>('frontend');
  const [selectedSubTrackId, setSelectedSubTrackId] = useState<SubTrackId>('react');

  const currentDirection = DIRECTIONS.find((d) => d.id === selectedDirectionId) || DIRECTIONS[0];

  // If subtrack doesn't belong to current direction, pick first subtrack
  const validSubTrack = currentDirection.subTracks.some((st) => st.id === selectedSubTrackId)
    ? selectedSubTrackId
    : currentDirection.subTracks[0].id;

  const handleSelectDirection = (dirId: DirectionId) => {
    triggerHaptic('selection');
    setSelectedDirectionId(dirId);
    const newDir = DIRECTIONS.find((d) => d.id === dirId);
    if (newDir && newDir.subTracks.length > 0) {
      setSelectedSubTrackId(newDir.subTracks[0].id);
    }
  };

  const handleSelectSubTrack = (subId: SubTrackId) => {
    triggerHaptic('selection');
    setSelectedSubTrackId(subId);
  };

  // Filter core topics and specialized topics
  const coreTopics = topics.filter(
    (t) => t.directionId === selectedDirectionId && t.category === 'core'
  );

  const subTrackTopics = topics.filter(
    (t) =>
      t.directionId === selectedDirectionId &&
      t.category === 'subtrack' &&
      t.subTrackId === validSubTrack
  );

  const allVisibleTopics = [...coreTopics, ...subTrackTopics];

  // Compute subtopic check states
  const getSubtopicChecked = (topic: RoadmapTopic, sIdx: number) => {
    const subId = `${topic.id}__sub_${sIdx}`;
    return Boolean(
      userProgress.completedSubtopics?.includes(subId) ||
      userProgress.completedTopics.includes(topic.id)
    );
  };

  const getTopicProgress = (topic: RoadmapTopic) => {
    const total = topic.subtopics.length;
    if (total === 0) {
      const done = userProgress.completedTopics.includes(topic.id);
      return { total: 0, checked: done ? 1 : 0, percent: done ? 100 : 0, isDone: done };
    }

    const checked = topic.subtopics.filter((_, sIdx) => getSubtopicChecked(topic, sIdx)).length;
    const percent = Math.round((checked / total) * 100);
    const isDone = checked === total || userProgress.completedTopics.includes(topic.id);

    return { total, checked, percent, isDone };
  };

  const completedInTrack = allVisibleTopics.filter((t) => getTopicProgress(t).isDone).length;
  const trackProgressPercent =
    allVisibleTopics.length > 0
      ? Math.round((completedInTrack / allVisibleTopics.length) * 100)
      : 0;

  const handleToggleTopicClick = (topic: RoadmapTopic) => {
    triggerHaptic('selection');
    const { isDone } = getTopicProgress(topic);
    onToggleTopic(topic.id);

    if (!isDone) {
      if (completedInTrack + 1 === allVisibleTopics.length) {
        confetti({ particleCount: 100, spread: 80 });
      } else {
        confetti({ particleCount: 35, spread: 50 });
      }
    }
  };

  const handleToggleSubtopicClick = (topic: RoadmapTopic, sIdx: number) => {
    triggerHaptic('selection');
    if (onToggleSubtopic) {
      onToggleSubtopic(topic.id, sIdx);
    } else {
      // Fallback: toggle topic
      onToggleTopic(topic.id);
    }

    // Check if this subtopic click might complete the topic
    const { checked, total } = getTopicProgress(topic);
    const currentlyChecked = getSubtopicChecked(topic, sIdx);
    if (!currentlyChecked && checked + 1 === total) {
      confetti({ particleCount: 45, spread: 60 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Direction Tabs (6 Main Directions) */}
      <div className="rounded-[28px] sm:rounded-[32px] p-3 sm:p-4 transition-all duration-300 liquid-glass">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {DIRECTIONS.map((dir) => {
            const isSelected = dir.id === selectedDirectionId;
            return (
              <button
                key={dir.id}
                onClick={() => handleSelectDirection(dir.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl text-center transition-all duration-150 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-transform ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 text-neutral-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold leading-tight">{dir.title.split('-')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-track switcher & Track progress header */}
      <div className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 liquid-glass">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Специализированная ветка
            </span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">• roadmap.sh style</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {currentDirection.subTracks.map((st) => {
              const isSelected = st.id === validSubTrack;
              return (
                <button
                  key={st.id}
                  onClick={() => handleSelectSubTrack(st.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <span>{st.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Track Progress Indicator */}
        <div className="rounded-2xl p-3.5 shrink-0 min-w-[220px] transition-colors liquid-glass-subtle">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-neutral-700 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Прогресс роадмапа:
            </span>
            <span className="font-bold text-neutral-900 dark:text-white">
              {completedInTrack} из {allVisibleTopics.length} ({trackProgressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500 bg-neutral-800 dark:bg-neutral-200"
              style={{ width: `${trackProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CONNECTED ROADMAP TREE (roadmap.sh style) */}
      <div className="relative py-4 space-y-0">
        {/* BLOCK 1: CORE FOUNDATION (Nodes 1..N) */}
        <div className="relative">
          {/* Header of Core Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider liquid-glass-pill text-neutral-800 dark:text-neutral-200">
              {currentDirection.coreTitle}
            </div>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10"></div>
            <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">Базовый фундамент (Обязательно для всех)</span>
          </div>

          {/* Core Nodes Spine */}
          <div className="relative pl-8 sm:pl-12 space-y-6">
            {/* Continuous vertical connecting line */}
            <div className="absolute left-4 sm:left-6 top-6 bottom-0 w-0.5 -translate-x-1/2 bg-neutral-200 dark:bg-white/10"></div>

            {coreTopics.map((topic, idx) => {
              const { total, checked, percent, isDone } = getTopicProgress(topic);

              return (
                <div key={topic.id} className="relative group">
                  {/* Tree Node Dot / Anchor exactly on the spine */}
                  <div
                    className={`absolute -left-4 sm:-left-6 top-6 w-8 h-8 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[11px] font-bold z-20 transition-all ${
                      isDone
                        ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950 shadow-xs'
                        : percent > 0
                        ? 'bg-white border-neutral-900 text-neutral-900 dark:bg-white/20 dark:border-white/60 dark:text-white shadow-xs'
                        : 'bg-white border-neutral-300 text-neutral-700 dark:bg-black dark:border-white/20 dark:text-neutral-300'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Horizontal Branch Connector Arm */}
                  <div className="absolute -left-4 sm:-left-6 top-10 w-4 sm:w-6 h-0.5 -translate-y-1/2 z-10 bg-neutral-300 dark:bg-white/15"></div>

                  {/* Node Card */}
                  <div
                    className={`p-5 sm:p-6 rounded-[28px] transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500/10 border border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/35 liquid-glass-interactive'
                        : 'liquid-glass liquid-glass-interactive'
                    }`}
                  >
                    {/* Header: Title, Order & Doc Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Узел #{idx + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white transition-colors font-sans">
                          {topic.title}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                          {topic.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={topic.externalDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-full transition-colors shrink-0 liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200"
                          title="Документация roadmap.sh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-800 dark:text-neutral-200 mb-3.5 leading-relaxed font-normal">{topic.description}</p>

                    {/* Section Progress Bar */}
                    <div className="rounded-2xl p-2.5 mb-3.5 transition-colors liquid-glass-subtle">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                          Прогресс темы:
                        </span>
                        <span
                          className={`font-semibold ${
                            isDone
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-white/15">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'bg-neutral-900 dark:bg-white'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Subtopics Checklist */}
                    <div className="space-y-2 mb-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider block text-neutral-800 dark:text-neutral-200">
                        Ключевые темы (отметьте галочками):
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {topic.subtopics.map((sub, sIdx) => {
                          const isSubChecked = getSubtopicChecked(topic, sIdx);
                          return (
                            <div
                              key={sIdx}
                              onClick={() => handleToggleSubtopicClick(topic, sIdx)}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                isSubChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
                                  : 'bg-white/60 border-neutral-200/80 text-neutral-800 hover:bg-white/90 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-neutral-200 dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 shrink-0"
                              >
                                {isSubChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" />
                                )}
                              </button>
                              <span className={isSubChecked ? 'line-through opacity-75' : ''}>
                                {sub}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interview Callout */}
                    <div className="p-3 rounded-2xl text-[11px] mb-3.5 space-y-1 transition-colors
                      bg-amber-500/10 border border-amber-500/20 text-amber-900
                      dark:bg-amber-500/15 dark:border-amber-500/25 dark:text-amber-300"
                    >
                      <span className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5" />
                        На что смотрят на собеседовании:
                      </span>
                      <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed">{topic.interviewTip}</p>
                    </div>

                    {/* Section Mark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTopicClick(topic)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                        isDone
                          ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-950'
                          : 'liquid-glass-pill hover:bg-white/50 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Раздел полностью изучен (100%)</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4" />
                          <span>Отметить раздел изученным (100%)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORK NODE: SPECIALIZATION BRANCH CONNECTOR */}
        <div className="relative py-8 my-2">
          {/* Continuous vertical connecting line through the fork */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-neutral-200 dark:bg-white/10"></div>

          <div className="relative pl-8 sm:pl-12">
            {/* Fork icon badge exactly on spine */}
            <div className="absolute -left-4 sm:-left-6 top-6 w-9 h-9 -translate-x-1/2 rounded-full border-2 flex items-center justify-center z-20 shadow-xs transition-all
              bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950"
            >
              <GitFork className="w-4 h-4 rotate-180" />
            </div>

            {/* Horizontal Branch Connector Arm */}
            <div className="absolute -left-4 sm:-left-6 top-10 w-4 sm:w-6 h-0.5 -translate-y-1/2 z-10 bg-neutral-300 dark:bg-white/15"></div>

            {/* Fork Card */}
            <div className="p-5 sm:p-6 rounded-[28px] transition-colors space-y-4 liquid-glass">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs
                  bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  Развилка специализации
                </span>
                <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">
                  Общая база (Узлы 1..{coreTopics.length}) завершена • Выберите целевой стек
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold mb-1 text-neutral-900 dark:text-white font-sans">
                  Переход к углубленной специализации: <span>{currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}</span>
                </h3>
                <p className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
                  После освоения фундамента направления выберите профильный стек. Все последующие узлы роадмапа и практические темы автоматически адаптируются под выбранную технологию.
                </p>
              </div>

              {/* Interactive Branch Switcher Buttons */}
              <div className="space-y-2 pt-2 border-t border-neutral-200/80 dark:border-white/[0.08]">
                <span className="text-xs font-bold block text-neutral-800 dark:text-neutral-200">
                  Ветки направления «{currentDirection.title}»:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {currentDirection.subTracks.map((st) => {
                    const isCurrent = st.id === validSubTrack;
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleSelectSubTrack(st.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl text-left transition-all duration-150 active:scale-95 cursor-pointer ${
                          isCurrent
                            ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-950'
                            : 'liquid-glass-subtle text-neutral-900 hover:bg-white/70 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 font-sans">
                            <span>{st.name}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold
                                bg-white/20 text-white dark:bg-black/10 dark:text-neutral-900"
                              >
                                Выбрано
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] mt-0.5 line-clamp-1 opacity-80">
                            {st.shortDesc}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs pt-1 text-neutral-800 dark:text-neutral-200 font-medium">
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                <span>Ниже отображаются профильные темы для «{currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}» (Узлы #{coreTopics.length + 1}..#{coreTopics.length + subTrackTopics.length})</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 2: SUB-TRACK SPECIALIZATION (Nodes N+1..M) */}
        <div className="relative">
          {/* Header of Sub-Track Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider liquid-glass-pill text-neutral-800 dark:text-neutral-200">
              Ветка: {currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}
            </div>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10"></div>
            <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">Профильные требования к стажёрам</span>
          </div>

          {/* Sub-track Nodes Spine */}
          <div className="relative pl-8 sm:pl-12 space-y-6">
            {/* Continuous vertical connecting line */}
            <div className="absolute left-4 sm:left-6 top-0 bottom-6 w-0.5 -translate-x-1/2 bg-neutral-200 dark:bg-white/10"></div>

            {subTrackTopics.map((topic, idx) => {
              const { total, checked, percent, isDone } = getTopicProgress(topic);
              const nodeNumber = coreTopics.length + idx + 1;

              return (
                <div key={topic.id} className="relative group">
                  {/* Tree Node Dot / Anchor on the spine */}
                  <div
                    className={`absolute -left-4 sm:-left-6 top-6 w-8 h-8 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[11px] font-bold z-20 transition-all ${
                      isDone
                        ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950 shadow-xs'
                        : percent > 0
                        ? 'bg-white border-neutral-900 text-neutral-900 dark:bg-white/20 dark:border-white/60 dark:text-white shadow-xs'
                        : 'bg-white border-neutral-300 text-neutral-700 dark:bg-black dark:border-white/20 dark:text-neutral-300'
                    }`}
                  >
                    {nodeNumber}
                  </div>

                  {/* Horizontal Branch Connector Arm */}
                  <div className="absolute -left-4 sm:-left-6 top-10 w-4 sm:w-6 h-0.5 -translate-y-1/2 z-10 bg-neutral-300 dark:bg-white/15"></div>

                  {/* Node Card */}
                  <div
                    className={`p-5 sm:p-6 rounded-[28px] transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500/10 border border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/35 liquid-glass-interactive'
                        : 'liquid-glass liquid-glass-interactive'
                    }`}
                  >
                    {/* Header: Title, Order & Doc Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          Узел #{nodeNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                          {currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white transition-colors font-sans">
                          {topic.title}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold liquid-glass-pill text-neutral-800 dark:text-neutral-200">
                          {topic.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={topic.externalDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-full transition-colors shrink-0 liquid-glass-pill hover:bg-white/80 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200"
                          title="Документация roadmap.sh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-800 dark:text-neutral-200 mb-3.5 leading-relaxed font-normal">{topic.description}</p>

                    {/* Section Progress Bar */}
                    <div className="rounded-2xl p-2.5 mb-3.5 transition-colors liquid-glass-subtle">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                          Прогресс темы:
                        </span>
                        <span
                          className={`font-semibold ${
                            isDone
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-white/15">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'bg-neutral-900 dark:bg-white'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Subtopics Checklist */}
                    <div className="space-y-2 mb-3.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider block text-neutral-800 dark:text-neutral-200">
                        Ключевые темы специализации (отметьте галочками):
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {topic.subtopics.map((sub, sIdx) => {
                          const isSubChecked = getSubtopicChecked(topic, sIdx);
                          return (
                            <div
                              key={sIdx}
                              onClick={() => handleToggleSubtopicClick(topic, sIdx)}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                isSubChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
                                  : 'bg-white/60 border-neutral-200/80 text-neutral-800 hover:bg-white/90 dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-neutral-200 dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 shrink-0"
                              >
                                {isSubChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" />
                                )}
                              </button>
                              <span className={isSubChecked ? 'line-through opacity-75' : ''}>
                                {sub}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interview Callout */}
                    <div className="p-3 rounded-2xl text-[11px] mb-3.5 space-y-1 transition-colors
                      bg-amber-500/10 border border-amber-500/20 text-amber-900
                      dark:bg-amber-500/15 dark:border-amber-500/25 dark:text-amber-300"
                    >
                      <span className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5" />
                        На что смотрят на собеседовании:
                      </span>
                      <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">{topic.interviewTip}</p>
                    </div>

                    {/* Section Mark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTopicClick(topic)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                        isDone
                          ? 'bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-950'
                          : 'liquid-glass-pill hover:bg-white/70 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Раздел полностью изучен (100%)</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4" />
                          <span>Отметить раздел изученным (100%)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
