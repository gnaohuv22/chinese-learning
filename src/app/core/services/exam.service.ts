import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreBaseService } from './firestore-base.service';
import { Exam, ExamCreatePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class ExamService extends FirestoreBaseService<Exam> {
  private readonly path = 'exams';

  getExams(): Observable<Exam[]> {
    return this.getAll(this.path);
  }

  getExam(id: string): Observable<Exam | undefined> {
    return this.getById(this.path, id);
  }

  createExam(data: ExamCreatePayload): Observable<string> {
    return this.create(this.path, data);
  }

  updateExam(id: string, data: Partial<ExamCreatePayload>): Observable<void> {
    return this.update(this.path, id, data);
  }

  deleteExam(id: string): Observable<void> {
    return this.delete(this.path, id);
  }
}
