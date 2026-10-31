/**
 * IT-Старт — Официальный автономный ВКонтакте-бот
 *
 * Серверный процесс Node.js для Render.com / локального запуска:
 * - Работает через Bots Long Poll API ВКонтакте (api.vk.com)
 * - Подключен к общей базе данных Supabase (public.internships)
 * - Единый каталог вакансий работодателей (Т-Банк, Контур, Directum, Т1, Яндекс, Ozon, Сбер, Авито, VK)
 * - Команды бота: Начать (/start), Стажировки (/vacancies), Компании (/companies), Роадмапы (/roadmaps), Вопросы (/questions), Подписка (/subscribe), Статус (/status), Помощь (/help)
 * - Интерактивные клавиатуры (Inline Keyboard & Keyboard buttons)
 * - Рассылка уведомлений о новых вакансиях подписчикам в VK
 * - Безопасный fallback-режим: при отсутствии VK_BOT_TOKEN работает в демо-режиме без падений
 *
 * Запуск:
 *   npm run bot:vk
 * или:
 *   VK_BOT_TOKEN="ВАШ_ТОКЕН_ГРУППЫ" node bot/vk_bot.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPANIES_DATA,
  findCompanyByQuery,
  ALL_INTERNSHIPS,
  SEED_INTERNSHIPS,
  PORTAL_FALLBACK_VACANCIES,
  getActiveInternships,
  LAST_SCAN_STATUS,
  ALL_TARGET_TG_CHANNELS,
  CAREER_WEBSITES_DATA,
  scanChannelsAndSyncSupabase,
  supabase,
  DIRECTION_ALIASES,
  DIRECTION_TITLES,
  resolveDirectionByQuery,
} from './bot.mjs';

export { ALL_INTERNSHIPS, SEED_INTERNSHIPS, PORTAL_FALLBACK_VACANCIES, DIRECTION_ALIASES, DIRECTION_TITLES, resolveDirectionByQuery };

// Auto-load .env configuration if present
function autoLoadEnv() {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const candidateEnvPaths = [
      path.resolve(currentDir, '.env'),
      path.resolve(currentDir, '..', '.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'bot', '.env'),
    ];

    for (const envPath of candidateEnvPaths) {
      if (fs.existsSync(envPath)) {
        if (typeof process.loadEnvFile === 'function') {
          try {
            process.loadEnvFile(envPath);
          } catch {
            parseEnvFile(envPath);
          }
        } else {
          parseEnvFile(envPath);
        }
      }
    }
  } catch {}
}

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

if (process.env.NODE_ENV !== 'test') {
  autoLoadEnv();
}

// Configuration
const isDirectCli =
  typeof process !== 'undefined' &&
  Boolean(process.argv?.[1]) &&
  (process.argv[1].endsWith('vk_bot.mjs') || process.argv[1].endsWith('vk_bot.js'));

export const VK_BOT_TOKEN =
  process.env.VK_BOT_TOKEN ||
  process.env.VK_GROUP_TOKEN ||
  (process.argv?.[2] && process.argv[2].startsWith('vk1.a.')
    ? process.argv[2]
    : isDirectCli && process.argv?.[2] && !process.argv[2].startsWith('-')
    ? process.argv[2]
    : '');

export const VK_GROUP_ID = process.env.VK_GROUP_ID || '242573933';
export const VK_APP_ID = process.env.VK_APP_ID || '54857681';
export const VK_API_VERSION = '5.199';
export const VK_API_BASE = 'https://api.vk.com/method';
export const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';
export const RENDER_URL = process.env.RENDER_URL || 'https://it-start-bot.onrender.com/';
export const VK_COMMUNITY_URL = process.env.VK_COMMUNITY_URL || 'https://vk.com/club242573933';

export const VK_BOT_CONFIG = {
  version: VK_API_VERSION,
  apiBase: VK_API_BASE,
  defaultUrl: GITHUB_PAGES_URL,
  communityUrl: VK_COMMUNITY_URL,
  appId: VK_APP_ID,
  botName: 'IT-Старт VK Бот',
};

// In-memory subscribers store for VK push notifications
export const vkSubscribers = new Map();

// In-memory user menu tracking for contextual numbered commands (main, vacancies, companies)
export const userMenuState = new Map();

export function clearUserMenuState() {
  userMenuState.clear();
}

// Helper: strip HTML tags & entities for VK messages
export function cleanHtmlForVk(html = '') {
  return String(html)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<b>(.*?)<\/b>/gi, '$1')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<i>(.*?)<\/i>/gi, '$1')
    .replace(/<em>(.*?)<\/em>/gi, '$1')
    .replace(/<code>(.*?)<\/code>/gi, '$1')
    .replace(/<pre>(.*?)<\/pre>/gis, '$1')
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Build a valid VK Keyboard JSON string
 * @param {Object} options
 * @param {Array<Array<Object>>} options.buttons - 2D array of button definitions
 * @param {boolean} [options.inline=true] - Inline keyboard vs Persistent chat keyboard
 * @param {boolean} [options.oneTime=false] - Hide standard keyboard after tap
 */
export function createVkKeyboard(options = {}) {
  const { buttons = [], inline = true, oneTime = false } = options;

  const formattedRows = buttons.map((row) =>
    row.map((btn) => {
      // 1. Link button
      if (btn.link) {
        return {
          action: {
            type: 'open_link',
            link: btn.link,
            label: String(btn.label).slice(0, 40),
          },
        };
      }

      // 2. VK Mini App button
      if (btn.app_id) {
        const appAction = {
          type: 'open_app',
          app_id: Number(btn.app_id),
          label: String(btn.label).slice(0, 40),
          hash: btn.hash || '',
        };
        if (btn.owner_id) {
          appAction.owner_id = Number(btn.owner_id);
        }
        return {
          action: appAction,
        };
      }

      // 3. Callback button
      if (btn.type === 'callback') {
        const payloadString =
          typeof btn.payload === 'object' ? JSON.stringify(btn.payload) : String(btn.payload || '{}');
        return {
          action: {
            type: 'callback',
            label: String(btn.label).slice(0, 40),
            payload: payloadString,
          },
          color: btn.color || 'secondary',
        };
      }

      // 4. Regular text button
      const payloadString =
        typeof btn.payload === 'object' ? JSON.stringify(btn.payload) : String(btn.payload || '{}');

      return {
        action: {
          type: 'text',
          label: String(btn.label).slice(0, 40),
          payload: payloadString,
        },
        color: btn.color || 'secondary', // 'primary' | 'secondary' | 'positive' | 'negative'
      };
    })
  );

  return JSON.stringify({
    one_time: inline ? false : Boolean(oneTime),
    inline: Boolean(inline),
    buttons: formattedRows,
  });
}

// Predefined Keyboards
export const MAIN_VK_INLINE_KEYBOARD = createVkKeyboard({
  inline: true,
  buttons: [
    [
      { label: '🚀 Запустить IT-Старт (Mini App)', app_id: VK_APP_ID },
    ],
    [
      { label: '💼 Стажировки', payload: { cmd: 'vacancies' }, color: 'primary' },
      { label: '🏢 Компании', payload: { cmd: 'companies' }, color: 'primary' },
    ],
    [
      { label: '🗺 Роадмапы', payload: { cmd: 'roadmaps' }, color: 'secondary' },
      { label: '❓ Вопросы', payload: { cmd: 'questions' }, color: 'secondary' },
    ],
    [
      { label: '🔔 Подписка', payload: { cmd: 'subscribe' }, color: 'positive' },
      { label: '🌐 Сайт без VPN', link: RENDER_URL },
    ],
  ],
});

export const MAIN_VK_KEYBOARD = createVkKeyboard({
  inline: false,
  oneTime: false,
  buttons: [
    [
      { label: '🚀 Запустить IT-Старт', app_id: VK_APP_ID },
    ],
    [
      { label: '💼 Стажировки', payload: { cmd: 'vacancies' }, color: 'primary' },
      { label: '🏢 Компании', payload: { cmd: 'companies' }, color: 'primary' },
    ],
    [
      { label: '🗺 Роадмапы', payload: { cmd: 'roadmaps' }, color: 'secondary' },
      { label: '❓ Вопросы', payload: { cmd: 'questions' }, color: 'secondary' },
    ],
    [
      { label: '🔔 Подписка', payload: { cmd: 'subscribe' }, color: 'positive' },
      { label: '📊 Статус', payload: { cmd: 'status' }, color: 'secondary' },
      { label: 'ℹ️ Помощь', payload: { cmd: 'help' }, color: 'secondary' },
    ],
  ],
});

export const VACANCIES_VK_KEYBOARD = createVkKeyboard({
  inline: true,
  buttons: [
    [
      { label: '🚀 Запустить IT-Старт (Mini App)', app_id: VK_APP_ID },
    ],
    [
      { label: '💻 Frontend', payload: { cmd: 'direction', id: 'frontend' }, color: 'primary' },
      { label: '⚙️ Backend', payload: { cmd: 'direction', id: 'backend' }, color: 'primary' },
    ],
    [
      { label: '📱 Mobile', payload: { cmd: 'direction', id: 'mobile' }, color: 'secondary' },
      { label: '🤖 Data Science', payload: { cmd: 'direction', id: 'data_science' }, color: 'secondary' },
    ],
    [
      { label: '🧪 QA', payload: { cmd: 'direction', id: 'qa' }, color: 'secondary' },
      { label: '☁️ DevOps', payload: { cmd: 'direction', id: 'devops' }, color: 'secondary' },
    ],
    [
      { label: '🏢 Компании', payload: { cmd: 'companies' }, color: 'primary' },
      { label: '🌐 Сайт без VPN', link: RENDER_URL },
    ],
  ],
});

