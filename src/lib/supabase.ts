import { createClient } from '@supabase/supabase-js';
import type { Internship, TelegramSubscription, UserProgress } from '../types';
import { resolveApplyUrl, resolveChannelHandle } from './vacancyUrl';

export const SUPABASE_URL = 'https://pmgsymacvhzsixbpndsn.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

export const TELEGRAM_BOT_USERNAME = 'IT_start_izh_bot';
export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
export const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';

const quickFetch: typeof fetch = (input, init) => {
  const signal = init?.signal ?? AbortSignal.timeout(1200);
  return fetch(input, { ...init, signal });
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { fetch: quickFetch },
});

// In-memory fallback stores when Supabase is unreachable (offline / DNS issues / local vitest environment)
let isSupabaseOffline = false;
const inMemoryInternships: Map<string, Internship> = new Map();
const inMemorySubscriptions: Map<string, TelegramSubscription> = new Map();
const inMemoryUserProgress: Map<string, UserProgress> = new Map();

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
      const items = data.map((item: any) => {
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

        return {
          id: String(item.id),
          title: item.title,
          company: item.company,
          companyLogo: item.company_logo || '',
          location: item.city || item.location || 'Москва / Удаленно',
          format: item.format || 'Удаленно',
          salary: item.salary || 'По договоренности',
          directionId: item.direction || item.direction_id,
          subTrackId: item.sub_track || item.sub_track_id,
          tags: parseArray(item.tags, [(item.sub_track || 'Junior').toUpperCase()]),
          description: item.description || '',
          requirements: parseArray(item.requirements, defaultRequirements),
          responsibilities: parseArray(item.responsibilities, defaultResponsibilities),
          sourceChannel: resolveChannelHandle(item.source_name || item.source_channel, item.company),
          sourceType: (item.source_type || 'telegram') as 'telegram' | 'portal',
          applyUrl: resolveApplyUrl(item.source_url || item.apply_url, item.company),
          publishedAt: item.published_at || new Date().toISOString(),
          isHot: Boolean(item.is_hot),
        };
      });

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
    const rows = seedData.map((item) => ({
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
 * Save user progress to Supabase
 */
export async function saveUserProgressToSupabase(
  userId: string | number,
  progress: UserProgress
): Promise<boolean> {
  inMemoryUserProgress.set(String(userId), progress);

  if (isSupabaseOffline) return true;

  try {
    const { error } = await supabase.from('user_progress').upsert(
      {
        user_key: String(userId),
        completed_nodes: progress.completedTopics,
        completed_questions: progress.completedQuestions,
        saved_internships: [],
        updated_at: new Date().toISOString(),
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
