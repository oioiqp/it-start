import type { Internship, TelegramSubscription, UserProgress } from '../types';

const PROGRESS_STORAGE_KEY = 'it_start_user_progress';
const SUBSCRIPTION_STORAGE_KEY = 'it_start_local_subscription';
const INTERNSHIPS_STORAGE_KEY = 'it_start_cached_internships';

export function getLocalProgress(): UserProgress {
  if (typeof window === 'undefined') {
    return { completedTopics: [], completedSubtopics: [], completedQuestions: [], repeatQuestions: [] };
  }
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { completedTopics: [], completedSubtopics: [], completedQuestions: [], repeatQuestions: [] };
    const parsed = JSON.parse(raw);
    return {
      completedTopics: Array.isArray(parsed.completedTopics) ? parsed.completedTopics : [],
      completedSubtopics: Array.isArray(parsed.completedSubtopics) ? parsed.completedSubtopics : [],
      completedQuestions: Array.isArray(parsed.completedQuestions) ? parsed.completedQuestions : [],
      repeatQuestions: Array.isArray(parsed.repeatQuestions) ? parsed.repeatQuestions : [],
    };
  } catch {
    return { completedTopics: [], completedSubtopics: [], completedQuestions: [], repeatQuestions: [] };
  }
}

export function saveLocalProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save progress to localStorage:', e);
  }
}

export function getLocalSubscription(): TelegramSubscription | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalSubscription(sub: TelegramSubscription): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
  } catch (e) {
    console.warn('Failed to save subscription to localStorage:', e);
  }
}

export function getCachedInternships(): Internship[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INTERNSHIPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCachedInternships(items: Internship[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTERNSHIPS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to cache internships in localStorage:', e);
  }
}