export const COMPANIES_VK_KEYBOARD = createVkKeyboard({
  inline: true,
  buttons: [
    [
      { label: 'Т1', payload: { cmd: 'company', id: 't1' }, color: 'primary' },
      { label: 'Контур', payload: { cmd: 'company', id: 'kontur' }, color: 'primary' },
      { label: 'Т-Банк', payload: { cmd: 'company', id: 'tbank' }, color: 'primary' },
    ],
    [
      { label: 'Directum', payload: { cmd: 'company', id: 'directum' }, color: 'positive' },
      { label: 'Яндекс', payload: { cmd: 'company', id: 'yandex' }, color: 'secondary' },
      { label: 'Ozon', payload: { cmd: 'company', id: 'ozon' }, color: 'secondary' },
    ],
    [
      { label: 'Сбер', payload: { cmd: 'company', id: 'sber' }, color: 'positive' },
      { label: 'Авито', payload: { cmd: 'company', id: 'avito' }, color: 'secondary' },
      { label: 'VK', payload: { cmd: 'company', id: 'vk' }, color: 'primary' },
    ],
    [
      { label: '🚀 Открыть в Mini App', app_id: VK_APP_ID },
    ],
  ],
});

export function formatVkVacancyMessage(item) {
  if (!item) return '';
  const tagsStr = Array.isArray(item.tags) ? item.tags.slice(0, 4).join(' • ') : '';
  const desc = item.description ? `\n📝 ${item.description.slice(0, 160)}...` : '';
  const url = item.applyUrl || item.url || GITHUB_PAGES_URL;

  return (
    `💼 ${item.company} — ${item.title}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Зарплата: ${item.salary || 'По договоренности'}\n` +
    `📍 Формат: ${item.format || 'Удаленно'} | ${item.location || item.city || 'РФ'}\n` +
    `📢 Источник: ${item.sourceChannel || item.channel || 'IT-Старт'}\n` +
    (tagsStr ? `🏷 Стек: ${tagsStr}\n` : '') +
    desc +
    `\n\n🔗 Подробнее и отклик: ${url}`
  );
}

/**
 * Format a list of vacancies
 */
export function formatVkVacanciesList(items = [], title = 'Актуальные стажировки', limit = 5) {
  const slice = items.slice(0, limit);
  if (slice.length === 0) {
    return (
      `🔍 По вашему запросу стажировок пока не найдено.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Попробуйте выбрать другое направление или компанию на клавиатуре ниже, либо откройте каталог в VK Mini App!`
    );
  }

  let text = `🔥 ${title} (${slice.length} из ${items.length}):\n`;
  text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  slice.forEach((item, idx) => {
    const verifiedApplyUrl = item.applyUrl || item.url || RENDER_URL;
    const channel = item.sourceChannel || item.channel || '@t1career';
    text += `[${idx + 1}] 🏢 ${item.company} — ${item.title}\n`;
    text += `   💰 ${item.salary || 'По договоренности'} | 📍 ${item.format || 'Удаленно'} (${item.location || item.city || 'РФ'})\n`;
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      text += `   🏷 Стек: ${item.tags.slice(0, 4).join(' • ')}\n`;
    }
    text += `   📢 Источник: ${channel}\n`;
    text += `   🔗 Откликнуться: ${verifiedApplyUrl}\n`;
    text += '────────────────────────────────\n';
  });

  if (items.length > limit) {
    text += `\n... и ещё ${items.length - limit} стажировок доступно в VK Mini App!\n`;
  }

  text += `\n💡 Все вакансии с фильтрами, роадмапами и тренажёром доступны в приложении:\n`;
  text += `🚀 VK Mini App: https://vk.com/app${VK_APP_ID}\n`;
  text += `🌐 Веб-версия без VPN: ${RENDER_URL}`;
  return text;
}

/**
 * Convert VK keyboard object/string into clean text menu lines for environments
 * where keyboards are temporarily disabled or restricted (VK error 912 fallback)
 */
export function keyboardToTextMenu(keyboard) {
  if (!keyboard) return '';
  try {
    const kb = typeof keyboard === 'string' ? JSON.parse(keyboard) : keyboard;
    const buttons = kb.buttons || [];
    const flat = buttons.flat();
    const lines = [];
    flat.forEach((btn, idx) => {
      const action = btn.action || btn;
      const label = action.label || '';
      const link = action.link || '';
      const appId = action.app_id || '';
      if (appId) {
        lines.push(`[${idx + 1}] ${label}: https://vk.com/app${appId}`);
      } else if (link) {
        lines.push(`[${idx + 1}] ${label}: ${link}`);
      } else if (label) {
        lines.push(`[${idx + 1}] ${label}`);
      }
    });
    if (lines.length === 0) return '';
    return '\n\n📌 Меню команд (отправьте цифру или слово):\n' + lines.join('\n') + '\n[0] 🏠 Главное меню';
  } catch {
    return '';
  }
}

/**
 * Normalize and extract numeric VK Peer / User ID
 * Supports: 482655491, vk_482655491, id482655491, https://vk.com/id482655491, vk.com/id482655491
 */
export function cleanVkPeerId(raw) {
  if (raw === undefined || raw === null) return '';
  const str = String(raw).trim();
  let cleaned = str.replace(/^vk_/i, '').trim();
  const urlMatch = cleaned.match(/(?:(?:https?:\/\/)?(?:m\.)?vk\.com\/(?:id)?)?(\d+)/i);
  if (urlMatch && urlMatch[1] && /^\d+$/.test(urlMatch[1])) {
    return Number(urlMatch[1]);
  }
  if (/^id\d+$/i.test(cleaned)) {
    return Number(cleaned.replace(/^id/i, ''));
  }
  const digits = cleaned.replace(/[^0-9-]/g, '');
  if (/^-?\d+$/.test(digits) && digits.length >= 4) {
    return Number(digits);
  }
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : cleaned;
}

/**
 * Send request to VK API
 */
