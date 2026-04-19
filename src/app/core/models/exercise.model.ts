import { Skill } from './lesson.model';

export type ExerciseType =
  | 'mcq'
  | 'scramble'
  | 'guided_writing'
  | 'speaking_topic'
  | 'reflex_speaking'
  | 'audio_mcq'
  | 'dictation'
  | 'interactive_video'
  | 'speaking_record';

export type MediaType = 'video' | 'audio' | 'image';

export interface Exercise {
  id: string;
  lessonId: string;
  courseId: string;
  type: ExerciseType;
  skill: Skill;
  prompt: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  options?: string[];
  answer?: string | string[];
  keywords?: string[];
  outline?: string[];
  durationSeconds?: number;
  order?: number;
  shuffle?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ExerciseCreatePayload = Omit<Exercise, 'id'>;
