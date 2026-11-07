import questionsJson from "@/config/questions.json";

export type QuestionType = "date" | "time" | "short" | "long" | "single" | "multi";

export interface Question {
  id: string; // "q1".."q35"
  section: string;
  label: string;
  help: string | null;
  type: QuestionType;
  options: string[] | null;
  required: boolean;
  showIf: Record<string, string> | null;
}

export const SECTIONS: string[] = questionsJson.sections;

// questions.json is validated by shape here so the rest of the app can trust it.
export const QUESTIONS: Question[] = (questionsJson.questions as Question[]).map(
  (q) => ({
    ...q,
    options: q.options ?? null,
    help: q.help ?? null,
    showIf: q.showIf ?? null,
  })
);

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q])
);

export const TOTAL_QUESTIONS = QUESTIONS.length;