export async function callVk(method, params = {}, token = VK_BOT_TOKEN) {
  const tokenToUse =
    token ||
    VK_BOT_TOKEN ||
    process.env.VK_BOT_TOKEN ||
    process.env.VK_GROUP_TOKEN ||
    '';

  const cleanParams = { ...params };
  if (cleanParams.peer_id !== undefined && cleanParams.peer_id !== null) {
    cleanParams.peer_id = cleanVkPeerId(cleanParams.peer_id);
  }
  if (cleanParams.user_id !== undefined && cleanParams.user_id !== null) {
    cleanParams.user_id = cleanVkPeerId(cleanParams.user_id);
  }
  if (method === 'messages.send' && !cleanParams.random_id) {
    cleanParams.random_id = Math.floor(Math.random() * 2147483647);
  }

  if (!tokenToUse) {
    // Graceful fallback/mock mode when no token is configured
    return {
      ok: true,
      result: {
        mock: true,
        method,
        params: cleanParams,
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const url = `${VK_API_BASE}/${method}`;
    const formParams = new URLSearchParams();
    formParams.append('v', VK_API_VERSION);
    formParams.append('access_token', tokenToUse);

    for (const [k, v] of Object.entries(cleanParams)) {
      if (v !== undefined && v !== null) {
        formParams.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const data = await res.json();

    if (data.error) {
      // Automatic fallback for VK API keyboard errors (code 912, 100, 911, etc.)
      const errCode = data.error.error_code;
      const errMsg = String(data.error.error_msg || '').toLowerCase();
      const isKeyboardError =
        errCode === 912 ||
        errCode === 911 ||
        (errCode === 100 && errMsg.includes('keyboard')) ||
        errMsg.includes('keyboard') ||
        errMsg.includes('chat bot feature');

      if (method === 'messages.send' && cleanParams.keyboard && isKeyboardError) {
        console.warn(
          `[VK Bot] ⚠️ Внимание: Ошибка клавиатуры VK API (${errCode}: ${data.error.error_msg}). ` +
          `Автоматически отправляем ответ в текстовом режиме без кнопок. ` +
          `Для включения кнопок: Сообщество -> Управление -> Сообщения -> Настройки для бота -> Возможности ботов: Включены.`
        );
        const fallbackParams = { ...cleanParams };
        const textMenu = keyboardToTextMenu(fallbackParams.keyboard);
        delete fallbackParams.keyboard;
        if (textMenu && !String(fallbackParams.message || '').includes('Меню команд')) {
          fallbackParams.message = `${fallbackParams.message || ''}${textMenu}`;
        }
        return callVk(method, fallbackParams, tokenToUse);
      }

      if (errCode === 901 || errCode === 902) {
        console.warn(
          `[VK Bot] ⚠️ Пользователь ${cleanParams.peer_id} еще не разрешил сообщения от группы или не написал /start боту.`
        );
      }

      console.warn(`[VK API Error] ${method}:`, data.error.error_msg || data.error);
      return { ok: false, error: data.error };
    }

    return { ok: true, result: data.response };
  } catch (err) {
    console.warn(`[VK API Exception] ${method}:`, err.message);
    return { ok: false, error: { error_msg: err.message } };
  }
}

/**
 * Register a user as a VK push subscriber (synced with Supabase & in-memory)
 */
export async function registerVkSubscriber(peerId, meta = {}) {
  const cleanId = cleanVkPeerId(peerId);
  const id = String(cleanId);
  const sub = {
    peer_id: id,
    first_name: meta.first_name || 'Пользователь VK',
    username: meta.username || '',
    directions: meta.directions || ['frontend', 'backend', 'mobile', 'qa', 'devops', 'data_science'],
    sub_tracks: meta.sub_tracks || ['react', 'python', 'nodejs', 'golang', 'auto_qa', 'cicd_docker'],
    subscribed_at: new Date().toISOString(),
    is_active: true,
  };
  vkSubscribers.set(id, sub);

  try {
    if (supabase && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      const row = {
        chat_id: `vk_${id}`,
        username: meta.username || '',
        first_name: sub.first_name,
        directions: sub.directions,
        sub_tracks: sub.sub_tracks,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('tg_subscriptions').upsert(row, { onConflict: 'chat_id' });
    }
  } catch {
    // Graceful offline fallback
  }

  return sub;
}

/**
 * Unregister a VK push subscriber
 */
export async function unregisterVkSubscriber(peerId) {
  const id = String(cleanVkPeerId(peerId));
  const deleted = vkSubscribers.delete(id);

  try {
    if (supabase && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      await supabase.from('tg_subscriptions').update({ is_active: false }).eq('chat_id', `vk_${id}`);
      await supabase.from('tg_subscriptions').update({ is_active: false }).eq('chat_id', id);
    }
  } catch {
    // Graceful offline fallback
  }

  return Boolean(deleted);
}

/**
 * Check if a user has allowed messages from the VK community
 * Method: messages.isMessagesFromGroupAllowed
 */
export async function isMessagesFromGroupAllowed(userId, groupId = VK_GROUP_ID, token = VK_BOT_TOKEN) {
  const cleanUserId = cleanVkPeerId(userId);
  const cleanGroupId = Number(String(groupId).replace(/^-/, '')) || String(groupId).replace(/^-/, '');

  const tokenToUse =
    token ||
    VK_BOT_TOKEN ||
    process.env.VK_BOT_TOKEN ||
    process.env.VK_GROUP_TOKEN ||
    '';

  if (!tokenToUse) {
    return { ok: true, is_allowed: true, mock: true };
  }

  const res = await callVk(
    'messages.isMessagesFromGroupAllowed',
    {
      group_id: cleanGroupId,
      user_id: cleanUserId,
    },
    tokenToUse
  );

  if (res.ok && res.result) {
    const isAllowed = res.result.is_allowed === 1;
    return { ok: true, is_allowed: isAllowed, raw: res.result };
  }

  return { ok: false, is_allowed: false, error: res.error };
}

/**
 * Send a notification message to a VK user / subscriber
 * Handles: peer_id normalization, HTML tag stripping, random_id generation,
 * interactive keyboard, permissions check and friendly Russian error mapping.
 */
export async function sendVkNotification(peerId, text, options = {}, token = VK_BOT_TOKEN) {
  const cleanPeerId = cleanVkPeerId(peerId);
  if (!cleanPeerId) {
    return { ok: false, error: 'Не указан корректный peer_id получателя' };
  }

  const tokenToUse =
    token ||
    VK_BOT_TOKEN ||
    process.env.VK_BOT_TOKEN ||
    process.env.VK_GROUP_TOKEN ||
    '';

  // Optional permission check before sending
  if (options.checkPermission && tokenToUse) {
    const perm = await isMessagesFromGroupAllowed(cleanPeerId, options.group_id || VK_GROUP_ID, tokenToUse);
    if (perm.ok && perm.is_allowed === false) {
      return {
        ok: false,
        error: 'Пользователь еще не разрешил сообщения от группы ВКонтакте. Перейдите в диалог с ботом и отправьте /subscribe.',
        code: 901,
      };
    }
  }

  const cleanMessage = cleanHtmlForVk(text);
  const randomId = options.random_id || Math.floor(Math.random() * 2147483647);
  const keyboard = options.keyboard !== undefined ? options.keyboard : createVkKeyboard({
    inline: true,
    buttons: [
      [
        { label: '🚀 Открыть в Mini App', app_id: VK_APP_ID },
        ...(options.applyUrl ? [{ label: '🔗 Откликнуться', link: options.applyUrl }] : [{ label: '🌐 Веб-версия', link: RENDER_URL }]),
      ],
      [
        { label: '💼 Каталог вакансий', payload: { cmd: 'vacancies' }, color: 'primary' },
        { label: '🔔 Настройки подписки', payload: { cmd: 'subscribe' }, color: 'secondary' },
      ],
    ],
  });

  const res = await callVk(
    'messages.send',
    {
      peer_id: cleanPeerId,
      random_id: randomId,
      message: cleanMessage,
      ...(keyboard ? { keyboard } : {}),
    },
    tokenToUse
  );

  if (res.ok) {
    return { ok: true, messageId: res.result };
  }

  const errCode = res.error?.error_code;
  let friendlyError = res.error?.error_msg || String(res.error || 'Ошибка отправки');
  if (errCode === 901 || errCode === 902) {
    friendlyError = 'Пользователь еще не разрешил сообщения от сообщества ВКонтакте. Перейдите в диалог с ботом и отправьте /subscribe.';
  }

  return { ok: false, error: friendlyError, errorCode: errCode };
}

/**
 * Synchronize subscribers from recent VK conversations (discovers active dialogues)
 */
export async function syncSubscribersFromVkConversations(token = VK_BOT_TOKEN) {
  const tokenToUse =
    token ||
    VK_BOT_TOKEN ||
    process.env.VK_BOT_TOKEN ||
    process.env.VK_GROUP_TOKEN ||
    '';

  if (!tokenToUse) return 0;

  try {
    const res = await callVk('messages.getConversations', { count: 100 }, tokenToUse);
    if (!res.ok || !res.result || !Array.isArray(res.result.items)) {
      return 0;
    }

    let syncedCount = 0;
    for (const item of res.result.items) {
      const conv = item.conversation;
      if (!conv) continue;
      const peer = conv.peer;
      const canWrite = conv.can_write?.allowed;

      if (peer && peer.type === 'user' && peer.id > 0 && canWrite) {
        const idStr = String(peer.id);
        const existing = vkSubscribers.get(idStr);
        if (!existing || !existing.is_active) {
          console.log(`[VK Bot] 🔍 Обнаружен активный диалог с пользователем VK ${idStr}, регистрируем подписку...`);
          await registerVkSubscriber(peer.id, {
            first_name: 'Пользователь VK',
          });
          syncedCount++;
        }
      }
    }
    if (syncedCount > 0) {
      console.log(`[VK Bot] ✅ Синхронизировано ${syncedCount} пользователей из активных диалогов VK.`);
    }
    return syncedCount;
  } catch (err) {
    console.warn('[VK Bot] syncSubscribersFromVkConversations warning:', err.message);
    return 0;
  }
}

/**
 * Get latest active VK user for automatic ID detection in browser
 */
export async function getLatestVkUser(token = VK_BOT_TOKEN) {
  const tokenToUse =
    token ||
    VK_BOT_TOKEN ||
    process.env.VK_BOT_TOKEN ||
    process.env.VK_GROUP_TOKEN ||
    '';

  if (tokenToUse) {
    try {
      const res = await callVk('messages.getConversations', { count: 10 }, tokenToUse);
      if (res.ok && res.result && Array.isArray(res.result.items)) {
        for (const item of res.result.items) {
          const peer = item.conversation?.peer;
          if (peer && peer.type === 'user' && peer.id > 0) {
            let firstName = 'Пользователь VK';
            let lastName = '';
            try {
              const uRes = await callVk('users.get', { user_ids: peer.id }, tokenToUse);
              if (uRes.ok && Array.isArray(uRes.result) && uRes.result[0]) {
                firstName = uRes.result[0].first_name || firstName;
                lastName = uRes.result[0].last_name || '';
              }
            } catch {}

            return {
              ok: true,
              peerId: peer.id,
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`.trim(),
            };
          }
        }
      }
    } catch (e) {
      console.warn('[VK Bot] getLatestVkUser VK API warning:', e.message);
    }
  }

  const subs = Array.from(vkSubscribers.values()).filter((s) => s.is_active);
  if (subs.length > 0) {
    const latest = subs[subs.length - 1];
    return {
      ok: true,
      peerId: Number(latest.peer_id) || latest.peer_id,
      firstName: latest.first_name || 'Пользователь VK',
      fullName: latest.first_name || 'Пользователь VK',
    };
  }

  return { ok: false, error: 'Пока нет входящих диалогов от пользователей VK' };
}

/**
 * Get all active VK subscribers
 */
export async function getVkSubscribers() {
  if (supabase && process.env.NODE_ENV !== 'test') {
    try {
      const { data, error } = await supabase.from('tg_subscriptions').select('*').eq('is_active', true);
      if (error) {
        console.warn('[VK Bot] Supabase error in getVkSubscribers:', error.message);
      }
      if (data && Array.isArray(data)) {
        const activeIds = new Set();
        for (const row of data) {
          const rawChatId = String(row.chat_id || '').trim();
          if (rawChatId.startsWith('vk_')) {
            const cleanId = cleanVkPeerId(rawChatId);
            const pid = String(cleanId);
            if (!pid) continue;
            activeIds.add(pid);
            const dirs = Array.isArray(row.directions) && row.directions.length > 0
              ? row.directions
              : ['frontend', 'backend', 'mobile', 'qa', 'devops', 'data_science'];
            const tracks = Array.isArray(row.sub_tracks) && row.sub_tracks.length > 0
              ? row.sub_tracks
              : ['react', 'python', 'nodejs', 'golang', 'auto_qa', 'cicd_docker'];
            vkSubscribers.set(pid, {
              peer_id: pid,
              first_name: row.first_name || 'Пользователь VK',
              username: row.username || '',
              directions: dirs,
              sub_tracks: tracks,
              subscribed_at: row.updated_at || new Date().toISOString(),
              is_active: true,
            });
          }
        }
        for (const [pid, sub] of vkSubscribers.entries()) {
          if (!activeIds.has(pid)) {
            sub.is_active = false;
          }
        }
      }
    } catch (e) {
      console.warn('[VK Bot] Exception in getVkSubscribers:', e.message);
    }
  }
  return Array.from(vkSubscribers.values()).filter((s) => s.is_active);
}

// Cache of already notified VK subscribers to prevent duplicates on recurring scans
export const notifiedVkKeys = new Set();

export function clearVkNotifiedCache() {
  notifiedVkKeys.clear();
}

/**
 * Notify all VK subscribers about matching vacancies from monitoring
 */
export async function notifyVkSubscribers(vacancies = [], token = VK_BOT_TOKEN) {
  if (!vacancies || vacancies.length === 0) return 0;
  const subscribers = await getVkSubscribers();
  if (subscribers.length === 0) {
    console.log('[VK Notifier] Нет активных VK-подписчиков для рассылки.');
    return 0;
  }

  console.log(`[VK Notifier] Рассылка по ${subscribers.length} активным VK-подписчикам (кандидатов: ${vacancies.length})...`);
  let sentCount = 0;

  for (const sub of subscribers) {
    const cleanPeerId = cleanVkPeerId(sub.peer_id);
    if (!cleanPeerId) continue;

    const subDirs = Array.isArray(sub.directions) ? sub.directions : [];
    const subTracks = Array.isArray(sub.sub_tracks) ? sub.sub_tracks : [];

    // Filter vacancies matching this subscriber's preferences
    const matching = vacancies.filter((vac) => {
      if (!vac) return false;
      const vacDir = vac.directionId || vac.direction;
      const vacSub = vac.subTrackId || vac.sub_track;

      // If subscriber has no direction preferences set, or vacancy specifies no direction/track, match all
      if (subDirs.length === 0 && subTracks.length === 0) return true;
      if (!vacDir && !vacSub) return true;

      const dirMatch = vacDir ? subDirs.includes(vacDir) : false;
      const trackMatch = vacSub ? subTracks.includes(vacSub) : false;

      if (vacDir && vacSub) {
        return dirMatch || trackMatch;
      }
      if (vacDir) {
        return subDirs.length === 0 || dirMatch;
      }
      if (vacSub) {
        return subTracks.length === 0 || trackMatch;
      }
      return true;
    });

    // Send up to 2 unnotified matching vacancies per subscriber
    let sentForSub = 0;
    for (const vac of matching) {
      if (sentForSub >= 2) break;

      const dedupeKey = `${cleanPeerId}_${vac.id || vac.title || vac.url}`;
      if (notifiedVkKeys.has(dedupeKey)) continue;

      const tagsStr = Array.isArray(vac.tags) && vac.tags.length > 0
        ? vac.tags.slice(0, 4).join(' • ')
        : 'Junior / Стажировка';
      const isWeb = vac.sourceType === 'portal' || vac.sourceType === 'website';
      const sourceLabel = isWeb ? 'Карьерный сайт' : 'Telegram-канал';
      const sourceChannel = vac.sourceChannel || vac.channel || (isWeb ? 'Сайт работодателя' : 'Telegram-канал');
      const applyUrl = vac.applyUrl || vac.url || RENDER_URL;
      const actionLabel = isWeb ? '🔗 Откликнуться на сайте' : '🔗 Открыть пост с вакансией';

      const msg =
        `🔥 Новая стажировка из мониторинга работодателей!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💼 ${vac.company} — ${vac.title}\n` +
        `💰 Зарплата: ${vac.salary || 'По договоренности'}\n` +
        `📍 Формат: ${vac.format || 'Удаленно'} | ${vac.location || vac.city || 'РФ'}\n` +
        `🏷 Стек: ${tagsStr}\n` +
        `📢 Источник: ${sourceChannel} (${sourceLabel})\n` +
        `🔗 Ссылка на вакансию: ${applyUrl}\n\n` +
        `🎯 В IT-Старт уже подготовлен персональный план вопросов для этого направления!\n` +
        `🔗 Откликнуться: ${applyUrl}`;

      try {
        const res = await sendVkNotification(
          cleanPeerId,
          msg,
          {
            applyUrl,
            keyboard: createVkKeyboard({
              inline: true,
              buttons: [
                [
                  { label: '🚀 Открыть в Mini App', app_id: VK_APP_ID },
                  { label: actionLabel, link: applyUrl },
                ],
                [
                  { label: '💼 Каталог вакансий', payload: { cmd: 'vacancies' }, color: 'primary' },
                  { label: '🔔 Настройки подписки', payload: { cmd: 'subscribe' }, color: 'secondary' },
                ],
              ],
            }),
          },
          token
        );

        if (res.ok) {
          notifiedVkKeys.add(dedupeKey);
          sentForSub++;
          sentCount++;
          console.log(`[VK Notifier] ✅ Пуш доставлен подписчику vk_${cleanPeerId} (${vac.company} — ${vac.title})`);
        } else {
          console.warn(`[VK Notifier] ⚠️ Не удалось отправить пуш vk_${cleanPeerId}: ${res.error || 'Unknown'}`);
          if (res.errorCode === 901 || res.errorCode === 902) {
            // User hasn't allowed messages; break to avoid wasting rate limit on subsequent vacancies
            break;
          }
        }
      } catch (sendErr) {
        console.error(`[VK Notifier] ❌ Ошибка отправки пуша vk_${cleanPeerId}:`, sendErr.message);
      }
    }
  }

  return sentCount;
}

export const notifyVkSubscribersAboutNewVacancies = notifyVkSubscribers;

// Direction aliases dictionary for Russian & English commands (shared with Telegram bot)
export const VK_DIRECTION_ALIASES = DIRECTION_ALIASES;

/**
 * Send company details and open vacancies to a VK user
 */
export async function sendVkCompanyDetails(peerId, targetCompany, token = VK_BOT_TOKEN, finish = (x) => x) {
  const allVacancies = await getActiveInternships();
  const companyVacancies = allVacancies.filter(
    (v) =>
      (v.companyId || '').toLowerCase() === targetCompany.id ||
      (v.company || '').toLowerCase().includes(targetCompany.shortName.toLowerCase()) ||
      findCompanyByQuery(v.company)?.id === targetCompany.id
  );

  let text = `🏢 Работодатель: ${targetCompany.name} (${targetCompany.shortName})\n`;
  text += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  text += `📝 О компании:\n${targetCompany.description}\n\n`;
  text += `🛠 Основной стек: ${targetCompany.stack}\n`;
  text += `📢 Канал работодателя: ${targetCompany.channel}\n\n`;

  if (companyVacancies.length > 0) {
    text += `🔥 Открытые позиции (${companyVacancies.length}):\n`;
    companyVacancies.slice(0, 5).forEach((v, idx) => {
      text += `\n[${idx + 1}] 💼 ${v.title}\n`;
      text += `   💰 ${v.salary || 'По договоренности'} | 📍 ${v.format || 'Удаленно'}\n`;
      text += `   🔗 ${v.applyUrl || v.url || RENDER_URL}\n`;
    });
  } else {
    text += `🔍 Сейчас прямых позиций в базе нет, но парсер отслеживает канал ${targetCompany.channel} 24/7!\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🚀 VK Mini App: https://vk.com/app${VK_APP_ID}\n🌐 Веб-версия без VPN: ${RENDER_URL}`;

  const reply = {
    peer_id: peerId,
    random_id: Math.floor(Math.random() * 2147483647),
    message: text,
    keyboard: COMPANIES_VK_KEYBOARD,
  };

  if (token) {
    await callVk('messages.send', reply, token);
  }
  userMenuState.set(String(peerId), 'companies');
  return finish({ ok: true, type: 'company_details', company: targetCompany.id, reply });
}

/**
 * Handle incoming VK message and produce reply payload
 * Supports both VK API v5.199 formats:
 * - Update object: { type: 'message_new', object: { message: {...}, client_info: {...} } }
 * - Direct object: { message: {...}, client_info: {...} }
 * - Flat message: { peer_id: 123, text: '...', payload: '...' }
 */
export async function handleVkMessage(rawInput, token = VK_BOT_TOKEN) {
  if (!rawInput) return { ok: false, error: 'Empty message' };

  const message =
    rawInput.object?.message ||
    rawInput.message ||
    rawInput.object ||
    rawInput;

  const peerId =
    message.peer_id ||
    message.from_id ||
    message.user_id ||
    rawInput.peer_id ||
    rawInput.from_id ||
    rawInput.user_id ||
    rawInput.object?.peer_id ||
    rawInput.object?.user_id;

  if (!peerId) return { ok: false, error: 'Missing peer_id' };

  // Auto-register user as active subscriber on ANY incoming message or event if not yet active
  const cleanPeerIdStr = String(peerId).replace(/^vk_/, '');
  const existingSub = vkSubscribers.get(cleanPeerIdStr);
  if (!existingSub || !existingSub.is_active) {
    const firstName =
      message.from?.first_name ||
      rawInput.from?.first_name ||
      rawInput.first_name ||
      'Пользователь VK';
    const username =
      message.from?.username ||
      rawInput.from?.username ||
      rawInput.username ||
      '';
    registerVkSubscriber(peerId, { first_name: firstName, username }).catch((e) =>
      console.warn('[VK Bot Auto-Sub]', e.message)
    );
  }

  // Acknowledge inline callback button event to dismiss loading spinner in VK app
  const eventId = message.event_id || rawInput.event_id || rawInput.object?.event_id;
  if (eventId) {
    const userId = message.user_id || rawInput.user_id || rawInput.object?.user_id || peerId;
    callVk('messages.sendMessageEventAnswer', { event_id: eventId, user_id: userId, peer_id: peerId }, token).catch(() => {});
  }

  const finish = (obj) => {
    if (eventId && obj && typeof obj === 'object') {
      obj.event_id = eventId;
      obj.eventAcknowledged = true;
    }
    return obj;
  };

  // Strip VK group/user mention prefix: [club12345|@name] or [public12345|Name] or @name
  const textRaw = (message.text || rawInput.text || '')
    .replace(/^\[(?:club|public|id)\d+\|[^\]]+\]\s*/i, '')
    .replace(/^@[\w.\-_]+\s*/i, '')
    .trim();
  const textLower = textRaw.toLowerCase();
  const textClean = textLower.replace(/[!.,?]+$/g, '').trim();

  // Extract and parse payload from both message and event object formats
  const rawPayload =
    message.payload ??
    rawInput.payload ??
    rawInput.object?.payload ??
    rawInput.object?.message?.payload;

  let payload = null;
  if (rawPayload) {
    if (typeof rawPayload === 'object') {
      payload = rawPayload;
    } else if (typeof rawPayload === 'string') {
      try {
        payload = JSON.parse(rawPayload);
        // Handle double-encoded JSON strings from VK
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {}
        }
      } catch {
        payload = null;
      }
    }
  }

  let cmd = payload?.cmd || payload?.command || payload?.button || '';

  // Support contextual numeric command shortcuts based on active menu screen
  const numMatch = textClean.match(/^(?:\[(\d+)\]|(\d+)\.?)$/);
  const num = numMatch ? parseInt(numMatch[1] || numMatch[2], 10) : null;

  // Support returning to main menu on 0 or 'назад' / 'главная'
  if (!cmd && (num === 0 || textClean === '0' || textClean === 'назад' || textClean === 'главная' || textClean === 'в меню' || textClean === 'меню')) {
    cmd = 'start';
  }

  if (!cmd && num !== null && num >= 1 && num <= 10) {
    const currentMenu = userMenuState.get(String(peerId)) || 'main';

    if (currentMenu === 'vacancies') {
      const dirs = ['frontend', 'backend', 'mobile', 'data_science', 'qa', 'devops'];
      if (num >= 1 && num <= 6) {
        payload = { cmd: 'direction', id: dirs[num - 1] };
        cmd = 'direction';
      } else if (num === 7) {
        cmd = 'companies';
      } else if (num === 8) {
        cmd = 'site';
      }
    } else if (currentMenu === 'companies') {
      const compIds = ['t1', 'kontur', 'tbank', 'directum', 'yandex', 'ozon', 'sber', 'avito', 'vk'];
      if (num >= 1 && num <= 9) {
        payload = { cmd: 'company', id: compIds[num - 1] };
        cmd = 'company';
      } else if (num === 10) {
        cmd = 'vacancies';
      }
    } else {
      // Main menu shortcuts:
      // [1] Стажировки, [2] Компании, [3] Роадмапы, [4] Вопросы, [5] Подписка, [6] Открыть сайт, [7] Статус, [8] Помощь, [9] Мой ID, [10] Синхронизация
      if (num === 1) cmd = 'vacancies';
      else if (num === 2) cmd = 'companies';
      else if (num === 3) cmd = 'roadmaps';
      else if (num === 4) cmd = 'questions';
      else if (num === 5) cmd = 'subscribe';
      else if (num === 6) cmd = 'site';
      else if (num === 7) cmd = 'status';
      else if (num === 8) cmd = 'help';
      else if (num === 9) cmd = 'id';
      else if (num === 10) cmd = 'scan';
    }
  }

  const strippedText = textLower.replace(/^[\p{Extended_Pictographic}\p{Emoji}\p{Symbol}\s_.-]+/u, '').trim();

  const isGreeting =
    strippedText === 'здравствуйте' ||
    strippedText === 'здравствуй' ||
    strippedText === 'добрый день' ||
    strippedText === 'добрый вечер' ||
    strippedText === 'доброе утро' ||
    strippedText === 'приветствую' ||
    strippedText === 'салют' ||
    strippedText === 'хай' ||
    strippedText === 'ку' ||
    strippedText.startsWith('здравствуй') ||
    strippedText.startsWith('добрый день') ||
    strippedText.startsWith('добрый вечер') ||
    strippedText.startsWith('доброе утро') ||
    strippedText.startsWith('приветствую');

  const hasAttachmentsNoText =
    (!textClean || textClean.length === 0) &&
    (Boolean(message.attachments?.length) || Boolean(rawInput.attachments?.length) || !cmd);

  // 1. «Начать» / /start / Привет / Меню / Старт / Здравствуйте / Стикеры
  if (
    cmd === 'start' ||
    textClean === 'начать' ||
    textClean === 'старт' ||
    textClean.startsWith('/start') ||
    textClean === 'start' ||
    textClean === 'привет' ||
    textClean === 'меню' ||
    textClean === 'hello' ||
    isGreeting ||
    hasAttachmentsNoText
  ) {
    // Auto-register user as subscriber on /start with extracted name
    const firstName = message.from?.first_name || rawInput.from?.first_name || rawInput.first_name || 'Студент';
    const username = message.from?.username || rawInput.from?.username || rawInput.username || '';
    await registerVkSubscriber(peerId, { first_name: firstName, username });

    const welcomeText =
      '🚀 IT-Старт | Карьерный навигатор в IT\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `Привет, ${firstName}! Здесь собраны 100% реальные оплачиваемые IT-стажировки и Junior-вакансии:\n\n` +
      '🏢 Топ IT-компании России:\n' +
      '• Холдинг Т1 (Открытая школа)\n' +
      '• СКБ Контур (Контур.Старт 2026)\n' +
      '• Т-Банк (Финтех стажировки)\n' +
      '• Directum (Ижевск / RX)\n' +
      '• Яндекс, Ozon Tech, Сбер, Авито, VK\n\n' +
      '🎯 В платформе доступно:\n' +
      '• Интерактивные роадмапы по 6 направлениям\n' +
      '• База из 55+ вопросов к собеседованиям\n' +
      '• Автоматический мониторинг каналов и сайтов\n' +
      '• Пуш-уведомления о новых вакансиях\n\n' +
      '👇 Запустите VK Mini App кнопкой ниже или выберите команду:\n';

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: welcomeText,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'start', reply });
  }

  // 2. «Стажировки» / /vacancies / Вакансии
  if (
    cmd === 'vacancies' ||
    textClean.startsWith('/vacancies') ||
    textClean === 'стажировки' ||
    textClean.startsWith('стажировки ') ||
    textClean === 'вакансии' ||
    textClean.startsWith('вакансии ') ||
    textClean === 'каталог' ||
    textClean.startsWith('каталог ')
  ) {
    // Check if arguments supplied (e.g. /vacancies t1 or /vacancies frontend)
    const parts = textRaw.split(/\s+/);
    const arg = parts.length > 1 ? parts.slice(1).join(' ').trim().toLowerCase() : '';

    const allVacancies = await getActiveInternships();

    let filtered = allVacancies;
    let listTitle = 'Все свежие стажировки';

    if (arg) {
      const company = findCompanyByQuery(arg);
      const dirMatch = resolveDirectionByQuery(arg);
      if (company) {
        filtered = allVacancies.filter(
          (v) =>
            (v.companyId || '').toLowerCase() === company.id ||
            (v.company || '').toLowerCase().includes(company.shortName.toLowerCase()) ||
            findCompanyByQuery(v.company)?.id === company.id
        );
        listTitle = `Стажировки в ${company.name}`;
      } else if (dirMatch) {
        filtered = allVacancies.filter(
          (v) => (v.directionId || '').toLowerCase() === dirMatch
        );
        listTitle = `Стажировки: ${DIRECTION_TITLES[dirMatch] || dirMatch}`;
      } else {
        filtered = allVacancies.filter(
          (v) =>
            (v.directionId || '').toLowerCase() === arg ||
            (v.subTrackId || '').toLowerCase() === arg ||
            (v.title || '').toLowerCase().includes(arg) ||
            (v.tags || []).some((t) => t.toLowerCase().includes(arg))
        );
        listTitle = `Стажировки по запросу «${arg}»`;
      }
    }

    const replyText = formatVkVacanciesList(filtered, listTitle, 5);

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: replyText,
      keyboard: VACANCIES_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'vacancies');
    return finish({ ok: true, type: 'vacancies', reply, count: filtered.length });
  }

  let matchedDirId = null;
  if (cmd === 'direction' && payload?.id) {
    matchedDirId = payload.id;
  } else {
    matchedDirId = resolveDirectionByQuery(textClean) || resolveDirectionByQuery(textLower);
  }

  // 3. Direction selection (Frontend, Backend, Mobile, Data Science, QA, DevOps)
  if (matchedDirId) {
    const dirId = matchedDirId;
    const allVacancies = await getActiveInternships();
    const filtered = allVacancies.filter((v) => (v.directionId || '').toLowerCase() === dirId.toLowerCase());

    const replyText = formatVkVacanciesList(
      filtered,
      DIRECTION_TITLES[dirId] || `Направление ${dirId}`,
      5
    );

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: replyText,
      keyboard: VACANCIES_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'vacancies');
    return finish({ ok: true, type: 'direction', directionId: dirId, reply });
  }

  // 4. «Компании» / /companies
  if (cmd === 'companies' || textClean === '/companies' || textClean === 'компании') {
    let text = `🏢 Целевые IT-компании и программы стажировок:\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    COMPANIES_DATA.forEach((c, idx) => {
      text += `[${idx + 1}] 🏢 ${c.name} (${c.shortName})\n`;
      text += `    📌 ${c.description}\n`;
      text += `    🛠 Стек: ${c.stack}\n`;
      text += `    📢 Канал: ${c.channel}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 Выберите компанию на клавиатуре или напишите её название (например, «директум» или «т1»), чтобы посмотреть открытые стажировки!`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: COMPANIES_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'companies');
    return finish({ ok: true, type: 'companies', reply });
  }

  // 5. Specific company button or /company_<id> command
  if ((cmd === 'company' && payload?.id) || textClean.startsWith('/company_')) {
    const compId = (cmd === 'company' && payload?.id) ? payload.id : textClean.replace('/company_', '');
    const targetCompany = findCompanyByQuery(compId);
    if (targetCompany) {
      return sendVkCompanyDetails(peerId, targetCompany, token, finish);
    }
  }

  // 6. «Роадмапы» / /roadmaps
  if (cmd === 'roadmaps' || textClean === '/roadmaps' || textClean === 'роадмапы') {
    const text =
      `🗺 Интерактивные роадмапы IT-Старт\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Структурированные карты развития и подготовки к стажировкам по 6 направлениям:\n\n` +
      `1. 💻 Frontend: Core (JS Event Loop, CRP, TS) + React, Angular, Vue\n` +
      `2. ⚙️ Backend: Core (REST, ACID, PostgreSQL, Docker) + Python, Go, Java, Node.js\n` +
      `3. 📱 Mobile: Core (MVVM, Architecture) + Android, iOS, Flutter\n` +
      `4. 📊 Data Science: Core (Math, SQL) + ML Engineer, Data Analyst\n` +
      `5. 🧪 QA: Core (Тест-дизайн, API) + Manual & Auto QA\n` +
      `6. ☁️ DevOps: Core (Linux, CI/CD) + Docker, Kubernetes, Cloud\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚀 Открыть интерактивное древо роадмапов с сохранением личного прогресса:\n` +
      `https://vk.com/app${VK_APP_ID}\n` +
      `🌐 Без VPN в браузере: ${RENDER_URL}`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [{ label: '🚀 Открыть роадмапы (Mini App)', app_id: VK_APP_ID }],
        [{ label: '💼 Посмотреть стажировки', payload: { cmd: 'vacancies' }, color: 'primary' }],
        [{ label: '🌐 Сайт без VPN', link: RENDER_URL }],
      ],
    });

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'roadmaps', reply });
  }

  // 7. «Вопросы» / /questions
  if (cmd === 'questions' || textClean === '/questions' || textClean === 'вопросы' || textClean === 'собеседование') {
    const text =
      `❓ Тренажёр вопросов к собеседованию IT-Старт\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Библиотека из 55+ детально разобранных вопросов от ведущих IT-компаний:\n\n` +
      `• ⚡ JavaScript Event Loop & Microtasks\n` +
      `• ⚛️ React Fiber & Virtual DOM\n` +
      `• 🐘 Транзакции, ACID & уровни изоляции PostgreSQL\n` +
      `• 🐳 Архитектура Docker, cgroups & namespaces\n` +
      `• 🏛 Clean Architecture & SOLID принципы\n\n` +
      `🎯 Доступен режим флеш-карточек и симуляция собеседования со скрытием ответа!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚀 Запустить тренажёр: https://vk.com/app${VK_APP_ID}\n` +
      `🌐 Без VPN в браузере: ${RENDER_URL}`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [{ label: '🚀 Запустить тренажёр (Mini App)', app_id: VK_APP_ID }],
        [{ label: '💼 Каталог вакансий', payload: { cmd: 'vacancies' }, color: 'primary' }],
        [{ label: '🌐 Сайт без VPN', link: RENDER_URL }],
      ],
    });

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'questions', reply });
  }

  // 8. «Подписка» / /subscribe
  if (cmd === 'subscribe' || textClean === '/subscribe' || textClean === 'подписка' || textClean === 'подписаться') {
    await registerVkSubscriber(peerId, { first_name: 'Пользователь VK' });

    const text =
      `✅ Вы успешно подписались на уведомления ВКонтакте!\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Бот IT-Старт будет присылать вам мгновенные уведомления о новых оплачиваемых стажировках.\n\n` +
      `📡 Источники мониторинга 24/7:\n` +
      `• Холдинг Т1, СКБ Контур, Т-Банк, Directum\n` +
      `• Яндекс, Ozon Tech, Сбер, Авито, VK\n\n` +
      `⚙️ Настроить фильтр по стеку можно в приложении: /site\n` +
      `❌ Для отключения рассылки отправьте /unsubscribe.`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'subscribed', reply });
  }

  // 9. «Отписаться» / /unsubscribe
  if (cmd === 'unsubscribe' || textClean === '/unsubscribe' || textClean === 'отписаться') {
    await unregisterVkSubscriber(peerId);

    const text =
      `❌ Вы отписались от уведомлений в VK.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Чтобы возобновить рассылку вакансий, отправьте команду /subscribe.`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'unsubscribed', reply });
  }

  // 10. «Мой ID» / /id / /myid
  if (
    cmd === 'id' ||
    textClean === '/id' ||
    textClean === '/myid' ||
    textClean === 'id' ||
    textClean === 'мой id' ||
    textClean === 'peer_id' ||
    textClean === 'айди'
  ) {
    await getVkSubscribers();
    const cleanId = String(peerId).replace(/^vk_/, '');
    const isSubscribed = vkSubscribers.has(cleanId) && vkSubscribers.get(cleanId)?.is_active;
    const text =
      `🆔 Ваш идентификатор ВКонтакте (Peer ID): ${cleanId}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Этот ID используется ботом IT-Старт для отправки персональных пуш-уведомлений о новых стажировках по вашему стеку.\n\n` +
      `🔔 Статус подписки: ${isSubscribed ? '✅ Активна (уведомления включены)' : '❌ Не активна (отправьте /subscribe для включения)'}\n` +
      `🚀 VK Mini App: https://vk.com/app${VK_APP_ID}\n` +
      `🌐 Веб-версия без VPN: ${RENDER_URL}`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'id', peerId, reply });
  }

  // 11. «Сканировать» / /scan / /sync / /parse
  if (
    cmd === 'scan' ||
    textClean === '/scan' ||
    textClean === '/sync' ||
    textClean === '/parse' ||
    textClean === 'сканировать' ||
    textClean === 'скан' ||
    textClean === 'парсинг' ||
    textClean === 'синхронизация' ||
    textClean === 'обновить'
  ) {
    if (token) {
      await callVk(
        'messages.send',
        {
          peer_id: peerId,
          random_id: Math.floor(Math.random() * 2147483647),
          message: `⚡ Запуск полного сканирования ${ALL_TARGET_TG_CHANNELS.length} Telegram-каналов и ${CAREER_WEBSITES_DATA.length} карьерных сайтов...`,
        },
        token
      );
    }

    const res = await scanChannelsAndSyncSupabase(true);

    const reportText =
      `✅ Сканирование источников успешно завершено!\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• Проверено Telegram-каналов: ${res.channelsChecked}\n` +
      `• Проверено карьерных сайтов/API: ${res.websitesChecked}\n` +
      `• Спарсено новых вакансий: ${res.parsedCount}\n` +
      `• Всего активных стажировок в базе: ${res.totalActive}\n` +
      `• Синхронизировано с Supabase: ${res.savedCount}\n` +
      `• Отправлено пуш-уведомлений: ${res.sentPushes}\n\n` +
      `Все свежие стажировки доступны по команде «Стажировки» и в VK Mini App!`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [
          { label: '💼 Каталог вакансий', payload: { cmd: 'vacancies' }, color: 'primary' },
          { label: '📊 Статус системы', payload: { cmd: 'status' }, color: 'secondary' },
        ],
        [
          { label: '🚀 Запустить VK Mini App', app_id: VK_APP_ID },
          { label: '🌐 Сайт без VPN', link: RENDER_URL },
        ],
      ],
    });

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: reportText,
      keyboard,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'scan', result: res, reply });
  }

  // 12. «Статус» / /status / статус / состояние
  if (
    cmd === 'status' ||
    textClean === '/status' ||
    textClean === 'статус' ||
    textClean === 'состояние' ||
    textClean === 'сервер'
  ) {
    await getVkSubscribers();
    const activeSubCount = Array.from(vkSubscribers.values()).filter((s) => s.is_active).length;
    const text =
      `⚡ Статус сервиса IT-Старт & VK Bot\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 VK Bot: Онлайн (Bots Long Poll API)\n` +
      `🌐 Telegram Bot: @IT_start_izh_bot (Long Polling)\n` +
      `📡 Источников в мониторинге: ${ALL_TARGET_TG_CHANNELS.length + CAREER_WEBSITES_DATA.length} ` +
      `(${ALL_TARGET_TG_CHANNELS.length} каналов + ${CAREER_WEBSITES_DATA.length} сайтов)\n` +
      `🏢 Отслеживаемых компаний: ${COMPANIES_DATA.length}\n` +
      `👥 Активных подписчиков в VK: ${activeSubCount}\n` +
      `🕒 Последнее сканирование: ${LAST_SCAN_STATUS.lastScanAt ? new Date(LAST_SCAN_STATUS.lastScanAt).toLocaleTimeString('ru-RU') : 'недавно'}\n` +
      `💾 База данных: Supabase PostgreSQL (public.internships, public.tg_subscriptions)\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚀 VK Mini App: https://vk.com/app${VK_APP_ID}\n` +
      `🌐 Веб-версия без VPN: ${RENDER_URL}`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'status', reply });
  }

  // 13. «Сайт» / «Открыть сайт» / «WebApp» / /site
  if (
    cmd === 'site' ||
    textClean === 'сайт' ||
    textClean === 'веб' ||
    textClean === 'webapp' ||
    textClean === 'приложение' ||
    textClean === '/site' ||
    textClean === '/web' ||
    textClean === '/app' ||
    textClean.includes('открыть сайт') ||
    textClean.includes('открыть it-старт')
  ) {
    const text =
      `🚀 Платформа IT-Старт | Веб и Mini App\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Сервис доступен на любых устройствах без VPN:\n\n` +
      `📱 VK Mini App: запускается прямо в клиенте ВКонтакте с авто-подстановкой профиля\n` +
      `🌐 Веб-сайт без VPN: ${RENDER_URL}\n` +
      `🌐 Зеркало GitHub Pages: ${GITHUB_PAGES_URL}\n` +
      `✈️ Telegram-бот: https://t.me/IT_start_izh_bot\n\n` +
      `В интерактивном приложении вас ждут:\n` +
      `• Интерактивные роадмапы со шкалой готовности в %\n` +
      `• Тренажёр 55+ вопросов к собеседованию с режимом скрытия ответов\n` +
      `• Полный каталог стажировок с детальными фильтрами по технологиям!`;

    const appRow = [];
    if (VK_APP_ID) {
      appRow.push({
        label: '📱 Запустить VK Mini App',
        app_id: Number(VK_APP_ID),
      });
    }
    appRow.push({
      label: '🌐 Сайт без VPN',
      link: RENDER_URL,
    });

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        appRow,
        [
          { label: '💼 Каталог вакансий', payload: { cmd: 'vacancies' }, color: 'primary' },
          { label: '🏢 Компании', payload: { cmd: 'companies' }, color: 'secondary' },
        ],
      ],
    });

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'site', reply });
  }

  // 14. «ВКонтакте» / /vk
  if (
    cmd === 'vk' ||
    textClean === '/vk'
  ) {
    const text =
      `📱 IT-Старт во ВКонтакте\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Вы уже находитесь в официальном боте IT-Старт ВКонтакте!\n\n` +
      `• 📱 VK Mini App: https://vk.com/app${VK_APP_ID}\n` +
      `• 👥 Официальное сообщество: ${VK_COMMUNITY_URL}\n` +
      `• 🌐 Веб-сайт без VPN: ${RENDER_URL}\n\n` +
      `💡 Если вы ищете вакансии компании VK, отправьте: /company_vk`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [{ label: '🚀 Запустить VK Mini App', app_id: VK_APP_ID }],
        [{ label: '🏢 Вакансии VK', payload: { cmd: 'company', id: 'vk' }, color: 'primary' }],
        [{ label: '🌐 Сайт без VPN', link: RENDER_URL }],
      ],
    });

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'vk', reply });
  }

  // 15. «Телеграм» / /tg / /telegram
  if (
    cmd === 'tg' ||
    textClean === '/tg' ||
    textClean === '/telegram' ||
    textClean === 'тг' ||
    textClean === 'телеграм' ||
    textClean === 'telegram'
  ) {
    const text =
      `✈️ IT-Старт в Telegram\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• 🤖 Telegram-бот: @IT_start_izh_bot\n` +
      `• 📱 Telegram WebApp: запускается прямо в мессенджере Telegram\n` +
      `• 🔔 Персональные пуш-уведомления о стажировках\n\n` +
      `🔗 Диалог с ботом TG: https://t.me/IT_start_izh_bot\n` +
      `🌐 Веб-версия без VPN: ${RENDER_URL}\n` +
      `🚀 VK Mini App: https://vk.com/app${VK_APP_ID}`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [{ label: '💬 Открыть бота в Telegram', link: 'https://t.me/IT_start_izh_bot' }],
        [{ label: '🚀 Запустить VK Mini App', app_id: VK_APP_ID }],
        [{ label: '🌐 Сайт без VPN', link: RENDER_URL }],
      ],
    });

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'tg', reply });
  }

  // 16. «Помощь» / /help
  if (cmd === 'help' || textClean === '/help' || textClean === 'помощь' || textClean === 'справка' || textClean === 'команды') {
    const text =
      `ℹ️ Команды бота IT-Старт ВКонтакте\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• Начать / /start — Главное меню и запуск VK Mini App\n` +
      `• Стажировки / /vacancies — Каталог стажировок с фильтром по направлениям («/vacancies frontend»)\n` +
      `• Компании / /companies — Список целевых IT-работодателей (Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK)\n` +
      `• Роадмапы / /roadmaps — Карты развития по 6 направлениям\n` +
      `• Вопросы / /questions — База 55+ вопросов к собеседованиям\n` +
      `• Подписка / /subscribe — Подписаться на пуш-уведомления о стажировках\n` +
      `• Отписаться / /unsubscribe — Отключить уведомления\n` +
      `• ID / /id (или /myid) — Узнать свой VK Peer ID\n` +
      `• Статус / /status — Состояние парсера, источников и базы данных\n` +
      `• Сканировать / /scan (или /sync) — Принудительное сканирование каналов и сайтов\n` +
      `• Сайт / /site — Ссылка на веб-платформу IT-Старт без VPN\n` +
      `• Telegram / /tg (или /telegram) — Открыть бота платформы в Telegram\n` +
      `• VK / /vk — Официальный бот и сообщество ВКонтакте\n` +
      `• Помощь / /help — Полный список команд\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 Быстрый переход к работодателям:\n` +
      `/company_t1, /company_kontur, /company_tbank, /company_directum, /company_yandex, /company_ozon, /company_sber, /company_avito, /company_vk\n\n` +
      `💻 Быстрый переход по направлениям:\n` +
      `/frontend, /backend, /mobile, /data_science, /qa, /devops\n\n` +
      `💡 Вы также можете отправить название компании (например: «директум», «контур», «т1», «яндекс») или стека («фронтенд», «бэкенд»), и бот покажет открытые вакансии!`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    userMenuState.set(String(peerId), 'main');
    return finish({ ok: true, type: 'help', reply });
  }



  // 17. Direct company name lookup («директум», «контур», «т1», «яндекс», etc.)
  const matchedCompany = findCompanyByQuery(textClean) || findCompanyByQuery(textLower);
  if (matchedCompany) {
    return sendVkCompanyDetails(peerId, matchedCompany, token, finish);
  }

  // Default Fallback
  const defaultText =
    `Я пока не знаю такую команду: «${textRaw.slice(0, 30)}» 🤔\n\n` +
    `Отправьте «Стажировки» для списка вакансий, «Компании» для обзора работодателей или «Начать» для перехода в главное меню.`;

  const reply = {
    peer_id: peerId,
    random_id: Math.floor(Math.random() * 2147483647),
    message: defaultText,
    keyboard: MAIN_VK_KEYBOARD,
  };

  if (token) {
    await callVk('messages.send', reply, token);
  }
  userMenuState.set(String(peerId), 'main');
  return finish({ ok: true, type: 'unknown', reply });
}

