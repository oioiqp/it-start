/**
 * IT-Старт — Единый сервис управления подписками на уведомления (Telegram & ВКонтакте)
 *
 * Обеспечивает сквозную синхронизацию между:
 * - Supabase (таблица `public.tg_subscriptions`, где VK-подписчики сохраняются с префиксом `vk_<peer_id>`)
 * - Локальным хранилищем браузера (localStorage)
 * - Сервером фонового парсинга и рассылки (Render /notify и /subscribe)
 */

import type { DirectionId, SubTrackId, TelegramSubscription } from '../types';
import { saveSubscriptionToSupabase, TELEGRAM_BOT_USERNAME, GITHUB_PAGES_URL } from '../lib/supabase';
import { saveLocalSubscription, getLocalSubscription } from '../lib/storage';
import { saveVkPeerId, getSavedVkToken, sendVkMessage } from '../lib/vk';
import { getSavedBotToken, sendTelegramMessage } from '../lib/telegram';

export const RENDER_URL = 'https://it-start-bot.onrender.com';

export type SubscriptionPlatform = 'telegram' | 'vk';

export interface SaveSubscriptionParams {
  platform: SubscriptionPlatform;
  id: string | number;
  username?: string;
  firstName?: string;
  directions: DirectionId[];
  subTracks: SubTrackId[];
}

export interface TestNotificationParams {
  platform: SubscriptionPlatform;
  id: string | number;
  directions?: DirectionId[];
  subTracks?: SubTrackId[];
  customText?: string;
}

/**
 * Нормализовать ID для хранения в Supabase (добавляет префикс vk_ для ВКонтакте)
 */
export function normalizeVkChatId(id: string | number): string {
  const raw = String(id).trim();
  if (!raw) return '';
  return raw.startsWith('vk_') ? raw : `vk_${raw}`;
}

/**
 * Очистить ID от префикса vk_ для вызовов VK API
 */
export function stripVkPrefix(id: string | number): string {
  return String(id).trim().replace(/^vk_/, '');
}

/**
 * Сохранить и синхронизировать подписку пользователя для Telegram или ВКонтакте
 */
export async function saveUnifiedSubscription(
  params: SaveSubscriptionParams
): Promise<{ success: boolean; subscription: TelegramSubscription; error?: string }> {
  const rawId = String(params.id || '').trim();
  if (!rawId) {
    return {
      success: false,
      subscription: null as any,
      error: 'ID пользователя обязателен для сохранения подписки',
    };
  }

  const isVk = params.platform === 'vk';
  const cleanId = isVk ? stripVkPrefix(rawId) : rawId;
  const storageChatId = isVk ? normalizeVkChatId(cleanId) : cleanId;

  const subData: TelegramSubscription = {
    chat_id: storageChatId,
    username: (params.username || '').trim(),
    first_name: (params.firstName || (isVk ? 'Пользователь VK' : 'Пользователь Telegram')).trim(),
    directions: params.directions,
    sub_tracks: params.subTracks,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Сохраняем локально
    if (isVk) {
      saveVkPeerId(cleanId);
    }
    saveLocalSubscription(subData);

    // 2. Сохраняем в Supabase с префиксом vk_ для VK пользователей
    await saveSubscriptionToSupabase(subData);

    // 3. Уведомляем серверный процесс (Render) при наличии связи
    const serverUrl = RENDER_URL.endsWith('/') ? RENDER_URL.slice(0, -1) : RENDER_URL;
    try {
      fetch(`${serverUrl}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: storageChatId,
          username: subData.username,
          firstName: subData.first_name,
          directions: subData.directions,
          sub_tracks: subData.sub_tracks,
          platform: params.platform,
        }),
      }).catch(() => {});
    } catch {}

    return { success: true, subscription: subData };
  } catch (err: any) {
    return {
      success: false,
      subscription: subData,
      error: err.message || 'Ошибка сохранения подписки',
    };
  }
}

/**
 * Отправить тестовое push-уведомление пользователю в Telegram или ВКонтакте
 */
export async function sendUnifiedTestNotification(
  params: TestNotificationParams
): Promise<{ success: boolean; messageId?: number | string; error?: string }> {
  const rawId = String(params.id || '').trim();
  if (!rawId) {
    return {
      success: false,
      error: 'Укажите ID получателя для тестового уведомления',
    };
  }

  const dirsStr = params.directions?.length ? params.directions.join(', ') : 'Все направления';
  const tracksStr = params.subTracks?.length ? params.subTracks.join(', ') : 'Все технологии';

  // ВКонтакте
  if (params.platform === 'vk') {
    const cleanPeerId = stripVkPrefix(rawId);
    const testText =
      params.customText ||
      `🔥 Тестовое уведомление IT-Старт ВКонтакте!\n\n` +
      `Вы успешно подключили уведомления в сервисе IT-Старт.\n` +
      `Выбранные направления: ${dirsStr}\n` +
      `Ветки: ${tracksStr}\n\n` +
      `Как только появится новая проверенная стажировка под ваш стек, вы получите мгновенный пуш!`;

    const vkToken = getSavedVkToken();
    if (vkToken) {
      const res = await sendVkMessage(cleanPeerId, testText, vkToken);
      if (res.success) {
        return { success: true, messageId: res.messageId };
      }
    }

    // Попытка отправить через сервер Render
    const serverUrl = RENDER_URL.endsWith('/') ? RENDER_URL.slice(0, -1) : RENDER_URL;
    try {
      const res = await fetch(`${serverUrl}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: normalizeVkChatId(cleanPeerId),
          text: testText,
          platform: 'vk',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { success: true, messageId: data.messageId };
        } else {
          return {
            success: false,
            error:
              data.error ||
              'VK API отклонил отправку: пользователь еще не разрешил сообщения от группы. Перейдите в диалог с сообществом и отправьте /subscribe.',
          };
        }
      } else {
        return {
          success: false,
          error: `Сервер уведомлений вернул статус: ${res.statusText || res.status}`,
        };
      }
    } catch {
      // Offline fallback: if server is unreachable
      return {
        success: false,
        error:
          'Сервер уведомлений временно недоступен (пробуждение 30–50с). Подписка сохранена в базе Supabase — перейдите в диалог с сообществом ВКонтакте и отправьте /subscribe.',
      };
    }
  }

  // Telegram
  const tgToken = getSavedBotToken();
  const testText =
    params.customText ||
    `<b>🚀 Тестовое уведомление от @${TELEGRAM_BOT_USERNAME}!</b>\n\n` +
    `Вы успешно подключили уведомления в сервисе <b>IT-Старт</b>.\n\n` +
    `Выбранные направления: ${dirsStr}\n` +
    `Ветки: ${tracksStr}\n\n` +
    `Как только появится новая стажировка под ваш стек, вы получите мгновенный пуш!`;

  return sendTelegramMessage(rawId, testText, tgToken || undefined, '🚀 Открыть IT-Старт', GITHUB_PAGES_URL);
}

/**
 * Получить текущую активную локальную подписку с проверкой платформы
 */
export function getCurrentActiveSubscription(): TelegramSubscription | null {
  return getLocalSubscription();
}
