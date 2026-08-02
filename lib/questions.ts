import { supabase } from "@/lib/supabase";

export type QuestionCategory = "baseball" | "general" | "marca";

export interface TriviaQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  brand?: string;
  answers: [string, string, string];
  correctAnswer: number;
  active?: boolean;
}

export const QUESTIONS_EVENT = "hrr-questions-updated";

function mapRow(row: Record<string, unknown>): TriviaQuestion {
  const values = Array.isArray(row.answers) ? row.answers.map(String) : [];
  return {
    id: String(row.id),
    text: String(row.text ?? ""),
    category: (row.category as QuestionCategory) ?? "general",
    brand: row.brand ? String(row.brand) : undefined,
    answers: [values[0] ?? "", values[1] ?? "", values[2] ?? ""],
    correctAnswer: Number(row.correct_answer ?? 0),
    active: row.is_active !== false,
  };
}

export async function readQuestions(includeInactive = false): Promise<TriviaQuestion[]> {
  let query = supabase.from("questions").select("*").order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createQuestion(question: Omit<TriviaQuestion, "id">): Promise<TriviaQuestion> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("questions")
    .insert({
      text: question.text,
      category: question.category,
      brand: question.category === "marca" ? question.brand || null : null,
      answers: question.answers,
      correct_answer: question.correctAnswer,
      is_active: question.active ?? true,
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  window.dispatchEvent(new CustomEvent(QUESTIONS_EVENT));
  return mapRow(data as Record<string, unknown>);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
  window.dispatchEvent(new CustomEvent(QUESTIONS_EVENT));
}
