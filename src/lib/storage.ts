import type { AuthProfile, Internship, JobApplication, TelegramSubscription, UserProgress, ViewedVacancyEntry } from '../types';

const PROGRESS_STORAGE_KEY = 'it_start_user_progress';
const SUBSCRIPTION_STORAGE_KEY = 'it_start_local_subscription';
const AUTH_PROFILE_STORAGE_KEY = 'it_start_auth_profile';
const INTERNSHIPS_STORAGE_KEY = 'it_start_cached_internships_v3';
const THEME_STORAGE_KEY = 'it_start_theme';
const FAVORITES_STORAGE_KEY = 'it_start_favorites';
const APPLICATIONS_STORAGE_KEY = 'it_start_applications';
const VIEWED_HISTORY_STORAGE_KEY = 'it_start_viewed_history';

export function getLocalTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function saveLocalTheme(theme: 'dark' | 'light'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
  }
}

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

export function clearLocalSubscription(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    localStorage.removeItem('it_start_vk_peer_id');
  } catch (e) {
    console.warn('Failed to clear subscription from localStorage:', e);
  }
}

export function getLocalAuthProfile(): AuthProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id || (parsed.platform !== 'telegram' && parsed.platform !== 'vk')) {
      return null;
    }
    return {
      platform: parsed.platform,
      id: String(parsed.id),
      username: parsed.username || undefined,
      firstName: parsed.firstName || undefined,
      lastName: parsed.lastName || undefined,
      photoUrl: parsed.photoUrl || undefined,
      notificationsEnabled: parsed.notificationsEnabled !== false,
      authorizedAt: parsed.authorizedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveLocalAuthProfile(profile: AuthProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save auth profile to localStorage:', e);
  }
}

export function clearLocalAuthProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear auth profile from localStorage:', e);
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

export function getLocalFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFavorites(favorites: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.warn('Failed to save favorites to localStorage:', e);
  }
}

export function toggleLocalFavorite(vacancyId: string): string[] {
  const current = getLocalFavorites();
  const exists = current.includes(vacancyId);
  const next = exists ? current.filter((id) => id !== vacancyId) : [...current, vacancyId];
  saveLocalFavorites(next);
  return next;
}

export function getLocalApplications(): JobApplication[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalApplications(apps: JobApplication[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(apps));
  } catch (e) {
    console.warn('Failed to save applications to localStorage:', e);
  }
}

export function addLocalApplication(app: JobApplication): JobApplication[] {
  const current = getLocalApplications();
  const existsIndex = current.findIndex((a) => a.vacancyId === app.vacancyId);
  let next: JobApplication[];
  if (existsIndex >= 0) {
    next = [...current];
    next[existsIndex] = { ...next[existsIndex], ...app };
  } else {
    next = [app, ...current];
  }
  saveLocalApplications(next);
  return next;
}

export function removeLocalApplication(vacancyId: string): JobApplication[] {
  const current = getLocalApplications();
  const next = current.filter((a) => a.vacancyId !== vacancyId && a.id !== vacancyId);
  saveLocalApplications(next);
  return next;
}

export function getLocalViewedHistory(): ViewedVacancyEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VIEWED_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => x && typeof x.id === 'string' && typeof x.viewedAt === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveLocalViewedHistory(history: ViewedVacancyEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VIEWED_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 40)));
  } catch (e) {
    console.warn('Failed to save viewed history to localStorage:', e);
  }
}

export function addLocalViewedVacancy(vacancyId: string): ViewedVacancyEntry[] {
  const cleanId = String(vacancyId || '').trim();
  if (!cleanId) return getLocalViewedHistory();
  const current = getLocalViewedHistory().filter((item) => item.id !== cleanId);
  const next: ViewedVacancyEntry[] = [{ id: cleanId, viewedAt: new Date().toISOString() }, ...current].slice(0, 40);
  saveLocalViewedHistory(next);
  return next;
}

