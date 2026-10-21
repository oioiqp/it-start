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
      <div className="rounded-2xl p-2 sm:p-3 transition-colors cyber-corner
        dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/20
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {DIRECTIONS.map((dir) => {
            const isSelected = dir.id === selectedDirectionId;
            return (
              <button
                key={dir.id}
                onClick={() => handleSelectDirection(dir.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'dark:bg-cyan-500/15 dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(0,240,255,0.2)] light:bg-slate-900 light:border-slate-900 light:text-white shadow-sm'
                    : 'dark:bg-[#06080f]/80 dark:border-slate-800/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-cyan-500/40 light:bg-slate-50 light:border-slate-200 light:text-slate-600 light:hover:text-slate-900 light:hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-transform ${
                    isSelected
                      ? 'dark:bg-gradient-to-br dark:from-cyan-500 dark:to-indigo-600 dark:text-white light:bg-slate-900 light:text-white'
                      : 'dark:bg-[#101726] dark:text-slate-400 light:bg-slate-200 light:text-slate-600'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">{dir.title.split('-')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-track switcher & Track progress header */}
      <div className="rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors cyber-corner
        dark:bg-[#0c101c]/90 dark:border dark:border-cyan-500/20
        light:bg-white light:border light:border-slate-200 light:shadow-sm"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider dark:text-cyan-400 light:text-sky-600 font-mono">
              Специализированная ветка
            </span>
            <span className="text-xs dark:text-slate-500 light:text-slate-500">• roadmap.sh style</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {currentDirection.subTracks.map((st) => {
              const isSelected = st.id === validSubTrack;
              return (
                <button
                  key={st.id}
                  onClick={() => handleSelectSubTrack(st.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                    isSelected
                      ? 'dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:text-white dark:border-cyan-400 dark:shadow-[0_0_12px_rgba(0,240,255,0.25)] light:bg-slate-900 light:text-white light:border-slate-900 shadow-sm'
                      : 'dark:bg-[#06080f]/80 dark:text-slate-300 dark:border-slate-800 dark:hover:border-cyan-500/40 light:bg-slate-50 light:text-slate-700 light:border-slate-200 light:hover:border-slate-300'
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
        <div className="rounded-xl p-3 shrink-0 min-w-[220px] transition-colors
          dark:bg-[#06080f]/90 dark:border dark:border-slate-800
          light:bg-slate-50 light:border light:border-slate-200"
        >
          <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
            <span className="dark:text-slate-300 light:text-slate-700 font-medium flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Прогресс роадмапа:
            </span>
            <span className="font-extrabold dark:text-cyan-300 light:text-sky-700">
              {completedInTrack} из {allVisibleTopics.length} ({trackProgressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden dark:bg-slate-800 light:bg-slate-200">
            <div
              className="h-full rounded-full transition-all duration-500 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-500 light:bg-slate-900"
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
            <div className="px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider font-mono
              dark:bg-cyan-500/15 dark:border dark:border-cyan-500/30 dark:text-cyan-300
              light:bg-sky-50 light:border light:border-sky-200 light:text-sky-800"
            >
              {currentDirection.coreTitle}
            </div>
            <div className="h-px flex-1 dark:bg-slate-800 light:bg-slate-200"></div>
            <span className="text-xs dark:text-slate-500 light:text-slate-500 font-mono">Базовый фундамент (Обязательно для всех)</span>
          </div>

          {/* Core Nodes Spine */}
          <div className="relative pl-8 sm:pl-12 space-y-6">
            {/* Continuous vertical connecting line */}
            <div className="absolute left-4 sm:left-6 top-6 bottom-0 w-0.5 -translate-x-1/2 dark:bg-slate-800 light:bg-slate-300"></div>

            {coreTopics.map((topic, idx) => {
              const { total, checked, percent, isDone } = getTopicProgress(topic);

              return (
                <div key={topic.id} className="relative group">
                  {/* Tree Node Dot / Anchor exactly on the spine */}
                  <div
                    className={`absolute -left-4 sm:-left-6 top-6 w-8 h-8 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[11px] font-black z-20 font-mono transition-all ${
                      isDone
                        ? 'dark:bg-emerald-950 dark:border-emerald-400 dark:text-emerald-300 dark:shadow-[0_0_12px_rgba(0,255,157,0.3)] light:bg-emerald-600 light:border-emerald-600 light:text-white shadow-sm'
                        : percent > 0
                        ? 'dark:bg-cyan-950 dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(0,240,255,0.3)] light:bg-sky-600 light:border-sky-600 light:text-white shadow-sm'
                        : 'dark:bg-[#06080f] dark:border-slate-700 dark:text-slate-400 light:bg-white light:border-slate-300 light:text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Horizontal Branch Connector Arm ("веточка" к карточке) */}
                  <div className="absolute -left-4 sm:-left-6 top-10 w-4 sm:w-6 h-0.5 -translate-y-1/2 z-10 dark:bg-slate-800 light:bg-slate-300"></div>

                  {/* Node Card */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cyber-corner ${
                      isDone
                        ? 'dark:bg-[#08131d]/90 dark:border-emerald-500/40 dark:shadow-[0_0_16px_rgba(0,255,157,0.1)] light:bg-white light:border-emerald-300 light:shadow-sm'
                        : percent > 0
                        ? 'dark:bg-[#091224]/90 dark:border-cyan-500/40 dark:shadow-[0_0_16px_rgba(0,240,255,0.12)] light:bg-white light:border-sky-300 light:shadow-sm'
                        : 'dark:bg-[#0c101c]/90 dark:border-slate-800/90 dark:hover:border-cyan-500/30 light:bg-white light:border-slate-200 light:hover:border-slate-300 light:shadow-sm'
                    }`}
                  >
                    {/* Header: Title, Order & Doc Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold dark:text-cyan-400 light:text-sky-700 font-mono">
                          Узел #{idx + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold dark:text-white dark:group-hover:text-cyan-300 light:text-slate-900 light:group-hover:text-sky-700 transition-colors font-sans">
                          {topic.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono
                          dark:bg-slate-800/80 dark:text-slate-300
                          light:bg-slate-100 light:text-slate-700"
                        >
                          {topic.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={topic.externalDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg transition-colors
                            dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white
                            light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600 light:hover:text-slate-900"
                          title="Документация roadmap.sh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs dark:text-slate-300 light:text-slate-600 mb-3 leading-relaxed">{topic.description}</p>

                    {/* Section Progress Bar */}
                    <div className="rounded-xl p-2.5 mb-3.5 transition-colors
                      dark:bg-[#06080f]/80 dark:border dark:border-slate-800/80
                      light:bg-slate-50 light:border light:border-slate-200"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                        <span className="dark:text-slate-400 light:text-slate-600 font-medium">
                          Прогресс темы:
                        </span>
                        <span
                          className={`font-bold ${
                            isDone
                              ? 'dark:text-emerald-400 light:text-emerald-700'
                              : 'dark:text-cyan-300 light:text-sky-700'
                          }`}
                        >
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden dark:bg-slate-800 light:bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone
                              ? 'dark:bg-emerald-400 light:bg-emerald-600'
                              : 'dark:bg-cyan-400 light:bg-sky-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Subtopics Checklist */}
                    <div className="space-y-2 mb-3.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider block font-mono dark:text-slate-400 light:text-slate-500">
                        Ключевые темы (отметьте изученные галочками):
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
                                  ? 'dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-200 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-900'
                                  : 'dark:bg-[#06080f]/70 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-[#0a0f1d] dark:hover:border-cyan-500/30 light:bg-slate-50 light:border-slate-200 light:text-slate-700 light:hover:bg-slate-100'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 shrink-0"
                              >
                                {isSubChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 dark:text-slate-600 dark:hover:text-cyan-400 light:text-slate-400 light:hover:text-slate-700" />
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
                    <div className="p-3 rounded-xl text-[11px] mb-3.5 space-y-1 transition-colors
                      dark:bg-[#06080f]/90 dark:border dark:border-slate-800 dark:text-slate-300
                      light:bg-amber-50/70 light:border light:border-amber-200 light:text-slate-800"
                    >
                      <span className="font-bold flex items-center gap-1.5 dark:text-amber-400 light:text-amber-700 font-mono">
                        <HelpCircle className="w-3.5 h-3.5" />
                        На что смотрят на собеседовании:
                      </span>
                      <p className="dark:text-slate-400 light:text-slate-600 leading-relaxed">{topic.interviewTip}</p>
                    </div>

                    {/* Section Mark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTopicClick(topic)}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all font-mono ${
                        isDone
                          ? 'dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300 light:bg-emerald-600 light:text-white light:border-emerald-600'
                          : 'dark:bg-[#06080f] dark:border-slate-800 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-500/30 light:bg-slate-100 light:border-slate-200 light:text-slate-700 light:hover:bg-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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

        {/* PROMINENT VISUAL JUNCTION: SPECIALIZATION FORK (Развилка специализации) */}
        <div className="relative py-8 my-2">
          {/* Continuous vertical connecting line through the fork */}
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 -translate-x-1/2 dark:bg-slate-800 light:bg-slate-300"></div>

          <div className="relative pl-8 sm:pl-12">
            {/* Fork icon badge exactly on spine */}
            <div className="absolute -left-4 sm:-left-6 top-6 w-9 h-9 -translate-x-1/2 rounded-full border-2 flex items-center justify-center z-20 shadow-md font-mono transition-all
              dark:bg-[#06080f] dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(0,240,255,0.4)]
              light:bg-slate-900 light:border-slate-900 light:text-white"
            >
              <GitFork className="w-4 h-4 rotate-180" />
            </div>

            {/* Horizontal Branch Connector Arm */}
            <div className="absolute -left-4 sm:-left-6 top-10 w-4 sm:w-6 h-0.5 -translate-y-1/2 z-10 dark:bg-cyan-500/40 light:bg-sky-400"></div>

            {/* Fork Card */}
            <div className="p-5 sm:p-6 rounded-2xl cyber-corner transition-colors space-y-4
              dark:bg-[#0c101c]/95 dark:border-2 dark:border-cyan-500/40 dark:shadow-[0_0_24px_rgba(0,240,255,0.15)]
              light:bg-white light:border-2 light:border-sky-300 light:shadow-md"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm
                  dark:bg-cyan-500 dark:text-black dark:shadow-[0_0_12px_rgba(0,240,255,0.4)]
                  light:bg-slate-900 light:text-white"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  Развилка специализации
                </span>
                <span className="text-xs font-mono font-medium dark:text-cyan-300 light:text-sky-700">
                  Общая база (Узлы 1..{coreTopics.length}) завершена • Выберите целевой стек
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold mb-1 font-sans dark:text-white light:text-slate-900">
                  Переход к углубленной специализации: <span className="dark:text-cyan-400 light:text-sky-600">{currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}</span>
                </h3>
                <p className="text-xs leading-relaxed dark:text-slate-300 light:text-slate-600">
                  После освоения фундамента направления выберите профильный стек. Все последующие узлы роадмапа и практические темы автоматически адаптируются под выбранную технологию.
                </p>
              </div>

              {/* Interactive Branch Switcher Buttons */}
              <div className="space-y-2 pt-2 border-t dark:border-slate-800 light:border-slate-200">
                <span className="text-xs font-semibold font-mono block dark:text-slate-400 light:text-slate-500">
                  Ветки направления «{currentDirection.title}»:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {currentDirection.subTracks.map((st) => {
                    const isCurrent = st.id === validSubTrack;
                    return (
                      <button
                        key={st.id}
                        onClick={() => handleSelectSubTrack(st.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? 'dark:bg-cyan-500/20 dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(0,240,255,0.2)] light:bg-slate-900 light:border-slate-900 light:text-white shadow-sm'
                            : 'dark:bg-[#06080f]/80 dark:border-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/40 light:bg-slate-50 light:border-slate-200 light:text-slate-700 light:hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 font-sans">
                            <span>{st.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono
                                dark:bg-cyan-400 dark:text-black
                                light:bg-white light:text-slate-900"
                              >
                                Выбрано
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] mt-0.5 line-clamp-1 dark:text-slate-400 light:text-slate-500">
                            {st.shortDesc}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 shrink-0 dark:text-cyan-400 light:text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono pt-1 dark:text-cyan-400 light:text-sky-600">
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
            <div className="px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider font-mono
              dark:bg-cyan-500/15 dark:border dark:border-cyan-500/30 dark:text-cyan-300
              light:bg-sky-50 light:border light:border-sky-200 light:text-sky-800"
            >
              Ветка: {currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}
            </div>
            <div className="h-px flex-1 dark:bg-slate-800 light:bg-slate-200"></div>
            <span className="text-xs dark:text-slate-500 light:text-slate-500 font-mono">Профильные требования к стажёрам</span>
          </div>

          {/* Sub-track Nodes Spine */}
          <div className="relative pl-8 sm:pl-12 space-y-6">
            {/* Continuous vertical connecting line */}
            <div className="absolute left-4 sm:left-6 top-0 bottom-6 w-0.5 -translate-x-1/2 dark:bg-slate-800 light:bg-slate-300"></div>

            {subTrackTopics.map((topic, idx) => {
              const { total, checked, percent, isDone } = getTopicProgress(topic);
              const nodeNumber = coreTopics.length + idx + 1;

              return (
                <div key={topic.id} className="relative group">
                  {/* Tree Node Dot / Anchor on the spine */}
                  <div
                    className={`absolute -left-4 sm:-left-6 top-6 w-8 h-8 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[11px] font-black z-20 font-mono transition-all ${
                      isDone
                        ? 'dark:bg-emerald-950 dark:border-emerald-400 dark:text-emerald-300 dark:shadow-[0_0_12px_rgba(0,255,157,0.3)] light:bg-emerald-600 light:border-emerald-600 light:text-white shadow-sm'
                        : percent > 0
                        ? 'dark:bg-cyan-950 dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(0,240,255,0.3)] light:bg-sky-600 light:border-sky-600 light:text-white shadow-sm'
                        : 'dark:bg-[#06080f] dark:border-slate-700 dark:text-slate-400 light:bg-white light:border-slate-300 light:text-slate-600'
                    }`}
                  >
                    {nodeNumber}
                  </div>

                  {/* Horizontal Branch Connector Arm */}
                  <div className="absolute -left-4 sm:-left-6 top-10 w-4 sm:w-6 h-0.5 -translate-y-1/2 z-10 dark:bg-slate-800 light:bg-slate-300"></div>

                  {/* Node Card */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cyber-corner ${
                      isDone
                        ? 'dark:bg-[#08131d]/90 dark:border-emerald-500/40 dark:shadow-[0_0_16px_rgba(0,255,157,0.1)] light:bg-white light:border-emerald-300 light:shadow-sm'
                        : percent > 0
                        ? 'dark:bg-[#091224]/90 dark:border-cyan-500/40 dark:shadow-[0_0_16px_rgba(0,240,255,0.12)] light:bg-white light:border-sky-300 light:shadow-sm'
                        : 'dark:bg-[#0c101c]/90 dark:border-slate-800/90 dark:hover:border-cyan-500/30 light:bg-white light:border-slate-200 light:hover:border-slate-300 light:shadow-sm'
                    }`}
                  >
                    {/* Header: Title, Order & Doc Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold dark:text-cyan-400 light:text-sky-700 font-mono">
                          Узел #{nodeNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono
                          dark:bg-cyan-950/70 dark:text-cyan-300 dark:border dark:border-cyan-800/40
                          light:bg-sky-50 light:text-sky-800 light:border light:border-sky-200"
                        >
                          Специализация: {currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold dark:text-white dark:group-hover:text-cyan-300 light:text-slate-900 light:group-hover:text-sky-700 transition-colors font-sans">
                          {topic.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono
                          dark:bg-slate-800/80 dark:text-slate-300
                          light:bg-slate-100 light:text-slate-700"
                        >
                          {topic.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={topic.externalDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg transition-colors
                            dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white
                            light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-600 light:hover:text-slate-900"
                          title="Документация roadmap.sh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs dark:text-slate-300 light:text-slate-600 mb-3 leading-relaxed">{topic.description}</p>

                    {/* Section Progress Bar */}
                    <div className="rounded-xl p-2.5 mb-3.5 transition-colors
                      dark:bg-[#06080f]/80 dark:border dark:border-slate-800/80
                      light:bg-slate-50 light:border light:border-slate-200"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                        <span className="dark:text-slate-400 light:text-slate-600 font-medium">
                          Прогресс темы:
                        </span>
                        <span
                          className={`font-bold ${
                            isDone
                              ? 'dark:text-emerald-400 light:text-emerald-700'
                              : 'dark:text-cyan-300 light:text-sky-700'
                          }`}
                        >
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden dark:bg-slate-800 light:bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone
                              ? 'dark:bg-emerald-400 light:bg-emerald-600'
                              : 'dark:bg-cyan-400 light:bg-sky-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Subtopics Checklist */}
                    <div className="space-y-2 mb-3.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider block font-mono dark:text-slate-400 light:text-slate-500">
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
                                  ? 'dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-200 light:bg-emerald-50 light:border-emerald-200 light:text-emerald-900'
                                  : 'dark:bg-[#06080f]/70 dark:border-slate-800/80 dark:text-slate-300 dark:hover:bg-[#0a0f1d] dark:hover:border-cyan-500/30 light:bg-slate-50 light:border-slate-200 light:text-slate-700 light:hover:bg-slate-100'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 shrink-0"
                              >
                                {isSubChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 dark:text-slate-600 dark:hover:text-cyan-400 light:text-slate-400 light:hover:text-slate-700" />
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
                    <div className="p-3 rounded-xl text-[11px] mb-3.5 space-y-1 transition-colors
                      dark:bg-[#06080f]/90 dark:border dark:border-slate-800 dark:text-slate-300
                      light:bg-amber-50/70 light:border light:border-amber-200 light:text-slate-800"
                    >
                      <span className="font-bold flex items-center gap-1.5 dark:text-amber-400 light:text-amber-700 font-mono">
                        <HelpCircle className="w-3.5 h-3.5" />
                        На что смотрят на собеседовании:
                      </span>
                      <p className="dark:text-slate-400 light:text-slate-600 leading-relaxed">{topic.interviewTip}</p>
                    </div>

                    {/* Section Mark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTopicClick(topic)}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all font-mono ${
                        isDone
                          ? 'dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300 light:bg-emerald-600 light:text-white light:border-emerald-600'
                          : 'dark:bg-[#06080f] dark:border-slate-800 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-500/10 dark:hover:border-cyan-500/30 light:bg-slate-100 light:border-slate-200 light:text-slate-700 light:hover:bg-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
