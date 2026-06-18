/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  phone: string;
  fullName: string;
  school: string;
  subject: string;
}

export interface Slide {
  title: string;
  content: string[];
  speakerNotes: string;
  layout: 'title' | 'content' | 'two-column' | 'quote';
  imagePrompt?: string; // Prompt for slide imagery
}

export interface GeneratedPresentation {
  id: string;
  title: string;
  subject: string;
  grade: string;
  slideCount: number;
  slides: Slide[];
  createdAt: string;
}

export interface TestQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswers: number[]; // Index of correct option(s)
  type: 'single' | 'multiple';
  explanation: string;
}

export interface GeneratedTest {
  id: string;
  title: string;
  subject: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: TestQuestion[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string;
}

export interface GeneratedQuiz {
  id: string;
  title: string;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
}

export type MaterialType = 'presentation' | 'test' | 'quiz';

export interface SavedMaterial {
  id: string;
  userId: string;
  type: MaterialType;
  title: string;
  subject: string;
  createdAt: string;
  data: GeneratedPresentation | GeneratedTest | GeneratedQuiz;
}
