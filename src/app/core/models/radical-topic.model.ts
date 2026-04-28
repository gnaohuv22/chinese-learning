export interface RadicalCharacter {
  hanzi: string;
  pinyin: string;
  definition: string;
  videoUrl?: string;
}

export interface RadicalTopic {
  id: string;
  title: string;
  description?: string;
  characters: RadicalCharacter[];
  published: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RadicalTopicCreatePayload = Omit<RadicalTopic, 'id'>;
