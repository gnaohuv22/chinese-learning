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
  | 'speaking_record'
  | 'scramble_dnd'
  | 'viet_chinese_translation';

export const SKILL_EXERCISE_TYPES: Record<Skill, ExerciseType[]> = {
  listening: ['audio_mcq', 'dictation', 'interactive_video'],
  speaking: ['speaking_topic', 'speaking_record', 'reflex_speaking'],
  reading: ['mcq', 'scramble', 'scramble_dnd'],
  writing: ['guided_writing', 'viet_chinese_translation']
};

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
