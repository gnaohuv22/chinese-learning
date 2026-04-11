export type Skill = 'listening' | 'speaking' | 'reading' | 'writing';

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  order: number;
  skills: Skill[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type LessonCreatePayload = Omit<Lesson, 'id'>;
