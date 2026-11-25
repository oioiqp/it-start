import { createClient } from '@supabase/supabase-js';
import type {
  AuthPlatform,
  CloudUserState,
  Internship,
  JobApplication,
  TelegramSubscription,
  UserProgress,
  ViewedVacancyEntry,
} from '../types';
import {
  resolveApplyUrl,
  parseTelegramSource,
  extractRecruitmentFromTags,
  formatSalary,
  isStrictVacancyPost,
  isVacancyActive,
  isDirectVacancyUrl,
} from './vacancyUrl';

export const SUPABASE_URL = 'https://pmgsymacvhzsixbpndsn.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

export const TELEGRAM_BOT_USERNAME = 'IT_start_izh_bot';
export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
export const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';

const quickFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { fetch: quickFetch },
});

// In-memory fallback stores when Supabase is unreachable (offline / DNS issues / local vitest environment)
const isTestEnv =
  typeof globalThis !== 'undefined' &&
  Boolean((globalThis as any).process?.env?.VITEST || (globalThis as any).process?.env?.NODE_ENV === 'test');
let isSupabaseOffline = isTestEnv;
const inMemoryInternships: Map<string, Internship> = new Map();
const inMemorySubscriptions: Map<string, TelegramSubscription> = new Map();
const inMemoryUserProgress: Map<string, UserProgress> = new Map();
const inMemoryCloudState: Map<string, CloudUserState> = new Map();

/**
 * Fetch internships from Supabase table `public.internships`
 */
export async function fetchInternshipsFromSupabase(): Promise<Internship[] | null> {
  if (isSupabaseOffline) {
    return inMemoryInternships.size > 0 ? Array.from(inMemoryInternships.values()) : null;
  }

  try {
    const { data, error } = await supabase
      .from('internships')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch internships error, fallback will be used:', error.message);
      isSupabaseOffline = true;
      if (inMemoryInternships.size > 0) {
        return Array.from(inMemoryInternships.values());
      }
      return null;
    }

    if (data && data.length > 0) {
      const validRows = data.filter((item: any) => {
        const url = item.source_url || item.apply_url || '';
        return (
          isStrictVacancyPost(item.title || '', item.description || '') &&
          isVacancyActive(item) &&
          isDirectVacancyUrl(url)
        );
      });

      const seenUrls = new Set<string>();
      const seenTitles = new Set<string>();
      const items: Internship[] = [];

      for (const item of validRows) {
        const parseArray = (val: any, fallback: string[]): string[] => {
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try {
              if (val.startsWith('[')) return JSON.parse(val);
              return val.split(',').map((s) => s.trim()).filter(Boolean);
            } catch {
              return [val];
            }
          }
          return fallback;
        };

        const defaultRequirements = [
          `Знание основ стека ${(item.sub_track || item.sub_track_id || '').toUpperCase()}`,
          'Понимание алгоритмов и структур данных',
          'Опыт работы с Git и желание развиваться',
        ];

        const defaultResponsibilities = [
          'Разработка и поддержка сервисных модулей',
          'Участие в код-ревью и командных синка',
        ];

        const directionId = item.direction || item.direction_id || 'backend';
        const subTrackId = item.sub_track || item.sub_track_id || 'python';

        const directApplyUrl = resolveApplyUrl(
          item.source_url || item.apply_url,
          item.company,
          item.source_name || item.source_channel,
          directionId,
          subTrackId
        );
        if (!isDirectVacancyUrl(directApplyUrl)) continue;

        const urlKey = directApplyUrl.toLowerCase();
        const titleKey = `${item.company}_${item.title}`.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
        seenUrls.add(urlKey);
        seenTitles.add(titleKey);

        const rawSourceName = String(item.source_name || item.source_channel || '').trim();
        const isTgSource =
          item.source_type === 'telegram' ||
          directApplyUrl.includes('t.me/') ||
          rawSourceName.startsWith('@');
        const derivedSourceType: 'telegram' | 'portal' = isTgSource ? 'telegram' : 'portal';
        const parsedTg = parseTelegramSource(rawSourceName, item.company);
        const sourceChannel = isTgSource
          ? parsedTg.channelHandle
          : (rawSourceName || item.company || 'portal');
        const sourcePostUrl =
          parsedTg.postUrl ||
          (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+/i.test(directApplyUrl) ? directApplyUrl : undefined);
        const parsedTags = parseArray(item.tags, [(item.sub_track || 'Junior').toUpperCase()]);
        const recruitmentMeta = extractRecruitmentFromTags(parsedTags, item.description || '');

        items.push({
          id: String(item.id),
          title: item.title,
          company: item.company,
          companyLogo: item.company_logo || '',
          location: item.city || item.location || 'Москва / Удаленно',
          format: item.format || 'Удаленно',
          salary: formatSalary(item.salary),
          directionId,
          subTrackId,
          tags: parsedTags,
          description: item.description || '',
          requirements: parseArray(item.requirements, defaultRequirements),
          responsibilities: parseArray(item.responsibilities, defaultResponsibilities),
          sourceChannel,
          sourcePostUrl,
          sourceType: derivedSourceType,
          applyUrl: directApplyUrl,
          publishedAt: item.published_at || new Date().toISOString(),
          isHot: false,
          isActive: item.is_active !== false && item.status !== 'closed' && item.status !== 'archived',
          isVerified: true,
          status: item.status || 'active',
          ...recruitmentMeta,
        });
      }

      items.forEach((item: Internship) => inMemoryInternships.set(item.id, item));
      return items;
    }

    if (inMemoryInternships.size > 0) {
      return Array.from(inMemoryInternships.values());
    }

    return [];
  } catch (err) {
    console.warn('Supabase query exception, using in-memory store:', err);
    isSupabaseOffline = true;
    if (inMemoryInternships.size > 0) {
      return Array.from(inMemoryInternships.values());
    }
    return null;
  }
}

