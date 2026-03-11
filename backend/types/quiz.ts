export interface QuizQuestion {
  id: string;
  question: string;
  answerType: 'boolean' | 'select' | 'number';
  options?: string[];
  blockType: 'NONE' | 'TEMPORARY' | 'PERMANENT';
  blockDuration?: number; // days
  blockReason: string;
  pointsDeduction: number;
}

export type QuizAnswers = Record<string, boolean | string | number>;

export interface EligibilityResult {
  status: 'ELIGIBLE' | 'TEMPORARILY_BLOCKED' | 'PERMANENTLY_BLOCKED';
  score: number;
  blockType: 'NONE' | 'TEMPORARY' | 'PERMANENT';
  blockReason?: string;
  expiryDate?: Date;
}
