export interface VideoCheckpoint {
  id: string;
  timestamp: number;       // seconds (float)
  tolerance: number;       // ±seconds, default 0.5
  question: string;
  options: string[];       // MCQ display strings, e.g. ["A. 你好！", "B. 你好吗？"]
  correctAnswers: string[]; // subset of options that are correct
  helperContent?: string;  // shown in helper modal when wrong
  lessonLink?: {
    courseId: string;
    lessonId: string;
    label: string;         // e.g. "Bài 1 – Học phần 1"
  };
}

export interface InteractiveVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;        // Cloudinary URL
  thumbnailUrl?: string;
  checkpoints: VideoCheckpoint[];
  order?: number;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InteractiveVideoCreatePayload = Omit<InteractiveVideo, 'id'>;
