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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl shadow-2xl p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 cyber-corner transition-colors
        dark:bg-[#0c101c] dark:border dark:border-cyan-500/30 dark:shadow-[0_0_32px_rgba(0,240,255,0.15)] dark:text-slate-100
        light:bg-white light:border light:border-slate-300 light:text-slate-900 light:shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl transition-colors
            dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800
            light:text-slate-400 light:hover:text-slate-900 light:hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border font-mono
            dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-400
            light:bg-sky-50 light:border-sky-200 light:text-sky-800"
          >
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans dark:text-white light:text-slate-900">
              Уведомления в Telegram
            </h2>
            <p className="text-xs font-mono dark:text-slate-400 light:text-slate-500">
              Пуши о новых стажировках от бота @{TELEGRAM_BOT_USERNAME}
            </p>
          </div>
        </div>

        {/* Telegram WebApp Auto-Detected Notice */}
        {telegramUser ? (
          <div className="mb-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 font-mono
            dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300
            light:bg-emerald-50 light:border-emerald-200 light:text-emerald-900"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <div>
              <span className="font-semibold">Mini App обнаружен:</span> Вы открыли приложение прямо в Telegram. Chat ID (<span className="font-mono font-bold">{telegramUser.id}</span>) подставлен автоматически!
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3.5 rounded-xl border text-xs space-y-2
            dark:bg-[#06080f]/90 dark:border-slate-800
            light:bg-slate-50 light:border-slate-200"
          >
            <div className="font-semibold flex items-center gap-1.5 font-mono dark:text-cyan-400 light:text-sky-700">
              <Bot className="w-4 h-4" />
              Как получать уведомления в обычном браузере:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
              <a
                href={`${TELEGRAM_BOT_URL}?start=subscribe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border font-medium transition-colors
                  dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 dark:border-cyan-500/30 dark:text-cyan-200
                  light:bg-sky-50 light:hover:bg-sky-100 light:border-sky-200 light:text-sky-800"
              >
                <span>1. Написать /start боту</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50
                  dark:bg-indigo-600/30 dark:hover:bg-indigo-600/40 dark:border-indigo-500/40 dark:text-indigo-200
                  light:bg-slate-100 light:hover:bg-slate-200 light:border-slate-300 light:text-slate-800"
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
              <label className="block text-xs font-medium mb-1 font-mono dark:text-slate-300 light:text-slate-700">
                Ваш Telegram Chat ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="например 123456789"
                required
                className="w-full px-3 py-2 rounded-xl text-sm font-mono transition-colors focus:outline-none
                  dark:bg-[#06080f] dark:border dark:border-slate-800 dark:focus:border-cyan-400 dark:text-slate-100 dark:placeholder:text-slate-600
                  light:bg-slate-50 light:border light:border-slate-300 light:focus:border-sky-500 light:text-slate-900 light:placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 font-mono dark:text-slate-300 light:text-slate-700">
                Username в Telegram
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username (необязательно)"
                className="w-full px-3 py-2 rounded-xl text-sm font-mono transition-colors focus:outline-none
                  dark:bg-[#06080f] dark:border dark:border-slate-800 dark:focus:border-cyan-400 dark:text-slate-100 dark:placeholder:text-slate-600
                  light:bg-slate-50 light:border light:border-slate-300 light:focus:border-sky-500 light:text-slate-900 light:placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Directions selector */}
          <div>
            <label className="block text-xs font-semibold mb-2 font-mono dark:text-slate-200 light:text-slate-800">
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
                    className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'dark:bg-cyan-500/20 dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(0,240,255,0.2)] light:bg-slate-900 light:border-slate-900 light:text-white shadow-sm'
                        : 'dark:bg-[#06080f] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 light:bg-slate-50 light:border-slate-200 light:text-slate-700 light:hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{dir.title.split('-')[0]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 dark:text-cyan-400 light:text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-tracks selector */}
          <div>
            <label className="block text-xs font-semibold mb-2 font-mono dark:text-slate-200 light:text-slate-800">
              Конкретные специализации и ветки ({selectedSubTracks.length}):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border transition-colors
              dark:bg-[#06080f] dark:border-slate-800
              light:bg-slate-50 light:border-slate-200"
            >
              {DIRECTIONS.filter((d) => selectedDirections.includes(d.id)).flatMap((d) =>
                d.subTracks.map((st) => {
                  const isSelected = selectedSubTracks.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleSubTrack(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all font-mono ${
                        isSelected
                          ? 'dark:bg-cyan-500/20 dark:border-cyan-400 dark:text-cyan-200 light:bg-slate-900 light:text-white light:border-slate-900'
                          : 'dark:bg-[#0c101c] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200 light:bg-white light:border-slate-200 light:text-slate-700'
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
          <div className="p-3 rounded-xl border text-xs space-y-2 transition-colors
            dark:bg-[#06080f]/80 dark:border-slate-800
            light:bg-slate-50 light:border-slate-200"
          >
            <div className="flex items-center justify-between font-mono">
              <span className="font-semibold dark:text-slate-300 light:text-slate-700">
                Bot Token для отправки пушей (@BotFather):
              </span>
              <button
                type="button"
                onClick={() => setShowTokenInput((v) => !v)}
                className="text-[11px] dark:text-cyan-400 dark:hover:text-cyan-300 light:text-sky-600 light:hover:text-sky-700"
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
                  className="w-full px-3 py-1.5 rounded-lg border font-mono text-[11px] transition-colors focus:outline-none
                    dark:bg-[#0c101c] dark:border-slate-800 dark:focus:border-cyan-400 dark:text-slate-200
                    light:bg-white light:border-slate-300 light:focus:border-sky-500 light:text-slate-900"
                />
                <p className="text-[10px] dark:text-slate-500 light:text-slate-500 font-mono">
                  Токен хранится только в вашем браузере и используется для реальных вызовов Bot API.
                </p>
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 font-mono ${
                statusMessage.type === 'success'
                  ? 'dark:bg-emerald-950/40 dark:border dark:border-emerald-500/40 dark:text-emerald-300 light:bg-emerald-50 light:border light:border-emerald-200 light:text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'dark:bg-rose-950/40 dark:border dark:border-rose-500/40 dark:text-rose-300 light:bg-rose-50 light:border light:border-rose-200 light:text-rose-900'
                  : 'dark:bg-sky-950/40 dark:border dark:border-sky-500/40 dark:text-sky-300 light:bg-sky-50 light:border light:border-sky-200 light:text-sky-900'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 font-mono">
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isLoading || !chatId}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors disabled:opacity-50
                dark:bg-[#06080f] dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200
                light:bg-slate-100 light:hover:bg-slate-200 light:border-slate-200 light:text-slate-800"
            >
              <Send className="w-3.5 h-3.5 dark:text-cyan-400 light:text-sky-600" />
              <span>Проверить уведомление</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50
                dark:bg-gradient-to-r dark:from-cyan-500 dark:to-indigo-600 dark:shadow-[0_0_16px_rgba(0,240,255,0.25)]
                light:bg-slate-900 light:hover:bg-slate-800"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Сохранение...' : 'Сохранить подписку'}</span>
            </button>
          </div>

          {!botToken && (
            <p className="text-[11px] font-mono text-center dark:text-slate-500 light:text-slate-500">
              * Для реальной отправки сообщений укажите Bot Token во вкладке «Telegram & Парсер»
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
