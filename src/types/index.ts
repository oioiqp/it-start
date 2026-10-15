export type DirectionId =
  | 'frontend'
  | 'backend'
  | 'mobile'
  | 'data_science'
  | 'qa'
  | 'devops';

export type SubTrackId =
  // Frontend
  | 'react'
  | 'angular'
  | 'vue'
  // Backend
  | 'python'
  | 'golang'
  | 'java'
  | 'nodejs'
  // Mobile
  | 'android'
  | 'ios'
  | 'flutter'
  // Data Science
  | 'ml'
  | 'analytics'
  // QA
  | 'manual_qa'
  | 'auto_qa'
  // DevOps
  | 'cicd_docker'
  | 'k8s_iac';

export interface SubTrack {
  id: SubTrackId;
  name: string;
  shortDesc: string;
  iconName: string;
  color: string;
}

export interface Direction {
  id: DirectionId;
  title: string;
  description: string;
  iconName: string;
  gradient: string;
  subTracks: SubTrack[];
  coreTitle: string;
  coreDesc: string;
}

export interface RoadmapTopic {
  id: string;
  title: string;
  description: string;
  category: 'core' | 'subtrack';
  directionId: DirectionId;
  subTrackId?: SubTrackId;
  subtopics: string[];
  interviewTip: string;
  externalDocUrl: string;
  difficulty: 'Junior' | 'Junior+' | 'Middle';
  order: number;
}

export type WorkFormat = 'Удаленно' | 'Гибрид' | 'Офис';

export interface Internship {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  format: WorkFormat;
  salary: string;
  directionId: DirectionId;
  subTrackId: SubTrackId;
  tags: string[];
  description: string;
  requirements: string[];
  responsibilities: string[];
  sourceChannel: string;
  sourceType: 'telegram' | 'portal';
  applyUrl: string;
  publishedAt: string;
  isHot?: boolean;
}

export interface Question {
  id: string;
  directionId: DirectionId;
  subTrackId: SubTrackId | 'core';
  title: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  codeLanguage?: string;
  keyTakeaways: string[];
  difficulty: 'Junior' | 'Junior+' | 'Middle';
  category: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramSubscription {
  chat_id: number | string;
  username?: string;
  first_name?: string;
  directions: DirectionId[];
  sub_tracks: SubTrackId[];
  is_active: boolean;
  created_at?: string;
}

export interface UserProgress {
  completedTopics: string[];
  completedSubtopics?: string[];
  completedQuestions: string[];
  repeatQuestions: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  responsibility: string;
  techStack: string[];
  avatar: string;
  telegram?: string;
  github?: string;
}
