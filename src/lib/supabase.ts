import { createClient } from '@supabase/supabase-js';
import type { Internship, TelegramSubscription, UserProgress } from '../types';

export const SUPABASE_URL = 'https://pmgsymacvhzsixbpndsn.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ3N5bWFjdmh6c2l4YnBuZHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDA1OTEsImV4cCI6MjEwNzYxNjU5MX0.J3LSRV4pYTogH52y1maMV8NZ1J9s72WU2ydtyQhWWr4';

export const TELEGRAM_BOT_USERNAME = 'IT_start_izh_bot';
export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
export const GITHUB_PAGES_URL = 'https://oioiqp.github.io/it-start/';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch internships from Supabase table `public.internships`
 */
export async function fetchInternshipsFromSupabase(): Promise<Internship[] | null> {
  try {
    const { data, error } = await supabase
      .from('internships')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch internships error, fallback will be used:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map((item: any) => {
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
          sourceChannel: item.source_name || item.source_channel || '@IT_start_izh_bot',
          sourceType: (item.source_type || 'telegram') as 'telegram' | 'portal',
          applyUrl: item.source_url || item.apply_url || TELEGRAM_BOT_URL,
          publishedAt: item.published_at || new Date().toISOString(),
          isHot: Boolean(item.is_hot),
        };
      });
    }

    return [];
  } catch (err) {
    console.warn('Supabase query exception:', err);
    return null;
  }
}

/**
 * Seed initial internships if table is empty
 */
export async function seedInternshipsToSupabase(seedData: Internship[]): Promise<boolean> {
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
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error during seeding:', err);
    return false;
  }
}

/**
 * Add a new internship to Supabase
 */
export async function addInternshipToSupabase(item: Internship): Promise<boolean> {
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
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception adding internship to Supabase:', err);
    return false;
  }
}

/**
 * Save / Update Telegram subscription
 */
export async function saveSubscriptionToSupabase(sub: TelegramSubscription): Promise<boolean> {
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
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase subscription exception:', err);
    return false;
  }
}

/**
 * Get active subscriptions
 */
export async function fetchSubscriptionsFromSupabase(): Promise<TelegramSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('tg_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
      chat_id: d.chat_id,
      username: d.username,
      first_name: d.first_name,
      directions: Array.isArray(d.directions) ? d.directions : [],
      sub_tracks: Array.isArray(d.sub_tracks) ? d.sub_tracks : [],
      is_active: d.is_active,
      created_at: d.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Save user progress to Supabase
 */
export async function saveUserProgressToSupabase(
  userId: string | number,
  progress: UserProgress
): Promise<boolean> {
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
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