/**
 * Seed initial internships if table is empty
 */
export async function seedInternshipsToSupabase(seedData: Internship[]): Promise<boolean> {
  // Always update in-memory store
  seedData.forEach((item) => inMemoryInternships.set(item.id, item));

  if (isSupabaseOffline) return true;

  try {
    const rows = seedData
      .filter((item) => isVacancyActive(item))
      .map((item) => ({
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format,
      city: item.location,
      salary: item.salary,
      source_type: item.sourceType,
      source_name: item.sourceChannel,
      source_url: item.applyUrl,
      description: item.description,
      tags: item.tags,
      published_at: item.publishedAt,
    }));

    const { error } = await supabase.from('internships').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Seed internships warning (may already exist or RLS):', error.message);
      isSupabaseOffline = true;
      return true;
    }
    return true;
  } catch (err) {
    console.warn('Error during seeding, in-memory used:', err);
    isSupabaseOffline = true;
    return true;
  }
}

/**
 * Add a new internship to Supabase
 */
export async function addInternshipToSupabase(item: Internship): Promise<boolean> {
  inMemoryInternships.set(item.id, item);

  if (isSupabaseOffline) return true;

  try {
    const row = {
      id: item.id,
      title: item.title,
      company: item.company,
      direction: item.directionId,
      sub_track: item.subTrackId,
      format: item.format,
      city: item.location,
      salary: item.salary,
      source_type: item.sourceType,
      source_name: item.sourceChannel,
      source_url: item.applyUrl,
      description: item.description,
      tags: item.tags,
      published_at: item.publishedAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('internships').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to insert internship to Supabase:', error.message);
      isSupabaseOffline = true;
      return true;
    }
    return true;
  } catch (err) {
    console.warn('Exception adding internship to Supabase, stored in memory:', err);
    isSupabaseOffline = true;
    return true;
  }
}

/**
 * Save / Update Telegram subscription
 */
