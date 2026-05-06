import { ExerciseType, MediaType } from './exercise.model';
import { Skill } from './lesson.model';
export type HocPhan = 1 | 2 | 3 | 4;

export interface MockMedia {
  url: string;
  type: MediaType;
}

export interface MockTestQuestion {
  id: string;            // nanoid or UUID generated client-side
  type: ExerciseType;
  skill: Skill;
  prompt: string;
  options?: string[];
  answer?: string | string[];
  medias?: MockMedia[];
  mediaUrl?: string; // @deprecated
  mediaType?: MediaType; // @deprecated
}

export interface MockTestSections {
  listening: MockTestQuestion[];
  speaking: MockTestQuestion[];
  reading: MockTestQuestion[];
  writing: MockTestQuestion[];
}

export interface MockTest {
  id: string;
  title: string;
  description: string;
  hocPhan: HocPhan;
  sections: MockTestSections;
  timeLimitSeconds: number;
  createdAt?: Date;
  updatedAt?: Date;
}
export type MockTestCreatePayload = Omit<MockTest, 'id'>;
