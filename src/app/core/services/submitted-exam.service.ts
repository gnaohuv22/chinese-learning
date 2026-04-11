import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { FirestoreBaseService } from './firestore-base.service';
import { SubmittedExam } from '../models/submitted-exam.model';

@Injectable({ providedIn: 'root' })
export class SubmittedExamService extends FirestoreBaseService<SubmittedExam> {
  getSubmissions() {
    return this.getAll('submitted_exams', 'submittedAt').pipe(
      map((items) => [...items].reverse())
    );
  }

  submitExam(data: Omit<SubmittedExam, 'id'>) {
    return this.create('submitted_exams', data);
  }

  deleteSubmission(id: string) {
    return this.delete('submitted_exams', id);
  }
}