export async function saveSubscriptionToSupabase(sub: TelegramSubscription): Promise<boolean> {
  inMemorySubscriptions.set(String(sub.chat_id), sub);

  if (isSupabaseOffline) return true;

  try {
    const row = {
      chat_id: String(sub.chat_id),
      username: sub.username || '',
      first_name: sub.first_name || '',
      directions: sub.directions,
      sub_tracks: sub.sub_tracks,
      is_active: sub.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('tg_subscriptions')
      .upsert(row, { onConflict: 'chat_id' });

    if (error) {
      console.warn('Supabase upsert subscription warning:', error.message);
      isSupabaseOffline = true;
      return true;
    }
    return true;
  } catch (err) {
    console.warn('Supabase subscription exception, stored in memory:', err);
    isSupabaseOffline = true;
    return true;
  }
}

/**
 * Get active subscriptions
 */
export async function fetchSubscriptionsFromSupabase(): Promise<TelegramSubscription[]> {
  if (isSupabaseOffline) {
    return Array.from(inMemorySubscriptions.values()).filter((s) => s.is_active);
  }

  try {
    const { data, error } = await supabase
      .from('tg_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error || !data) {
      isSupabaseOffline = true;
      return Array.from(inMemorySubscriptions.values()).filter((s) => s.is_active);
    }

    const fetched = data.map((d: any) => ({
      chat_id: d.chat_id,
      username: d.username,
      first_name: d.first_name,
      directions: Array.isArray(d.directions) ? d.directions : [],
      sub_tracks: Array.isArray(d.sub_tracks) ? d.sub_tracks : [],
      is_active: d.is_active,
      created_at: d.created_at,
    }));

    fetched.forEach((s: TelegramSubscription) => inMemorySubscriptions.set(String(s.chat_id), s));
    return fetched;
  } catch {
    isSupabaseOffline = true;
    return Array.from(inMemorySubscriptions.values()).filter((s) => s.is_active);
  }
}

/**
 * Fetch exact subscription/preferences row by chat_id (including is_active: false)
 */
export async function fetchSubscriptionByChatIdFromSupabase(
  chatId: string | number
): Promise<TelegramSubscription | null> {
  const key = String(chatId).trim();
  if (!key) return null;

  if (isSupabaseOffline) {
    return inMemorySubscriptions.get(key) || null;
  }

  try {
    const { data, error } = await supabase
      .from('tg_subscriptions')
      .select('*')
      .eq('chat_id', key)
      .maybeSingle();

    if (error) {
      isSupabaseOffline = true;
      return inMemorySubscriptions.get(key) || null;
    }

    if (!data) return null;

    const sub: TelegramSubscription = {
      chat_id: data.chat_id,
      username: data.username || '',
      first_name: data.first_name || '',
      directions: Array.isArray(data.directions) ? data.directions : [],
      sub_tracks: Array.isArray(data.sub_tracks) ? data.sub_tracks : [],
      is_active: Boolean(data.is_active),
      created_at: data.updated_at || data.created_at,
    };
    inMemorySubscriptions.set(key, sub);
    return sub;
  } catch {
    isSupabaseOffline = true;
    return inMemorySubscriptions.get(key) || null;
  }
}

/**
 * Normalize user key consistently across Mini Apps and Web Auth.
 * VK users always map to `vk_<id>`, Telegram users always map to raw numeric/string `<id>`.
 */
export function normalizeCloudUserKey(
  platform: AuthPlatform | null | undefined,
  rawId: string | number | null | undefined
): string {
  const raw = String(rawId ?? '').trim();
  if (!raw || raw === 'anonymous') return 'anonymous';
  if (platform === 'vk' || /^vk_/i.test(raw)) {
    const clean = raw.replace(/^vk_/i, '').trim();
    return clean ? `vk_${clean}` : 'anonymous';
  }
  const clean = raw.replace(/^tg_/i, '').trim();
  return clean || 'anonymous';
}

const FAV_PREFIX = 'fav:';
const SUBTOPIC_PREFIX = '__sub__:';
const REPEAT_PREFIX = '__rep__:';
const APP_PREFIX = '__app__:';
const VIEW_PREFIX = '__view__:';

export function encodeCloudSavedState(
  progress: UserProgress,
  favorites: string[] = [],
  applications: JobApplication[] = [],
  viewedHistory: ViewedVacancyEntry[] = []
): string[] {
  const entries: string[] = [];
  const seenFavs = new Set<string>();
  for (const favId of favorites) {
    const clean = String(favId || '').trim();
    if (clean && !seenFavs.has(clean)) {
      seenFavs.add(clean);
      entries.push(`${FAV_PREFIX}${clean}`);
    }
  }
  const seenSub = new Set<string>();
  for (const subId of progress.completedSubtopics || []) {
    const clean = String(subId || '').trim();
    if (clean && !seenSub.has(clean)) {
      seenSub.add(clean);
      entries.push(`${SUBTOPIC_PREFIX}${clean}`);
    }
  }
  const seenRep = new Set<string>();
  for (const repId of progress.repeatQuestions || []) {
    const clean = String(repId || '').trim();
    if (clean && !seenRep.has(clean)) {
      seenRep.add(clean);
      entries.push(`${REPEAT_PREFIX}${clean}`);
    }
  }
  const seenApps = new Set<string>();
  for (const app of applications) {
    if (!app || (!app.vacancyId && !app.id)) continue;
    const appKey = String(app.vacancyId || app.id);
    if (!seenApps.has(appKey)) {
      seenApps.add(appKey);
      entries.push(`${APP_PREFIX}${JSON.stringify(app)}`);
    }
  }
  const seenViews = new Set<string>();
  for (const view of viewedHistory.slice(0, 40)) {
    const cleanId = String(view?.id || '').trim();
    if (!cleanId || seenViews.has(cleanId)) continue;
    seenViews.add(cleanId);
    entries.push(`${VIEW_PREFIX}${cleanId}|${view.viewedAt || new Date().toISOString()}`);
  }
  return entries;
}

export function decodeCloudSavedState(
  completedNodes: unknown,
  completedQuestions: unknown,
  savedInternships: unknown,
  updatedAt?: string
): CloudUserState {
  const completedTopics = Array.isArray(completedNodes) ? completedNodes.map(String) : [];
  const completedQs = Array.isArray(completedQuestions) ? completedQuestions.map(String) : [];
  const completedSubtopics: string[] = [];
  const repeatQuestions: string[] = [];
  const favorites: string[] = [];
  const applications: JobApplication[] = [];
  const viewedHistory: ViewedVacancyEntry[] = [];

  if (Array.isArray(savedInternships)) {
    for (const rawItem of savedInternships) {
      if (typeof rawItem !== 'string') continue;
      if (rawItem.startsWith(FAV_PREFIX)) {
        const id = rawItem.slice(FAV_PREFIX.length);
        if (id) favorites.push(id);
      } else if (rawItem.startsWith(SUBTOPIC_PREFIX)) {
        const id = rawItem.slice(SUBTOPIC_PREFIX.length);
        if (id) completedSubtopics.push(id);
      } else if (rawItem.startsWith(REPEAT_PREFIX)) {
        const id = rawItem.slice(REPEAT_PREFIX.length);
        if (id) repeatQuestions.push(id);
      } else if (rawItem.startsWith(VIEW_PREFIX)) {
        const rest = rawItem.slice(VIEW_PREFIX.length);
        const sepIdx = rest.indexOf('|');
        const id = sepIdx >= 0 ? rest.slice(0, sepIdx) : rest;
        const viewedAt = sepIdx >= 0 ? rest.slice(sepIdx + 1) : updatedAt || new Date().toISOString();
        if (id) viewedHistory.push({ id, viewedAt });
      } else if (rawItem.startsWith(APP_PREFIX)) {
        try {
          const parsed = JSON.parse(rawItem.slice(APP_PREFIX.length));
          if (parsed && typeof parsed === 'object' && (parsed.vacancyId || parsed.id)) {
            applications.push(parsed as JobApplication);
          }
        } catch {
          // Ignore malformed serialized application entry
        }
      } else if (rawItem.trim()) {
        // Backward compatibility with plain unprefixed favorite IDs
        favorites.push(rawItem.trim());
      }
    }
  }

  return {
    progress: {
      completedTopics,
      completedSubtopics,
      completedQuestions: completedQs,
      repeatQuestions,
    },
    favorites: Array.from(new Set(favorites)),
    applications,
    viewedHistory,
    updatedAt,
  };
}

/**
 * Fetch complete cloud user state (progress, favorites, applications, viewed history) from Supabase
 */
export async function fetchUserProgressFromSupabase(
  userId: string | number
): Promise<CloudUserState | null> {
  const key = String(userId || '').trim();
  if (!key) return null;

  if (isSupabaseOffline) {
    const cached = inMemoryCloudState.get(key);
    if (cached) return cached;
    const prog = inMemoryUserProgress.get(key);
    return prog ? { progress: prog, favorites: [], applications: [], viewedHistory: [] } : null;
  }

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_key', key)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user progress from Supabase:', error.message);
      isSupabaseOffline = true;
      return inMemoryCloudState.get(key) || null;
    }

    if (!data) {
      return null;
    }

    const decoded = decodeCloudSavedState(
      data.completed_nodes,
      data.completed_questions,
      data.saved_internships,
      data.updated_at
    );
    inMemoryUserProgress.set(key, decoded.progress);
    inMemoryCloudState.set(key, decoded);
    return decoded;
  } catch {
    isSupabaseOffline = true;
    return inMemoryCloudState.get(key) || null;
  }
}

