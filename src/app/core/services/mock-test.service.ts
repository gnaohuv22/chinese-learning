import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreBaseService } from './firestore-base.service';
import { MockTest, MockTestCreatePayload, HocPhan } from '../models';

@Injectable({ providedIn: 'root' })
export class MockTestService extends FirestoreBaseService<MockTest> {
  private readonly path = 'mockTests';

  getMockTests(): Observable<MockTest[]> {
    return this.getAll(this.path, 'createdAt');
  }

  getMockTestsByHocPhan(hocPhan: HocPhan): Observable<MockTest[]> {
    return this.getAll(this.path, undefined, [
      { field: 'hocPhan', op: '==', value: hocPhan },
    ]);
  }

  getMockTest(id: string): Observable<MockTest | undefined> {
    return this.getById(this.path, id);
  }

  createMockTest(data: MockTestCreatePayload): Observable<string> {
    return this.create(this.path, data);
  }

  updateMockTest(id: string, data: Partial<MockTestCreatePayload>): Observable<void> {
    return this.update(this.path, id, data);
  }

  deleteMockTest(id: string): Observable<void> {
    return this.delete(this.path, id);
  }

  /** Count exercises across all sections */
  totalExercises(test: MockTest): number {
    return (
      test.sections.listening.length +
      test.sections.speaking.length +
      test.sections.reading.length +
      test.sections.writing.length
    );
  }
}
