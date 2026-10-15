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
    const explicitlyChecked = userProgress.completedSubtopics?.includes(subId);
    if (explicitlyChecked !== undefined) {
      return explicitlyChecked;
    }
    // If completedSubtopics doesn't contain it yet, check if topic is completed
    return userProgress.completedTopics.includes(topic.id);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 sm:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {DIRECTIONS.map((dir) => {
            const isSelected = dir.id === selectedDirectionId;
            return (
              <button
                key={dir.id}
                onClick={() => handleSelectDirection(dir.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-transform ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Специализированная ветка
            </span>
            <span className="text-xs text-slate-500">• roadmap.sh style</span>
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
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
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
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 shrink-0 min-w-[220px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Прогресс роадмапа:
            </span>
            <span className="font-extrabold text-indigo-300">
              {completedInTrack} из {allVisibleTopics.length} ({trackProgressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
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
            <div className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              {currentDirection.coreTitle}
            </div>
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500">Базовый фундамент (Обязательно для всех)</span>
          </div>

          {/* Core Nodes Spine */}
          <div className="relative pl-6 sm:pl-10 space-y-6">
            {/* Continuous vertical connecting line */}
            <div className="absolute left-[19px] sm:left-[35px] top-6 bottom-0 w-0.5 bg-slate-800"></div>

            {coreTopics.map((topic, idx) => {
              const { total, checked, percent, isDone } = getTopicProgress(topic);

              return (
                <div key={topic.id} className="relative group">
                  {/* Tree Node Dot / Anchor on the spine */}
                  <div
                    className={`absolute -left-[19px] sm:-left-[35px] top-6 w-8 h-8 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[11px] font-black z-10 transition-colors ${
                      isDone
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : percent > 0
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Node Card */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-slate-900/90 border-emerald-800/40 shadow-sm'
                        : percent > 0
                        ? 'bg-slate-900/90 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Title, Order & Doc Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          Узел #{idx + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {topic.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                          {topic.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={topic.externalDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Документация roadmap.sh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{topic.description}</p>

                    {/* Section Progress Bar */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 mb-3.5">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 font-medium">
                          Прогресс темы:
                        </span>
                        <span
                          className={`font-bold ${
                            isDone ? 'text-emerald-400' : 'text-indigo-300'
                          }`}
                        >
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Subtopics Checklist */}
                    <div className="space-y-2 mb-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
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
                                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-950 hover:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-400"
                              >
                                {isSubChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600 hover:text-indigo-400" />
                                )}
                              </button>
                              <span className={isSubChecked ? 'line-through opacity-80' : ''}>
                                {sub}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interview Callout */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 mb-3.5 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-amber-400">
                        <HelpCircle className="w-3.5 h-3.5" />
                        На что смотрят на собеседовании:
                      </span>
                      <p className="text-slate-400 leading-relaxed">{topic.interviewTip}</p>
                    </div>

                    {/* Section Mark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTopicClick(topic)}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isDone
                          ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/40'
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
          {/* Connector down to fork */}
          <div className="absolute left-[19px] sm:left-[35px] top-0 h-8 w-0.5 bg-slate-800"></div>

          <div className="relative pl-6 sm:pl-10">
            {/* Fork icon badge on spine */}
            <div className="absolute -left-[19px] sm:-left-[35px] top-6 w-9 h-9 -translate-x-1/2 rounded-full bg-slate-900 border-2 border-indigo-500 text-indigo-400 flex items-center justify-center z-10 shadow-md">
              <GitFork className="w-4 h-4 rotate-180" />
            </div>

            {/* Fork Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border-2 border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white flex items-center gap-1.5 shadow-sm">
                  <GitFork className="w-3.5 h-3.5" />
                  Развилка специализации
                </span>
                <span className="text-xs text-slate-400">
                  Общая база завершена • Выберите целевой стек
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  Переход к углубленной специализации: {currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  После освоения фундамента направления выберите профильный стек. Все последующие узлы роадмапа и практические темы автоматически адаптируются под выбранную технологию.
                </p>
              </div>

              {/* Interactive Branch Switcher Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-400 mr-1">
                  Ветки направления:
                </span>
                {currentDirection.subTracks.map((st) => {
                  const isCurrent = st.id === validSubTrack;
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleSelectSubTrack(st.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{st.name}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-indigo-400 pt-1">
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Ниже отображаются профильные темы для «{currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}»</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 2: SUB-TRACK SPECIALIZATION (Nodes N+1..M) */}
        <div className="relative">
          {/* Header of Sub-Track Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              Ветка: {currentDirection.subTracks.find((s) => s.id === validSubTrack)?.name}
            </div>
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500">Профильные требования к стажёрам</span>
          </div>

          {/* Sub-track Nodes Spine */}
          <div className="relative pl-6 sm:pl-10 space-y-6">
            {/* Continuous vertical connecting line */}
            <div className="absolute left-[19px] sm:left-[35px] top-0 bottom-6 w-0.5 bg-slate-800"></div>

            {subTrackTopics.map((topic, idx) => {
              const { total, checked, percent, isDone } = getTopicProgress(topic);
              const nodeNumber = coreTopics.length + idx + 1;

              return (
                <div key={topic.id} className="relative group">
                  {/* Tree Node Dot / Anchor on the spine */}
                  <div
                    className={`absolute -left-[19px] sm:-left-[35px] top-6 w-8 h-8 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[11px] font-black z-10 transition-colors ${
                      isDone
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : percent > 0
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {nodeNumber}
                  </div>

                  {/* Node Card */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-slate-900/90 border-emerald-800/40 shadow-sm'
                        : percent > 0
                        ? 'bg-slate-900/90 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Title, Order & Doc Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          Узел #{nodeNumber}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {topic.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                          {topic.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={topic.externalDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Документация roadmap.sh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{topic.description}</p>

                    {/* Section Progress Bar */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 mb-3.5">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-400 font-medium">
                          Прогресс темы:
                        </span>
                        <span
                          className={`font-bold ${
                            isDone ? 'text-emerald-400' : 'text-indigo-300'
                          }`}
                        >
                          {percent}% ({checked} из {total} подтем)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Subtopics Checklist */}
                    <div className="space-y-2 mb-3.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
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
                                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-950 hover:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-400"
                              >
                                {isSubChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600 hover:text-indigo-400" />
                                )}
                              </button>
                              <span className={isSubChecked ? 'line-through opacity-80' : ''}>
                                {sub}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interview Callout */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 mb-3.5 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-amber-400">
                        <HelpCircle className="w-3.5 h-3.5" />
                        На что смотрят на собеседовании:
                      </span>
                      <p className="text-slate-400 leading-relaxed">{topic.interviewTip}</p>
                    </div>

                    {/* Section Mark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTopicClick(topic)}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isDone
                          ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/40'
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
