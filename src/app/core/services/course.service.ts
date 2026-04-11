import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreBaseService } from './firestore-base.service';
import { Course, CourseCreatePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class CourseService extends FirestoreBaseService<Course> {
  private readonly path = 'courses';

  getCourses(): Observable<Course[]> {
    return this.getAll(this.path, 'order');
  }

  getCourse(id: string): Observable<Course | undefined> {
    return this.getById(this.path, id);
  }

  createCourse(data: CourseCreatePayload): Observable<string> {
    return this.create(this.path, data);
  }

  updateCourse(id: string, data: Partial<CourseCreatePayload>): Observable<void> {
    return this.update(this.path, id, data);
  }

  deleteCourse(id: string): Observable<void> {
    return this.delete(this.path, id);
  }
}
