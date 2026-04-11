export interface Course {
  id: string;
  title: string;
  description: string;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CourseCreatePayload = Omit<Course, 'id'>;
