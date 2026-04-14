export interface SubmittedAnswer {
  exerciseId: string;
  selected: string | null;
}

export interface SubmittedSection {
  skill: string;
  score: number;
  total: number;
  answers: SubmittedAnswer[];
}

export interface SubmittedExam {
  id: string;
  examId: string;
  examTitle: string;
  participantName: string;
  totalScore: number;
  totalExercises: number;
  sections: SubmittedSection[];
  submittedAt: Date;
  autoSubmitted: boolean;
  isMockTest?: boolean;
  mockTestId?: string;
}
