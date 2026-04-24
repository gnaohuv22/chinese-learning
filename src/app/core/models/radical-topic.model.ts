export interface RadicalCharacter {
  hanzi: string;
  pinyin: string;
  definition: string;
}

export interface RadicalTopic {
  id: string;
  title: string;
  description?: string;
  characters: RadicalCharacter[];
  videoUrl?: string;
  published: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RadicalTopicCreatePayload = Omit<RadicalTopic, 'id'>;
