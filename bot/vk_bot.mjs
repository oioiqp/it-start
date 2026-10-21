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
import {
  COMPANIES_DATA,
  findCompanyByQuery,
  ALL_INTERNSHIPS,
  getActiveInternships,
  LAST_SCAN_STATUS,
  ALL_TARGET_TG_CHANNELS,
  CAREER_WEBSITES_DATA,
} from './bot.mjs';

export { ALL_INTERNSHIPS };

// Configuration
export const VK_BOT_TOKEN =
  process.env.VK_BOT_TOKEN ||
  process.env.VK_GROUP_TOKEN ||
  (process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : '');

export const VK_GROUP_ID = process.env.VK_GROUP_ID || '';
export const VK_API_VERSION = '5.199';
export const VK_API_BASE = 'https://api.vk.com/method';
export const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';
export const VK_COMMUNITY_URL = process.env.VK_COMMUNITY_URL || 'https://vk.com/it_start_platform';

export const VK_BOT_CONFIG = {
  version: VK_API_VERSION,
  apiBase: VK_API_BASE,
  defaultUrl: GITHUB_PAGES_URL,
  communityUrl: VK_COMMUNITY_URL,
  botName: 'IT-Старт VK Бот',
};

// In-memory subscribers store for VK push notifications
export const vkSubscribers = new Map();

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
        return {
          action: {
            type: 'open_app',
            app_id: Number(btn.app_id),
            label: String(btn.label).slice(0, 40),
            hash: btn.hash || '',
          },
        };
      }

      // 3. Regular text button
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
export const MAIN_VK_KEYBOARD = createVkKeyboard({
  inline: false,
  oneTime: false,
  buttons: [
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
      { label: '🚀 Открыть IT-Старт', link: GITHUB_PAGES_URL },
    ],
  ],
});

export const VACANCIES_VK_KEYBOARD = createVkKeyboard({
  inline: true,
  buttons: [
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
      { label: '🏢 По компаниям', payload: { cmd: 'companies' }, color: 'secondary' },
      { label: '🚀 Открыть в WebApp', link: GITHUB_PAGES_URL },
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
      { label: 'Directum', payload: { cmd: 'company', id: 'directum' }, color: 'secondary' },
      { label: 'Яндекс', payload: { cmd: 'company', id: 'yandex' }, color: 'secondary' },
      { label: 'Ozon', payload: { cmd: 'company', id: 'ozon' }, color: 'secondary' },
    ],
    [
      { label: 'Сбер', payload: { cmd: 'company', id: 'sber' }, color: 'secondary' },
      { label: 'Авито', payload: { cmd: 'company', id: 'avito' }, color: 'secondary' },
      { label: 'VK', payload: { cmd: 'company', id: 'vk' }, color: 'secondary' },
    ],
    [
      { label: '💼 Все стажировки в IT-Старт', link: GITHUB_PAGES_URL },
    ],
  ],
});

/**
 * Format a single internship into a friendly VK message
 */
export function formatVkVacancyMessage(item) {
  if (!item) return '';
  const tagsStr = Array.isArray(item.tags) ? item.tags.slice(0, 4).join(' • ') : '';
  const desc = item.description ? `\n📝 ${item.description.slice(0, 160)}...` : '';
  const url = item.applyUrl || item.url || GITHUB_PAGES_URL;

  return (
    `🏢 ${item.company} — ${item.title}\n` +
    `💰 Зарплата: ${item.salary || 'По договоренности'}\n` +
    `📍 Формат: ${item.format || 'Удаленно'} | ${item.location || item.city || 'РФ'}\n` +
    `📢 Источник: ${item.sourceChannel || item.channel || 'IT-Старт'}\n` +
    (tagsStr ? `🏷 Стек: ${tagsStr}\n` : '') +
    desc +
    `\n🔗 Подробнее и отклик: ${url}`
  );
}

/**
 * Format a list of vacancies
 */