/**
 * Return current runtime status of VK Bot
 */
export function getVkBotStatus() {
  const activeSubs = Array.from(vkSubscribers.values()).filter((s) => s.is_active).length;
  const tokenToUse =
    VK_BOT_TOKEN ||
    process.env.VK_BOT_TOKEN ||
    process.env.VK_GROUP_TOKEN ||
    '';

  return {
    bot: 'IT-Старт VK Бот',
    apiBase: VK_API_BASE,
    version: VK_API_VERSION,
    status: isPollingActive ? 'active' : tokenToUse ? 'configured' : 'fallback',
    mode: tokenToUse ? 'live' : 'fallback',
    tokenConfigured: Boolean(tokenToUse),
    uptime: process.uptime(),
    subscribersCount: activeSubs,
    commandsCount: 12,
    channelsCount: ALL_TARGET_TG_CHANNELS.length,
    websitesCount: CAREER_WEBSITES_DATA.length,
    companiesCount: COMPANIES_DATA.length,
    lastScanAt: LAST_SCAN_STATUS.lastScanAt,
    sentPushesVk: LAST_SCAN_STATUS.sentPushesVk || 0,
    renderUrl: RENDER_URL,
    groupId: VK_GROUP_ID,
    communityUrl: VK_COMMUNITY_URL,
    lastActive: new Date().toISOString(),
  };
}

