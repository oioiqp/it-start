import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Send,
  Check,
  AlertCircle,
  ExternalLink,
  Bot,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { DirectionId, SubTrackId, TelegramSubscription, TelegramUser } from '../types';
import { DIRECTIONS } from '../data/directions';
import { saveSubscriptionToSupabase, TELEGRAM_BOT_USERNAME, TELEGRAM_BOT_URL } from '../lib/supabase';
import {
  autoDetectChatIdFromUpdates,
  getSavedBotToken,
  saveBotToken,
  sendTelegramMessage,
  triggerHaptic,
} from '../lib/telegram';
import { saveLocalSubscription } from '../lib/storage';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUser: TelegramUser | null;
  currentSubscription: TelegramSubscription | null;
  onSubscriptionSaved: (sub: TelegramSubscription) => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
  telegramUser,
  currentSubscription,
  onSubscriptionSaved,
}) => {
  const [chatId, setChatId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [botTokenInput, setBotTokenInput] = useState<string>(getSavedBotToken());
  const [showTokenInput, setShowTokenInput] = useState<boolean>(!getSavedBotToken());
  const [selectedDirections, setSelectedDirections] = useState<DirectionId[]>(['frontend', 'backend']);
  const [selectedSubTracks, setSelectedSubTracks] = useState<SubTrackId[]>(['react', 'python']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (telegramUser) {
      setChatId(String(telegramUser.id));
      if (telegramUser.username) setUsername(telegramUser.username);
      if (telegramUser.first_name) setFirstName(telegramUser.first_name);
    } else if (currentSubscription) {
      setChatId(String(currentSubscription.chat_id));
      if (currentSubscription.username) setUsername(currentSubscription.username);
      if (currentSubscription.first_name) setFirstName(currentSubscription.first_name);
      setSelectedDirections(currentSubscription.directions);
      setSelectedSubTracks(currentSubscription.sub_tracks);
    }
  }, [telegramUser, currentSubscription, isOpen]);

  if (!isOpen) return null;

  const toggleDirection = (dirId: DirectionId) => {
    triggerHaptic('selection');
    setSelectedDirections((prev) => {
      const exists = prev.includes(dirId);
      const nextDirs = exists ? prev.filter((d) => d !== dirId) : [...prev, dirId];

      // Auto update subtracks when direction is toggled
      if (!exists) {
        const dir = DIRECTIONS.find((d) => d.id === dirId);
        if (dir && dir.subTracks.length > 0) {
          setSelectedSubTracks((s) => Array.from(new Set([...s, ...dir.subTracks.map((st) => st.id)])));
        }
      }
      return nextDirs;
    });
  };

  const toggleSubTrack = (subId: SubTrackId) => {
    triggerHaptic('selection');
    setSelectedSubTracks((prev) =>
      prev.includes(subId) ? prev.filter((s) => s !== subId) : [...prev, subId]
    );
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setStatusMessage(null);
    triggerHaptic('medium');

    const tokenToUse = botTokenInput.trim() || undefined;
    if (botTokenInput.trim()) {
      saveBotToken(botTokenInput.trim());
    }

    const result = await autoDetectChatIdFromUpdates(tokenToUse);
    setIsDetecting(false);

    if (result.success && result.chatId) {
      setChatId(String(result.chatId));
      if (result.username) setUsername(result.username);
      if (result.firstName) setFirstName(result.firstName);
      setStatusMessage({
        type: 'success',
        text: `Chat ID успешно найден: ${result.chatId} (${result.username ? '@' + result.username : result.firstName || 'Пользователь'})! Подписка синхронизирована с Supabase.`,
      });
      triggerHaptic('success');

      // Auto-save subscription to Supabase as specified in Requirement 3.1
      const subData: TelegramSubscription = {
        chat_id: String(result.chatId),
        username: (result.username || username).trim(),
        first_name: (result.firstName || firstName).trim(),
        directions: selectedDirections,
        sub_tracks: selectedSubTracks,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      saveLocalSubscription(subData);
      onSubscriptionSaved(subData);
      saveSubscriptionToSupabase(subData);
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Не удалось найти Chat ID автоматически. Нажмите кнопку шага 1, напишите /start боту и повторите!',
      });
    }
  };

  const handleTestNotification = async () => {
    if (!chatId) {
      setStatusMessage({ type: 'error', text: 'Сначала укажите или определите ваш Chat ID' });
      return;
    }

    if (botTokenInput.trim()) {
      saveBotToken(botTokenInput.trim());
    }

    setIsLoading(true);
    setStatusMessage(null);

    const testText = `<b>🚀 Тестовое уведомление от @${TELEGRAM_BOT_USERNAME}!</b>\n\nВы успешно подключили уведомления в сервисе <b>IT-Старт</b>.\n\nВыбранные направления: ${selectedDirections.join(', ')}\nВетки: ${selectedSubTracks.join(', ')}\n\nКак только появится новая стажировка под ваш стек, вы получите мгновенный пуш!`;

    const res = await sendTelegramMessage(chatId, testText, botTokenInput.trim() || undefined);
    setIsLoading(false);

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: 'Тестовое сообщение успешно доставлено в ваш Telegram! Проверьте диалог с ботом.',
      });
      triggerHaptic('success');
      confetti({ particleCount: 60, spread: 60 });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Не удалось отправить сообщение.',
      });
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      setStatusMessage({ type: 'error', text: 'Пожалуйста, укажите Telegram Chat ID' });
      return;
    }

    if (selectedDirections.length === 0) {
      setStatusMessage({ type: 'error', text: 'Выберите хотя бы одно направление стажировок' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const subData: TelegramSubscription = {
      chat_id: chatId.trim(),
      username: username.trim(),
      first_name: firstName.trim(),
      directions: selectedDirections,
      sub_tracks: selectedSubTracks,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to local storage
    saveLocalSubscription(subData);

    // Save to Supabase
    const savedToSupabase = await saveSubscriptionToSupabase(subData);

    setIsLoading(false);
    triggerHaptic('success');
    confetti({ particleCount: 90, spread: 70 });

    onSubscriptionSaved(subData);
    setStatusMessage({
      type: 'success',
      text: savedToSupabase
        ? 'Подписка успешно сохранена в базе данных Supabase и локально! Уведомления активированы.'
        : 'Подписка сохранена в кэше браузера! Уведомления активированы.',
    });

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const botToken = getSavedBotToken();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-[28px] sm:rounded-[32px] shadow-2xl p-6 sm:p-7 my-8 animate-in fade-in zoom-in-95 duration-200 transition-all liquid-glass liquid-glass-modal text-neutral-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full transition-all duration-150 z-10 active:scale-95 liquid-glass-pill hover:bg-white/70 text-neutral-800 hover:text-black cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold liquid-glass-tile text-neutral-900">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-neutral-950">
              Уведомления в Telegram
            </h2>
            <p className="text-xs text-neutral-700 font-medium">
              Мгновенные пуши о новых стажировках от бота @{TELEGRAM_BOT_USERNAME}
            </p>
          </div>
        </div>

        {/* Telegram WebApp Auto-Detected Notice */}
        {telegramUser ? (
          <div className="mb-4 p-3.5 rounded-2xl border text-xs flex items-center gap-2.5
            bg-emerald-500/10 border-emerald-500/20 text-emerald-800
            dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></div>
            <div>
              <span className="font-semibold">Mini App обнаружен:</span> Вы открыли приложение прямо в Telegram. Chat ID (<span className="font-mono font-bold">{telegramUser.id}</span>) подставлен автоматически!
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3.5 rounded-2xl border text-xs space-y-2
            bg-neutral-50 border-neutral-200/80
            dark:bg-white/[0.035] dark:border-white/10"
          >
            <div className="font-semibold flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
              <Bot className="w-4 h-4 text-neutral-500" />
              Как получать уведомления в обычном браузере:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={`${TELEGRAM_BOT_URL}?start=subscribe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border font-medium transition-colors
                  bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80 shadow-xs
                  dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-neutral-200 dark:border-white/10"
              >
                <span>1. Написать /start боту</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border font-medium transition-colors disabled:opacity-50
                  bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 border-neutral-200/80
                  dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-neutral-200 dark:border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
                <span>2. Определить мой Chat ID</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveSubscription} className="space-y-4">
          {/* Chat ID & User Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                Ваш Telegram Chat ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="например 123456789"
                required
                className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors focus:outline-none
                  bg-neutral-50 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400
                  dark:bg-white/[0.04] dark:border-white/10 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-neutral-700 dark:text-neutral-300">
                Username в Telegram
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username (необязательно)"
                className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors focus:outline-none
                  bg-neutral-50 border border-neutral-200/80 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400
                  dark:bg-white/[0.04] dark:border-white/10 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white/30"
              />
            </div>
          </div>

          {/* Directions selector */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-neutral-800 dark:text-neutral-200">
              Интересующие направления ({selectedDirections.length}):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DIRECTIONS.map((dir) => {
                const isSelected = selectedDirections.includes(dir.id);
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => toggleDirection(dir.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'liquid-glass-pill text-neutral-700 hover:bg-white/50'
                    }`}
                  >
                    <span className="truncate">{dir.title.split('-')[0]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-tracks selector */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-neutral-800">
              Конкретные специализации и ветки ({selectedSubTracks.length}):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-3 rounded-2xl liquid-glass-subtle">
              {DIRECTIONS.filter((d) => selectedDirections.includes(d.id)).flatMap((d) =>
                d.subTracks.map((st) => {
                  const isSelected = selectedSubTracks.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleSubTrack(st.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white shadow-xs'
                          : 'liquid-glass-pill text-neutral-700 hover:bg-white/50'
                      }`}
                    >
                      {st.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Bot Token Configuration Block */}
          <div className="p-3.5 rounded-2xl liquid-glass-subtle text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-800">
                Bot Token для отправки пушей (@BotFather):
              </span>
              <button
                type="button"
                onClick={() => setShowTokenInput((v) => !v)}
                className="text-[11px] font-semibold text-neutral-600 hover:text-black underline cursor-pointer"
              >
                {showTokenInput ? 'Скрыть поле' : 'Настроить токен'}
              </button>
            </div>
            {showTokenInput && (
              <div className="space-y-1 pt-1">
                <input
                  type="password"
                  value={botTokenInput}
                  onChange={(e) => {
                    setBotTokenInput(e.target.value);
                    saveBotToken(e.target.value.trim());
                  }}
                  placeholder="Токен от @BotFather (сохраняется в браузере)"
                  className="w-full px-3 py-2 rounded-xl text-xs transition-all focus:outline-none liquid-glass-pill focus:bg-white/50 text-neutral-900 placeholder:text-neutral-500"
                />
                <p className="text-[10px] text-neutral-600">
                  Токен хранится только в вашем браузере и используется для реальных вызовов Bot API.
                </p>
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-900'
                  : 'liquid-glass-pill text-neutral-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isLoading || !chatId}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 liquid-glass-pill hover:bg-white/50 text-neutral-800 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-neutral-600" />
              <span>Проверить уведомление</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 bg-neutral-900 hover:bg-black cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Сохранение...' : 'Сохранить подписку'}</span>
            </button>
          </div>

          {!botToken && (
            <p className="text-[11px] text-center text-neutral-600 font-medium">
              * Для реальной отправки сообщений укажите Bot Token во вкладке «Telegram & Парсер»
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
