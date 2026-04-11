import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreBaseService } from './firestore-base.service';
import { Lesson, LessonCreatePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class LessonService extends FirestoreBaseService<Lesson> {
  private lessonPath(courseId: string): string {
    return `courses/${courseId}/lessons`;
  }

  getLessons(courseId: string): Observable<Lesson[]> {
    return this.getAll(this.lessonPath(courseId), 'order');
  }

  getLesson(courseId: string, lessonId: string): Observable<Lesson | undefined> {
    return this.getById(this.lessonPath(courseId), lessonId);
  }

  createLesson(courseId: string, data: Omit<LessonCreatePayload, 'courseId'>): Observable<string> {
    return this.create(this.lessonPath(courseId), { ...data, courseId });
  }

  updateLesson(
    courseId: string,
    lessonId: string,
    data: Partial<LessonCreatePayload>
  ): Observable<void> {
    return this.update(this.lessonPath(courseId), lessonId, data);
  }

  deleteLesson(courseId: string, lessonId: string): Observable<void> {
    return this.delete(this.lessonPath(courseId), lessonId);
  }
}
