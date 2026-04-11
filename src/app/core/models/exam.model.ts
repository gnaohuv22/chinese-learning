export interface ExamSections {
  listening: string[];
  speaking: string[];
  reading: string[];
  writing: string[];
}

export interface Exam {
  id: string;
  title: string;
  sections: ExamSections;
  timeLimitSeconds: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ExamCreatePayload = Omit<Exam, 'id'>;
