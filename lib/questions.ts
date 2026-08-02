export type QuestionCategory = "baseball" | "general" | "marca";

export interface TriviaQuestion {
  id: number;
  text: string;
  category: QuestionCategory;
  brand?: string;
  answers: [string, string, string];
  correctAnswer: number;
}

export const QUESTIONS_STORAGE_KEY = "hrr-question-bank-v1";
export const QUESTIONS_EVENT = "hrr-questions-updated";

export const DEFAULT_QUESTIONS: TriviaQuestion[] = [
  { id: 1, text: "¿Cuántos strikes provocan un ponche?", category: "baseball", answers: ["Dos", "Tres", "Cuatro"], correctAnswer: 1 },
  { id: 2, text: "¿Cuántas bases tiene un campo de béisbol?", category: "baseball", answers: ["Tres", "Cuatro", "Cinco"], correctAnswer: 1 },
  { id: 3, text: "¿Cuántos outs terminan una media entrada?", category: "baseball", answers: ["Dos", "Tres", "Cuatro"], correctAnswer: 1 },
  { id: 4, text: "¿Cuál es la capital de México?", category: "general", answers: ["Monterrey", "Guadalajara", "Ciudad de México"], correctAnswer: 2 },
  { id: 5, text: "¿Qué experiencia ofrece Home Run Rewards?", category: "marca", brand: "Home Run Rewards", answers: ["Campañas interactivas", "Venta de autos", "Cursos"], correctAnswer: 0 },
];

export function readQuestions(): TriviaQuestion[] {
  if (typeof window === "undefined") return DEFAULT_QUESTIONS;
  try {
    const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(DEFAULT_QUESTIONS));
      return DEFAULT_QUESTIONS;
    }
    return JSON.parse(raw) as TriviaQuestion[];
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export function saveQuestions(questions: TriviaQuestion[]) {
  localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
  window.dispatchEvent(new CustomEvent(QUESTIONS_EVENT));
}