export function formatVkVacanciesList(items = [], title = 'Актуальные стажировки', limit = 4) {
  const slice = items.slice(0, limit);
  if (slice.length === 0) {
    return `🔍 По вашему запросу стажировок не найдено.\nПопробуйте выбрать другое направление или компанию!`;
  }

  let text = `🔥 ${title} (${slice.length} из ${items.length}):\n\n`;
  slice.forEach((item, idx) => {
    text += `[${idx + 1}] ${item.company} — ${item.title}\n`;
    text += `💰 ${item.salary || 'По договоренности'} | 📍 ${item.format || 'Удаленно'}\n`;
    text += `🔗 ${item.applyUrl || item.url || GITHUB_PAGES_URL}\n\n`;
  });

  text += `💡 Все вакансии с фильтрами и персональным планом подготовки доступны в веб-приложении IT-Старт:\n${GITHUB_PAGES_URL}`;
  return text;
}

/**
 * Send request to VK API
 */
export async function callVk(method, params = {}, token = VK_BOT_TOKEN) {
  if (!token) {
    // Graceful fallback/mock mode when no token is configured
    return {
      ok: true,
      result: {
        mock: true,
        method,
        params,
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const url = `${VK_API_BASE}/${method}`;
    const formParams = new URLSearchParams();
    formParams.append('v', VK_API_VERSION);
    formParams.append('access_token', token);

    for (const [k, v] of Object.entries(params)) {
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
 * Register a user as a VK push subscriber
 */
export async function registerVkSubscriber(peerId, meta = {}) {
  const id = String(peerId);
  const sub = {
    peer_id: id,
    first_name: meta.first_name || 'Пользователь VK',
    directions: meta.directions || ['frontend', 'backend', 'mobile', 'qa', 'devops', 'data_science'],
    subscribed_at: new Date().toISOString(),
    is_active: true,
  };
  vkSubscribers.set(id, sub);
  return sub;
}

/**
 * Unregister a VK push subscriber
 */
export async function unregisterVkSubscriber(peerId) {
  const id = String(peerId);
  return vkSubscribers.delete(id);
}

/**
 * Get all active VK subscribers
 */
export async function getVkSubscribers() {
  return Array.from(vkSubscribers.values()).filter((s) => s.is_active);
}

// Cache of already notified VK subscribers to prevent duplicates on recurring scans
export const notifiedVkKeys = new Set();

export function clearVkNotifiedCache() {
  notifiedVkKeys.clear();
}

/**
 * Notify all VK subscribers about newly parsed vacancies
 */
export async function notifyVkSubscribers(vacancies = [], token = VK_BOT_TOKEN) {
  if (!vacancies || vacancies.length === 0) return 0;
  const subscribers = await getVkSubscribers();
  if (subscribers.length === 0) return 0;

  let sentCount = 0;
  const sample = vacancies.slice(0, 3);

  for (const sub of subscribers) {
    const subDirs = Array.isArray(sub.directions) ? sub.directions : [];

    for (const vac of sample) {
      if (!vac) continue;

      // Filter by subscriber's selected directions if specified
      const vacDir = vac.directionId || vac.direction;
      if (subDirs.length > 0 && vacDir && !subDirs.includes(vacDir)) {
        continue;
      }

      // Avoid spamming subscriber with same vacancy
      const dedupeKey = `${sub.peer_id}_${vac.id || vac.title || vac.url}`;
      if (notifiedVkKeys.has(dedupeKey)) {
        continue;
      }
      notifiedVkKeys.add(dedupeKey);

      const msg =
        `🔥 Новая стажировка из мониторинга работодателей!\n\n` +
        `🏢 ${vac.company} — ${vac.title}\n` +
        `💰 Зарплата: ${vac.salary || 'По договоренности'} | 📍 Формат: ${vac.format || 'Удаленно'}\n` +
        `📢 Источник: ${vac.channel || vac.sourceChannel || 'Канал/Сайт работодателя'}\n\n` +
        `🎯 В IT-Старт уже подготовлен персональный план вопросов для этого направления!\n` +
        `🔗 Откликнуться: ${vac.url || vac.applyUrl || GITHUB_PAGES_URL}`;

      const keyboard = createVkKeyboard({
        inline: true,
        buttons: [
          [
            { label: '🚀 Открыть IT-Старт', link: GITHUB_PAGES_URL },
            { label: '🔗 Источник', link: vac.url || vac.applyUrl || GITHUB_PAGES_URL },
          ],
        ],
      });

      await callVk(
        'messages.send',
        {
          peer_id: sub.peer_id,
          random_id: Math.floor(Math.random() * 2147483647),
          message: msg,
          keyboard,
        },
        token
      );
      sentCount++;
    }
  }

  return sentCount;
}

/**
 * Handle incoming VK message and produce reply payload
 */
export async function handleVkMessage(message, token = VK_BOT_TOKEN) {
  if (!message) return { ok: false, error: 'Empty message' };
  const peerId = message.peer_id || message.from_id;
  if (!peerId) return { ok: false, error: 'Missing peer_id' };

  // Strip VK group/user mention prefix: [club12345|@name] or [public12345|Name] or @name
  const textRaw = (message.text || '')
    .replace(/^\[(?:club|public|id)\d+\|[^\]]+\]\s*/i, '')
    .replace(/^@[\w.\-_]+\s*/i, '')
    .trim();
  const textLower = textRaw.toLowerCase();
  const textClean = textLower.replace(/[!.,?]+$/g, '').trim();

  let payload = null;
  if (message.payload) {
    try {
      payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload;
    } catch {
      payload = null;
    }
  }

  const cmd = payload?.cmd || '';

  // 1. «Начать» / /start / Привет / Меню / Старт
  if (
    cmd === 'start' ||
    textClean === 'начать' ||
    textClean === 'старт' ||
    textClean.startsWith('/start') ||
    textClean === 'start' ||
    textClean === 'привет' ||
    textClean === 'меню' ||
    textClean === 'hello'
  ) {
    // Auto-register user as subscriber on /start
    await registerVkSubscriber(peerId, { first_name: 'Студент' });

    const welcomeText =
      `👋 Привет! Я официальный VK-бот платформы IT-Старт.\n\n` +
      `Здесь ты найдешь актуальные оплачиваемые стажировки и Junior-вакансии в ведущих IT-компаниях:\n` +
      `• Холдинг Т1 (Открытая школа Т1)\n` +
      `• СКБ Контур (Контур.Старт 2026)\n` +
      `• Т-Банк (Финтех стажировки)\n` +
      `• Directum (Ижевск / RX)\n` +
      `• Яндекс, Ozon, Сбер, Авито, VK\n\n` +
      `Интерактивные роадмапы, тренажёр из 55+ вопросов к собеседованиям и уведомления о новых откликах!\n\n` +
      `Выбери действие на клавиатуре ниже или отправь команду:`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: welcomeText,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'start', reply };
  }

  // 2. «Стажировки» / /vacancies / Вакансии
  if (
    cmd === 'vacancies' ||
    textClean.startsWith('/vacancies') ||
    textClean === 'стажировки' ||
    textClean === 'вакансии'
  ) {
    // Check if arguments supplied (e.g. /vacancies t1 or /vacancies frontend)
    const parts = textRaw.split(/\s+/);
    const arg = parts.length > 1 ? parts.slice(1).join(' ').trim().toLowerCase() : '';

    const allVacancies = await getActiveInternships();

    let filtered = allVacancies;
    let listTitle = 'Все свежие стажировки';

    if (arg) {
      const company = findCompanyByQuery(arg);
      if (company) {
        filtered = allVacancies.filter(
          (v) => (v.companyId || '').toLowerCase() === company.id || (v.company || '').toLowerCase().includes(company.shortName.toLowerCase())
        );
        listTitle = `Стажировки в ${company.name}`;
      } else {
        filtered = allVacancies.filter(
          (v) =>
            (v.directionId || '').toLowerCase() === arg ||
            (v.subTrackId || '').toLowerCase() === arg ||
            (v.title || '').toLowerCase().includes(arg)
        );
        listTitle = `Стажировки по запросу «${arg}»`;
      }
    }

    const replyText = formatVkVacanciesList(filtered, listTitle, 4);

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: replyText,
      keyboard: VACANCIES_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'vacancies', reply, count: filtered.length };
  }

  // Direction aliases dictionary for Russian & English commands
  const dirAliases = {
    frontend: ['frontend', 'фронтенд', 'фронт', '/frontend', 'react', 'веб'],
    backend: ['backend', 'бэкенд', 'бек', 'бэк', '/backend', 'python', 'java', 'go', 'golang'],
    mobile: ['mobile', 'мобилка', 'мобильная', 'android', 'ios', 'flutter', '/mobile'],
    data_science: ['data_science', 'datascience', 'data science', 'ds', 'ml', 'дата сайнс', 'машинное обучение', '/data_science'],
    qa: ['qa', 'тестирование', 'тестировщик', 'кьюа', 'тест', '/qa'],
    devops: ['devops', 'девопс', 'инфраструктура', 'sre', 'docker', 'кубер', '/devops'],
  };

  let matchedDirId = null;
  if (cmd === 'direction' && payload?.id) {
    matchedDirId = payload.id;
  } else {
    for (const [dirKey, aliases] of Object.entries(dirAliases)) {
      if (aliases.includes(textClean) || aliases.includes(textLower)) {
        matchedDirId = dirKey;
        break;
      }
    }
  }

  // 3. Direction selection (Frontend, Backend, Mobile, Data Science, QA, DevOps)
  if (matchedDirId) {
    const dirId = matchedDirId;
    const allVacancies = await getActiveInternships();
    const filtered = allVacancies.filter((v) => (v.directionId || '').toLowerCase() === dirId.toLowerCase());

    const dirTitles = {
      frontend: 'Frontend-разработка (React / Vue / Angular)',
      backend: 'Backend-разработка (Python / Go / Java / Node.js)',
      mobile: 'Mobile-разработка (Android / iOS / Flutter)',
      data_science: 'Data Science & ML / AI',
      qa: 'QA Тестирование (Auto & Manual)',
      devops: 'DevOps & Инфраструктура',
    };

    const replyText = formatVkVacanciesList(
      filtered,
      dirTitles[dirId] || `Направление ${dirId}`,
      4
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
    return { ok: true, type: 'direction', directionId: dirId, reply };
  }

  // 4. «Компании» / /companies
  if (cmd === 'companies' || textClean === '/companies' || textClean === 'компании') {
    let text = `🏢 Целевые IT-компании и программы стажировок:\n\n`;

    COMPANIES_DATA.forEach((c, idx) => {
      text += `${idx + 1}. ${c.name} (${c.shortName})\n`;
      text += `   📌 ${c.description}\n`;
      text += `   🏷 Стек: ${c.stack}\n`;
      text += `   📢 Канал: ${c.channel}\n\n`;
    });

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
    return { ok: true, type: 'companies', reply };
  }

  // 5. Specific company lookup (payload cmd: company or /company_<id> or company query)
  let targetCompany = null;
  if (cmd === 'company' && payload?.id) {
    targetCompany = findCompanyByQuery(payload.id);
  } else if (textClean.startsWith('/company_')) {
    const compId = textClean.replace('/company_', '');
    targetCompany = findCompanyByQuery(compId);
  } else {
    // Check if the whole message is a company alias
    const matched = findCompanyByQuery(textClean) || findCompanyByQuery(textLower);
    if (matched) {
      targetCompany = matched;
    }
  }

  if (targetCompany) {
    const allVacancies = await getActiveInternships();
    const companyVacancies = allVacancies.filter(
      (v) =>
        (v.companyId || '').toLowerCase() === targetCompany.id ||
        (v.company || '').toLowerCase().includes(targetCompany.shortName.toLowerCase())
    );

    let text = `🏢 ${targetCompany.name} (${targetCompany.shortName})\n\n`;
    text += `📝 ${targetCompany.description}\n`;
    text += `🛠 Основной стек: ${targetCompany.stack}\n`;
    text += `📢 Канал работодателя: ${targetCompany.channel}\n\n`;

    if (companyVacancies.length > 0) {
      text += `🔥 Открытые позиции (${companyVacancies.length}):\n`;
      companyVacancies.forEach((v, idx) => {
        text += `\n[${idx + 1}] ${v.title}\n`;
        text += `   💰 ${v.salary || 'По договоренности'} | 📍 ${v.format || 'Удаленно'}\n`;
        text += `   🔗 ${v.applyUrl || v.url || GITHUB_PAGES_URL}\n`;
      });
    } else {
      text += `🔍 Сейчас прямых позиций в базе нет, но парсер отслеживает канал ${targetCompany.channel} 24/7!\n`;
    }

    text += `\n🚀 Посмотреть все стажировки: ${GITHUB_PAGES_URL}`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: COMPANIES_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'company_details', company: targetCompany.id, reply };
  }

  // 6. «Роадмапы» / /roadmaps
  if (cmd === 'roadmaps' || textClean === '/roadmaps' || textClean === 'роадмапы') {
    const text =
      `🗺 Интерактивные роадмапы подготовки к стажировкам:\n\n` +
      `Платформа IT-Старт содержит структурированные карты развития по 6 направлениям:\n` +
      `1. Frontend: Core (JS Event Loop, CRP, TS) + React, Angular, Vue\n` +
      `2. Backend: Core (REST, ACID, PostgreSQL, Docker) + Python, Go, Java, Node.js\n` +
      `3. Mobile: Core (MVVM, Architecture) + Android, iOS, Flutter\n` +
      `4. Data Science: Core (Math, SQL) + ML Engineer, Data Analyst\n` +
      `5. QA: Core (Тест-дизайн, API) + Manual & Auto QA\n` +
      `6. DevOps: Core (Linux, CI/CD) + Docker, Kubernetes, Cloud\n\n` +
      `🚀 Открыть интерактивное древо роадмапов с сохранением личного прогресса:\n` +
      `${GITHUB_PAGES_URL}`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [{ label: '🗺 Открыть роадмапы в IT-Старт', link: GITHUB_PAGES_URL }],
        [{ label: '💼 Посмотреть стажировки', payload: { cmd: 'vacancies' }, color: 'primary' }],
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
    return { ok: true, type: 'roadmaps', reply };
  }

  // 7. «Вопросы» / /questions
  if (cmd === 'questions' || textClean === '/questions' || textClean === 'вопросы' || textClean === 'собеседование') {
    const text =
      `❓ Тренажёр вопросов к собеседованию IT-Старт:\n\n` +
      `В приложении доступна библиотека из 55+ детально разобранных вопросов:\n` +
      `• JavaScript Event Loop & Microtasks\n` +
      `• React Fiber & Virtual DOM\n` +
      `• Транзакции, ACID & уровни изоляции PostgreSQL\n` +
      `• Устройство Docker & cgroups/namespaces\n` +
      `• Clean Architecture & SOLID\n\n` +
      `🎯 Доступен режим флеш-карточек и симуляция реального собеседования со скрытием правильного ответа!\n\n` +
      `🚀 Запустить тренажёр: ${GITHUB_PAGES_URL}`;

    const keyboard = createVkKeyboard({
      inline: true,
      buttons: [
        [{ label: '🎯 Открыть тренажёр вопросов', link: GITHUB_PAGES_URL }],
        [{ label: '💼 Каталог вакансий', payload: { cmd: 'vacancies' }, color: 'primary' }],
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
    return { ok: true, type: 'questions', reply };
  }

  // 8. «Подписка» / /subscribe
  if (cmd === 'subscribe' || textClean === '/subscribe' || textClean === 'подписка' || textClean === 'подписаться') {
    await registerVkSubscriber(peerId, { first_name: 'Пользователь VK' });

    const text =
      `✅ Вы успешно подписались на уведомления о новых стажировках в VK!\n\n` +
      `Как только наш парсер сайтов и каналов (Т1, Контур, Т-Банк, Directum, Яндекс, Ozon, Сбер, Авито, VK) обнаружит новую вакансию, вы сразу получите персональное уведомление сюда.\n\n` +
      `Чтобы отписаться, отправьте команду /unsubscribe.`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'subscribed', reply };
  }

  // 9. «Отписаться» / /unsubscribe
  if (cmd === 'unsubscribe' || textClean === '/unsubscribe' || textClean === 'отписаться') {
    await unregisterVkSubscriber(peerId);

    const text = `❌ Вы отписались от уведомлений в VK. Чтобы возобновить рассылку, отправьте команду /subscribe.`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'unsubscribed', reply };
  }

  // 10. «Статус» / /status / /scan / /sync
  if (
    cmd === 'status' ||
    textClean === '/status' ||
    textClean === 'статус' ||
    textClean === '/scan' ||
    textClean === '/sync' ||
    textClean === '/parse'
  ) {
    const text =
      `⚡ Статус сервиса IT-Старт & VK Bot:\n\n` +
      `🤖 VK Bot: Онлайн (Bots Long Poll API)\n` +
      `🌐 Telegram Bot: @IT_start_izh_bot (Long Polling)\n` +
      `📡 Источников в мониторинге: ${ALL_TARGET_TG_CHANNELS.length + CAREER_WEBSITES_DATA.length} ` +
      `(${ALL_TARGET_TG_CHANNELS.length} каналов + ${CAREER_WEBSITES_DATA.length} сайтов)\n` +
      `🏢 Отслеживаемых компаний: ${COMPANIES_DATA.length}\n` +
      `👥 Активных подписчиков в VK: ${vkSubscribers.size}\n` +
      `🕒 Последнее сканирование: ${LAST_SCAN_STATUS.lastScanAt || 'недавно'}\n` +
      `💾 База данных: Supabase PostgreSQL (public.internships)\n\n` +
      `🚀 Платформа: ${GITHUB_PAGES_URL}`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'status', reply };
  }

  // 11. «Помощь» / /help
  if (cmd === 'help' || textClean === '/help' || textClean === 'помощь' || textClean === 'справка') {
    const text =
      `ℹ️ Команды бота IT-Старт ВКонтакте:\n\n` +
      `• Начать / /start — Главное меню и клавиатура\n` +
      `• Стажировки / /vacancies — Каталог актуальных вакансий (с фильтром по направлениям)\n` +
      `• Компании / /companies — Список целевых IT-работодателей (Т1, Контур, Т-Банк, Directum и др.)\n` +
      `• Роадмапы / /roadmaps — Карты развития по 6 стекам\n` +
      `• Вопросы / /questions — База 55+ вопросов к собеседованию\n` +
      `• Подписка / /subscribe — Подписаться на пуш-уведомления о новых вакансиях\n` +
      `• Статус / /status — Состояние парсера и источников\n\n` +
      `💡 Быстрый поиск: отправьте боту название компании (например, «директум», «контур», «т1», «яндекс»), и бот покажет её вакансии!`;

    const reply = {
      peer_id: peerId,
      random_id: Math.floor(Math.random() * 2147483647),
      message: text,
      keyboard: MAIN_VK_KEYBOARD,
    };

    if (token) {
      await callVk('messages.send', reply, token);
    }
    return { ok: true, type: 'help', reply };
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
  return { ok: true, type: 'unknown', reply };
}

/**
 * Return current runtime status of VK Bot
 */
export function getVkBotStatus() {
  return {
    bot: 'IT-Старт VK Бот',
    apiBase: VK_API_BASE,
    version: VK_API_VERSION,
    status: isPollingActive ? 'active' : VK_BOT_TOKEN ? 'configured' : 'fallback',
    mode: VK_BOT_TOKEN ? 'live' : 'fallback',
    uptime: process.uptime(),
    subscribersCount: vkSubscribers.size,
    commandsCount: 8,
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
  const tokenToUse = token || VK_BOT_TOKEN;

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
  let groupId = options.groupId || VK_GROUP_ID;
  if (!groupId) {
    try {
      const gRes = await callVk('groups.getById', {}, tokenToUse);
      if (gRes.ok && gRes.result) {
        const groups = gRes.result.groups || gRes.result;
        if (Array.isArray(groups) && groups.length > 0) {
          groupId = groups[0].id;
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
      const res = await callVk('groups.getLongPollServer', { group_id: groupId }, tokenToUse);
      if (res.ok && res.result) {
        server = res.result.server;
        key = res.result.key;
        ts = res.result.ts;
        return true;
      }
      return false;
    };

    let serverReady = await getLongPollServer();

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
              if (upd.type === 'message_new') {
                const msg = upd.object?.message || upd.object;
                if (msg) {
                  await handleVkMessage(msg, tokenToUse);
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