/**
 * Save user progress (and optionally favorites, applications, viewedHistory) to Supabase
 */
export async function saveUserProgressToSupabase(
  userId: string | number,
  progress: UserProgress,
  extras?: { favorites?: string[]; applications?: JobApplication[]; viewedHistory?: ViewedVacancyEntry[] }
): Promise<boolean> {
  const key = String(userId || 'anonymous').trim() || 'anonymous';
  const prevCloud = inMemoryCloudState.get(key);
  const favorites = extras?.favorites !== undefined ? extras.favorites : prevCloud?.favorites || [];
  const applications = extras?.applications !== undefined ? extras.applications : prevCloud?.applications || [];
  const viewedHistory =
    extras?.viewedHistory !== undefined ? extras.viewedHistory : prevCloud?.viewedHistory || [];
  const updatedAt = new Date().toISOString();

  inMemoryUserProgress.set(key, progress);
  inMemoryCloudState.set(key, { progress, favorites, applications, viewedHistory, updatedAt });

  if (isSupabaseOffline) return true;

  try {
    const encodedExtras = encodeCloudSavedState(progress, favorites, applications, viewedHistory);
    const { error } = await supabase.from('user_progress').upsert(
      {
        user_key: key,
        completed_nodes: progress.completedTopics,
        completed_questions: progress.completedQuestions,
        saved_internships: encodedExtras,
        updated_at: updatedAt,
      },
      { onConflict: 'user_key' }
    );

    if (error) {
      console.warn('Error saving user progress to Supabase:', error.message);
      isSupabaseOffline = true;
      return true;
    }
    return true;
  } catch {
    isSupabaseOffline = true;
    return true;
  }
}
