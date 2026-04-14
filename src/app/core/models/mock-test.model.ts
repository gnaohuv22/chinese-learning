export type HocPhan = 1 | 2 | 3 | 4;

export interface MockTestSections {
  listening: string[];
  speaking: string[];
  reading: string[];
  writing: string[];
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