let isPollingActive = false;
let pollingAbortController = null;

/**
 * Start the VK Bot (Long Poll or Fallback mode)
 */
export async function startVkBot(token = VK_BOT_TOKEN, options = {}) {
  const tokenToUse = token !== undefined ? token : VK_BOT_TOKEN;

  if (!tokenToUse) {
    console.log('='.repeat(70));
    console.log('⚡ IT-Старт VKontakte Bot Runner');
    console.log('='.repeat(70));
    console.log('⚠️  Внимание: VK_BOT_TOKEN не указан!');
    console.log('Бот запущен в безопасном демонстрационном режиме (Fallback / Mock Mode).');
    console.log('Команды и обработка сообщений доступны через функции тестирования.');
    console.log('Чтобы подключить бота к реальной группе ВКонтакте:');
    console.log('  1. Зайдите в Управление сообществом VK -> Работа с API.');
    console.log('  2. Нажмите «Создать ключ доступа» с правами «Сообщения сообщества».');
    console.log('  3. Запустите: VK_BOT_TOKEN="vk1.a..." npm run bot:vk');
    console.log('='.repeat(70));
    isPollingActive = false;
    return {
      running: true,
      mode: 'fallback',
      message: 'VK Bot running in fallback mock mode without network token',
    };
  }

  isPollingActive = true;
  pollingAbortController = new AbortController();

  console.log(`🚀 Запуск VK-бота IT-Старт в режиме Bots Long Poll...`);

  // Detect Group ID
  let rawGroupId = options.groupId || VK_GROUP_ID;
  let groupId = rawGroupId ? String(rawGroupId).replace(/[^0-9]/g, '') : '';
  if (!groupId) {
    try {
      const gRes = await callVk('groups.getById', rawGroupId ? { group_id: rawGroupId } : {}, tokenToUse);
      if (gRes.ok && gRes.result) {
        const groups = gRes.result.groups || gRes.result;
        if (Array.isArray(groups) && groups.length > 0) {
          groupId = String(groups[0].id);
          console.log(`[VK Bot] Сообщество определено: ID ${groupId} («${groups[0].name}»)`);
        }
      }
    } catch (e) {
      console.warn('[VK Bot] Не удалось автоматически получить group_id:', e.message);
    }
  }

  if (!groupId) {
    console.warn('[VK Bot] Предупреждение: group_id не определен. Укажите VK_GROUP_ID в env.');
    return { running: true, mode: 'configured_waiting_group_id' };
  }

  // Background long polling loop
  (async () => {
    let server = '';
    let key = '';
    let ts = '';

    const getLongPollServer = async () => {
      // Ensure Bots Long Poll settings are activated with all messaging events
      await callVk(
        'groups.setLongPollSettings',
        {
          group_id: groupId,
          enabled: 1,
          message_new: 1,
          message_event: 1,
          message_reply: 1,
          message_allow: 1,
          message_deny: 1,
          message_edit: 1,
          api_version: '5.199',
        },
        tokenToUse
      ).catch(() => {});

      let res = await callVk('groups.getLongPollServer', { group_id: groupId }, tokenToUse);
      if (res.ok && res.result) {
        server = res.result.server;
        key = res.result.key;
        ts = res.result.ts;
        console.log(`[VK Bot] Сервер Bots Long Poll подключен (${server}), ожидание сообщений...`);
        return true;
      }
      if (!res.ok) {
        const errMsg = String(res.error?.error_msg || res.error || '');
        console.warn('[VK Bot] Не удалось получить сервер Long Poll:', errMsg || JSON.stringify(res.error));
      }
      return false;
    };

    let serverReady = await getLongPollServer();

    // Automatically discover any existing dialogues with users from VK API
    await syncSubscribersFromVkConversations(tokenToUse).catch((err) => {
      console.warn('[VK Bot] Ошибка синхронизации диалогов при старте:', err.message);
    });

    while (isPollingActive) {
      if (!serverReady) {
        await new Promise((r) => setTimeout(r, 5000));
        serverReady = await getLongPollServer();
        continue;
      }

      try {
        const host = server.startsWith('http://') || server.startsWith('https://') ? server : `https://${server}`;
        const pollUrl = `${host}?act=a_check&key=${key}&ts=${ts}&wait=25`;
        const res = await fetch(pollUrl, { signal: pollingAbortController?.signal });
        const data = await res.json();

        if (data.failed === 1) {
          ts = data.ts;
        } else if (data.failed === 2 || data.failed === 3 || data.failed === 4) {
          serverReady = await getLongPollServer();
        } else if (data.ts) {
          ts = data.ts;
          if (Array.isArray(data.updates)) {
            for (const upd of data.updates) {
              if (upd.type === 'message_new' || upd.type === 'message_event') {
                const msg = upd.object?.message || upd.object || upd;
                if (upd.type === 'message_event' && (upd.object?.event_id || msg.event_id)) {
                  const eventId = upd.object?.event_id || msg.event_id;
                  const userId = upd.object?.user_id || msg.user_id;
                  const peerId = upd.object?.peer_id || msg.peer_id || userId;
                  callVk('messages.sendMessageEventAnswer', { event_id: eventId, user_id: userId, peer_id: peerId }, tokenToUse).catch(() => {});
                }
                if (msg) {
                  await handleVkMessage(msg, tokenToUse);
                }
              } else if (upd.type === 'message_allow') {
                const userId = upd.object?.user_id;
                if (userId) {
                  console.log(`[VK Bot] 🔔 Пользователь ${userId} разрешил сообщения сообщества`);
                  await registerVkSubscriber(userId, { first_name: 'Пользователь VK' });
                  await sendVkNotification(
                    userId,
                    `🎉 Спасибо за подключение уведомлений IT-Старт!\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `Теперь вы первыми узнаете о новых оплачиваемых стажировках в Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито и VK.\n\n` +
                    `Настройте интересующие направления кнопкой ниже или отправьте «Стажировки» для просмотра каталога!`,
                    {},
                    tokenToUse
                  );
                }
              } else if (upd.type === 'message_deny') {
                const userId = upd.object?.user_id;
                if (userId) {
                  console.log(`[VK Bot] 🔕 Пользователь ${userId} запретил сообщения сообщества`);
                  await unregisterVkSubscriber(userId);
                }
              }
            }
          }
        }
      } catch (err) {
        if (!isPollingActive) break;
        console.warn('[VK Long Poll] Ошибка сети (переподключение через 4с):', err.message);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })().catch((err) => console.error('[VK Bot Worker Error]', err));

  return { running: true, mode: 'live', groupId };
}

/**
 * Stop VK Bot polling loop
 */
export function stopVkBot() {
  isPollingActive = false;
  if (pollingAbortController) {
    try {
      pollingAbortController.abort();
    } catch {}
  }
}

// Auto-start and HTTP health check server when executed directly from CLI: node bot/vk_bot.mjs
if (process.env.NODE_ENV !== 'test') {
  const isDirect =
    process.argv[1] &&
    (process.argv[1].endsWith('vk_bot.mjs') || process.argv[1].endsWith('vk_bot.js'));

  if (isDirect) {
    startVkBot().catch((e) => console.error('[VK Bot Startup Fatal]', e));

    // HTTP Health Check server for Render.com Web Service
    const VK_PORT = process.env.PORT || 3001;
    const httpServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/health' || urlPath === '/status' || urlPath === '/vk/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(getVkBotStatus()));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('IT-Старт VK Bot работает 24/7! (Render Health Check OK)\n');
    });

    httpServer.listen(VK_PORT, () => {
      console.log(`🌐 HTTP Health Check сервер VK-бота запущен на порту ${VK_PORT}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[VK HTTP] Порт ${VK_PORT} уже используется, бот продолжает работу.`);
      } else {
        console.warn('[VK HTTP Server Warning]', err.message);
      }
    });

    process.on('SIGINT', () => {
      console.log('\nОстановка VK-бота...');
      stopVkBot();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      stopVkBot();
      process.exit(0);
    });
  }
}
