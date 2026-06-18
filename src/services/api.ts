/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, 
  GeneratedPresentation, 
  GeneratedTest, 
  GeneratedQuiz, 
  SavedMaterial, 
  MaterialType 
} from '../types';

export async function registerPhone(payload: {
  phone: string;
  fullName: string;
  school: string;
  subject: string;
}) {
  const res = await fetch('/api/auth/register-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'SMS жіберу қатесі орын алды');
  }
  return res.json(); // { success, message, phone, smsCodeSimulated }
}

export async function verifyCode(phone: string, code: string): Promise<{ success: boolean; user: User }> {
  const res = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Растау коды қате');
  }
  return res.json();
}

export async function generatePresentation(payload: {
  subject: string;
  topic: string;
  grade: string;
  slideCount: number;
}): Promise<GeneratedPresentation> {
  const res = await fetch('/api/generate/presentation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Презентация құрастыру кезінде қате кетті');
  }
  const data = await res.json();
  return {
    id: 'pres_' + Date.now(),
    title: data.title || payload.topic,
    subject: payload.subject,
    grade: payload.grade,
    slideCount: payload.slideCount,
    slides: data.slides || [],
    createdAt: new Date().toISOString()
  };
}

export async function generateTest(payload: {
  subject: string;
  topic: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}): Promise<GeneratedTest> {
  const res = await fetch('/api/generate/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Тесттерді құрастыру кезінде қате кетті');
  }
  const data = await res.json();
  return {
    id: 'test_' + Date.now(),
    title: data.title || `${payload.subject}: ${payload.topic}`,
    subject: payload.subject,
    questionCount: payload.questionCount,
    difficulty: payload.difficulty,
    questions: data.questions || [],
    createdAt: new Date().toISOString()
  };
}

export async function generateQuiz(payload: {
  topic: string;
  questionCount: number;
}): Promise<GeneratedQuiz> {
  const res = await fetch('/api/generate/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Викторина құрастыру кезінде қате кетті');
  }
  const data = await res.json();
  return {
    id: 'quiz_' + Date.now(),
    title: data.title || `${payload.topic} бойынша викторина`,
    questionCount: payload.questionCount,
    questions: data.questions || [],
    createdAt: new Date().toISOString()
  };
}

export async function getSavedMaterials(userId: string): Promise<SavedMaterial[]> {
  const res = await fetch(`/api/materials?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    throw new Error('Материалдарды жүктеу сәтсіз аяқталды');
  }
  return res.json();
}

export async function saveMaterial(payload: {
  userId: string;
  type: MaterialType;
  title: string;
  subject: string;
  data: any;
}): Promise<{ success: boolean; material: SavedMaterial }> {
  const res = await fetch('/api/materials/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Материалды сақтау орындалмады');
  }
  return res.json();
}

export async function updateMaterial(id: string, payload: {
  title?: string;
  subject?: string;
  data: any;
}): Promise<{ success: boolean; material: SavedMaterial }> {
  const res = await fetch(`/api/materials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Материалды жаңарту орындалмады');
  }
  return res.json();
}

export async function deleteMaterial(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/materials/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Материалды жою қатесі');
  }
  return res.json();
}
