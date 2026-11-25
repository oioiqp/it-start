import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Navbar } from '../components/Navbar';
import { SubscribeModal } from '../components/SubscribeModal';
import {
  normalizeCloudUserKey,
  encodeCloudSavedState,
  decodeCloudSavedState,
  saveUserProgressToSupabase,
  fetchUserProgressFromSupabase,
} from '../lib/supabase';
import { saveUnifiedSubscription } from '../services/subscriptionService';
import {
  getLocalAuthProfile,
  saveLocalAuthProfile,
  clearLocalAuthProfile,
} from '../lib/storage';
import type { AuthProfile, JobApplication, UserProgress } from '../types';

describe('Authorization, Opt-Out Notifications, and Cloud State Sync', () => {
  beforeEach(() => {
    clearLocalAuthProfile();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Navbar shows explicit Войти button when unauthenticated on standalone web', () => {
    const html = renderToString(
      React.createElement(Navbar, {
        activeTab: 'internships',
        setActiveTab: () => {},
        telegramUser: null,
        vkUser: null,
        authProfile: null,
        isVk: false,
        onOpenSubscribeModal: () => {},
      })
    );

    expect(html).toContain('Войти (TG / VK)');
    expect(html).toContain('Авторизация через Telegram или ВКонтакте для сохранения истории и прогресса');
  });

  it('Navbar shows signed-in profile badge with muted bell when notifications are disabled', () => {
    const profile: AuthProfile = {
      platform: 'vk',
      id: '482655491',
      firstName: 'Тимур',
      notificationsEnabled: false,
      authorizedAt: '2026-11-25T10:00:00.000Z',
    };

    const html = renderToString(
      React.createElement(Navbar, {
        activeTab: 'internships',
        setActiveTab: () => {},
        telegramUser: null,
        vkUser: null,
        authProfile: profile,
        isVk: false,
        onOpenSubscribeModal: () => {},
      })
    );

    expect(html).toContain('Тимур');
    expect(html).toContain('VK');
    expect(html).toContain('Уведомления откл.');
  });

  it('SubscribeModal clearly explains Authorization & lets user sign in without notifications', () => {
    const html = renderToString(
      React.createElement(SubscribeModal, {
        isOpen: true,
        onClose: () => {},
        telegramUser: null,
        vkUser: null,
        authProfile: null,
        isVk: false,
        currentSubscription: null,
        onSubscriptionSaved: () => {},
      })
    );

    expect(html).toContain('Авторизация через Telegram');
    expect(html).toContain('Авторизация для сохранения вашего состояния и истории');
    expect(html).toContain('Получать уведомления о новых стажировках');
    expect(html).toContain('Войти через Telegram');
    expect(html).toContain('Telegram-бот');
    expect(html).toContain('ВКонтакте-бот');
    expect(html).toContain('Ваш Telegram Chat ID');
  });

  it('SubscribeModal shows logout control when already authorized on standalone web', () => {
    const profile: AuthProfile = {
      platform: 'telegram',
      id: '99887766',
      firstName: 'Анна',
      username: 'anna_dev',
      notificationsEnabled: false,
      authorizedAt: '2026-11-25T10:00:00.000Z',
    };

    const html = renderToString(
      React.createElement(SubscribeModal, {
        isOpen: true,
        onClose: () => {},
        telegramUser: null,
        vkUser: null,
        authProfile: profile,
        isVk: false,
        currentSubscription: null,
        onSubscriptionSaved: () => {},
        onLogout: () => {},
      })
    );

    expect(html).toContain('Выйти из аккаунта');
    expect(html).toContain('Сохранить профиль');
  });

  it('allows authorizing via Telegram or VK with notificationsEnabled=false (is_active=false)', async () => {
    const tgRes = await saveUnifiedSubscription({
      platform: 'telegram',
      id: '555666777',
      firstName: 'Иван',
      username: 'ivan_js',
      directions: ['frontend'],
      subTracks: ['react'],
      notificationsEnabled: false,
    });

    expect(tgRes.success).toBe(true);
    expect(tgRes.subscription.chat_id).toBe('555666777');
    expect(tgRes.subscription.is_active).toBe(false);

    const vkRes = await saveUnifiedSubscription({
      platform: 'vk',
      id: 'https://vk.com/id482655491',
      firstName: 'Тимур',
      directions: ['backend'],
      subTracks: ['nodejs'],
      notificationsEnabled: false,
    });

    expect(vkRes.success).toBe(true);
    expect(vkRes.subscription.chat_id).toBe('vk_482655491');
    expect(vkRes.subscription.is_active).toBe(false);
  });

  it('normalizes cloud user keys consistently between Mini Apps and standalone web auth', () => {
    expect(normalizeCloudUserKey('vk', 482655491)).toBe('vk_482655491');
    expect(normalizeCloudUserKey('vk', 'vk_482655491')).toBe('vk_482655491');
    expect(normalizeCloudUserKey('telegram', 123456789)).toBe('123456789');
    expect(normalizeCloudUserKey('telegram', 'tg_123456789')).toBe('123456789');
    expect(normalizeCloudUserKey(null, '')).toBe('anonymous');
  });

  it('encodes, decodes, saves, and fetches full user state (progress, subtopics, repeats, favorites, applications)', async () => {
    const userKey = 'vk_auth_roundtrip_test';
    const progress: UserProgress = {
      completedTopics: ['fe-html', 'fe-css'],
      completedSubtopics: ['fe-html__sub_0', 'fe-css__sub_1'],
      completedQuestions: ['q-1', 'q-2'],
      repeatQuestions: ['q-3'],
    };
    const favorites = ['tbank-ml-2026', 'yandex-backend-2026'];
    const applications: JobApplication[] = [
      {
        id: 'tbank-ml-2026',
        vacancyId: 'tbank-ml-2026',
        title: 'Стажёр ML',
        company: 'Т-Банк',
        salary: 'от 80 000 ₽',
        location: 'Москва',
        format: 'Гибрид',
        applyUrl: 'https://www.tbank.ru/career/it/ml/',
        appliedAt: '2026-11-25T10:00:00.000Z',
        deadlineDate: '2026-01-31',
        deadlineAction: 'Подать заявку до 31 января',
        status: 'applied',
      },
    ];

    const encoded = encodeCloudSavedState(progress, favorites, applications, [
      { id: 'tbank-ml-2026', viewedAt: '2026-11-25T10:30:00.000Z' },
    ]);
    const decoded = decodeCloudSavedState(
      progress.completedTopics,
      progress.completedQuestions,
      encoded
    );
    expect(decoded.progress).toEqual(progress);
    expect(decoded.favorites).toEqual(favorites);
    expect(decoded.applications).toEqual(applications);
    expect(decoded.viewedHistory).toEqual([
      { id: 'tbank-ml-2026', viewedAt: '2026-11-25T10:30:00.000Z' },
    ]);

    const saved = await saveUserProgressToSupabase(userKey, progress, {
      favorites,
      applications,
      viewedHistory: [{ id: 'tbank-ml-2026', viewedAt: '2026-11-25T10:30:00.000Z' }],
    });
    expect(saved).toBe(true);

    // Updating progress with 2-arg signature must preserve previously synced favorites & applications
    const nextProgress: UserProgress = {
      ...progress,
      completedTopics: [...progress.completedTopics, 'fe-js'],
    };
    await saveUserProgressToSupabase(userKey, nextProgress);

    const restored = await fetchUserProgressFromSupabase(userKey);
    expect(restored).not.toBeNull();
    expect(restored!.progress.completedTopics).toEqual(['fe-html', 'fe-css', 'fe-js']);
    expect(restored!.progress.completedSubtopics).toEqual(progress.completedSubtopics);
    expect(restored!.progress.repeatQuestions).toEqual(['q-3']);
    expect(restored!.favorites).toEqual(favorites);
    expect(restored!.applications).toHaveLength(1);
    expect(restored!.applications[0].company).toBe('Т-Банк');
    expect(restored!.viewedHistory).toEqual([
      { id: 'tbank-ml-2026', viewedAt: '2026-11-25T10:30:00.000Z' },
    ]);
  });

  it('persists and clears local AuthProfile cleanly when browser storage is present', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    });

    const profile: AuthProfile = {
      platform: 'telegram',
      id: '777111222',
      firstName: 'Денис',
      notificationsEnabled: false,
      authorizedAt: '2026-11-25T10:00:00.000Z',
    };
    saveLocalAuthProfile(profile);
    expect(getLocalAuthProfile()).toEqual(profile);
    clearLocalAuthProfile();
    expect(getLocalAuthProfile()).toBeNull();
  });

  it('bot registration helpers respect is_active: false for silent authorization', async () => {
    // @ts-expect-error untyped ESM bot module
    const { registerTgSubscriber, getTgSubscribers } = await import('../../bot/bot.mjs');
    // @ts-expect-error untyped ESM VK bot module
    const { registerVkSubscriber, getVkSubscribers } = await import('../../bot/vk_bot.mjs');

    const tgSub = await registerTgSubscriber('888999000', {
      username: 'silent_tg',
      first_name: 'Алексей',
      is_active: false,
    });
    expect(tgSub.is_active).toBe(false);
    const activeTgIds = (await getTgSubscribers()).map((s: any) => String(s.chat_id));
    expect(activeTgIds).not.toContain('888999000');

    const vkSub = await registerVkSubscriber('888999001', {
      first_name: 'Мария',
      is_active: false,
    });
    expect(vkSub.is_active).toBe(false);
    const activeVkIds = (await getVkSubscribers()).map((s: any) => String(s.peer_id));
    expect(activeVkIds).not.toContain('888999001');
  });

  it('bot WEBAPP_URL and PUBLIC_WEB_URL resolve to live GitHub Pages instead of 404 Koyeb', async () => {
    // @ts-expect-error untyped ESM bot module
    const bot = await import('../../bot/bot.mjs');
    // @ts-expect-error untyped ESM VK bot module
    const vkBot = await import('../../bot/vk_bot.mjs');

    expect(bot.WEBAPP_URL).toBe('https://oioiqp.github.io/it-start/');
    expect(bot.PUBLIC_WEB_URL).toBe('https://oioiqp.github.io/it-start/');
    expect(vkBot.PUBLIC_WEB_URL).toBe('https://oioiqp.github.io/it-start/');
  });
});
