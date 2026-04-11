export interface News {
  id: string;
  title: string;
  content: string;
  mediaUrl?: string;
  publishedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NewsCreatePayload = Omit<News, 'id'>;
