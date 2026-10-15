import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Sparkles,
  ArrowDown,
  Layers,
  HelpCircle,
  Check,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, RoadmapTopic, SubTrackId, UserProgress } from '../types';
import { DIRECTIONS } from '../data/directions';
import { triggerHaptic } from '../lib/telegram';

interface RoadmapViewerProps {
  topics: RoadmapTopic[];
  userProgress: UserProgress;
  onToggleTopic: (topicId: string) => void;
}

export const RoadmapViewer: React.FC<RoadmapViewerProps> = ({
  topics,
  userProgress,
  onToggleTopic,
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
  const completedInTrack = allVisibleTopics.filter((t) =>
    userProgress.completedTopics.includes(t.id)
  ).length;

  const trackProgressPercent =
    allVisibleTopics.length > 0
      ? Math.round((completedInTrack / allVisibleTopics.length) * 100)
      : 0;

  const handleToggle = (topicId: string) => {
    triggerHaptic('selection');
    onToggleTopic(topicId);
    if (!userProgress.completedTopics.includes(topicId) && completedInTrack + 1 === allVisibleTopics.length) {
      confetti({ particleCount: 100, spread: 80 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Direction Tabs (6 Main Directions) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-3 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {DIRECTIONS.map((dir) => {
            const isSelected = dir.id === selectedDirectionId;
            return (
              <button
                key={dir.id}
                onClick={() => handleSelectDirection(dir.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-indigo-600/30 to-indigo-900/40 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform ${
                    isSelected ? 'scale-110 bg-indigo-500 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold leading-tight">{dir.title.split('-')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-track switcher & Track progress header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
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
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 shrink-0 min-w-[220px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Прогресс ветки:
            </span>
            <span className="font-extrabold text-indigo-300">
              {completedInTrack} из {allVisibleTopics.length} ({trackProgressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${trackProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Roadmap (Flow / Graph style) */}
      <div className="relative space-y-8">
        {/* BLOCK 1: CORE FOUNDATION */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold uppercase tracking-wider">
              {currentDirection.coreTitle}
            </div>
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500">Фундамент направления</span>
          </div>

          <p className="text-xs text-slate-400 mb-4 px-1">{currentDirection.coreDesc}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreTopics.map((topic, idx) => {
              const isCompleted = userProgress.completedTopics.includes(topic.id);
              return (
                <div
                  key={topic.id}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-950/20 border-emerald-800/40 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {topic.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={topic.externalDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Документация roadmap.sh"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">{topic.description}</p>

                  {/* Subtopics */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Ключевые темы:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {topic.subtopics.map((sub, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5">
                          <span className="text-indigo-400">•</span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Interview Callout */}
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-200/90 mb-3">
                    <span className="font-bold flex items-center gap-1 mb-0.5 text-amber-300">
                      <HelpCircle className="w-3.5 h-3.5" />
                      На что смотрят на собеседовании:
                    </span>
                    {topic.interviewTip}
                  </div>

                  {/* Mark as completed button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(topic.id)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isCompleted
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/40'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Тема изучена</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4" />
                        <span>Отметить тему как изученную</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRANSITION CONNECTOR */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="w-0.5 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 animate-pulse"></div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 text-xs font-extrabold shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Переход к углубленной специализации: {currentDirection.subTracks.find(s => s.id === validSubTrack)?.name}</span>
            <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 animate-pulse"></div>
        </div>

        {/* BLOCK 2: SUB-TRACK SPECIALIZATION */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
              Ветка специализации: {currentDirection.subTracks.find(s => s.id === validSubTrack)?.name}
            </div>
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500">Профильные требования вакансий</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subTrackTopics.map((topic, idx) => {
              const isCompleted = userProgress.completedTopics.includes(topic.id);
              return (
                <div
                  key={topic.id}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-950/20 border-emerald-800/40 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/50 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-xs font-bold text-purple-300">
                        {coreTopics.length + idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                        {topic.title}
                      </h4>
                    </div>

                    <a
                      href={topic.externalDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Открыть документацию"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-400 mb-3">{topic.description}</p>

                  {/* Subtopics */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Детализация стека:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {topic.subtopics.map((sub, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5">
                          <span className="text-purple-400">•</span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Interview Callout */}
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-200/90 mb-3">
                    <span className="font-bold flex items-center gap-1 mb-0.5 text-amber-300">
                      <HelpCircle className="w-3.5 h-3.5" />
                      На что смотрят на собеседовании:
                    </span>
                    {topic.interviewTip}
                  </div>

                  {/* Mark as completed button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(topic.id)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isCompleted
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-purple-600/20 hover:border-purple-500/40'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Тема изучена</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4" />
                        <span>Отметить тему как изученную</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
