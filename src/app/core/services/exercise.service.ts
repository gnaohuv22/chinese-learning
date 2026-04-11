import { Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreBaseService } from './firestore-base.service';
import { Exercise, ExerciseCreatePayload } from '../models';
import { Skill } from '../models/lesson.model';

@Injectable({ providedIn: 'root' })
export class ExerciseService extends FirestoreBaseService<Exercise> {
  private exercisePath(courseId: string, lessonId: string): string {
    return `courses/${courseId}/lessons/${lessonId}/exercises`;
  }

  getExercises(courseId: string, lessonId: string): Observable<Exercise[]> {
    return this.getAll(this.exercisePath(courseId, lessonId), 'order');
  }

  getExercisesBySkill(
    courseId: string,
    lessonId: string,
    skill: Skill
  ): Observable<Exercise[]> {
    return this.getAll(this.exercisePath(courseId, lessonId), 'order', [
      { field: 'skill', op: '==', value: skill },
    ]);
  }

  getExercise(
    courseId: string,
    lessonId: string,
    exerciseId: string
  ): Observable<Exercise | undefined> {
    return this.getById(this.exercisePath(courseId, lessonId), exerciseId);
  }

  /** Fetch an exercise by its flat ID (for exam question loading). */
  getFlatExercise(exerciseId: string): Observable<Exercise | undefined> {
    return this.getById('exercises', exerciseId);
  }

  createExercise(
    courseId: string,
    lessonId: string,
    data: Omit<ExerciseCreatePayload, 'courseId' | 'lessonId'>
  ): Observable<string> {
    const nestedPath = this.exercisePath(courseId, lessonId);
    const payload = { ...data, courseId, lessonId };

    return new Observable<string>((subscriber) => {
      addDoc(collection(db, nestedPath), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
        .then(async (docRef) => {
          // Dual-write to flat exercises collection for exam lookups
          await setDoc(
            doc(db, 'exercises', docRef.id),
            { ...payload, id: docRef.id, updatedAt: serverTimestamp() },
            { merge: true }
          );
          subscriber.next(docRef.id);
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }

  updateExercise(
    courseId: string,
    lessonId: string,
    exerciseId: string,
    data: Partial<ExerciseCreatePayload>
  ): Observable<void> {
    const nested$ = this.update(
      this.exercisePath(courseId, lessonId),
      exerciseId,
      data
    );

    return new Observable<void>((subscriber) => {
      const flatRef = doc(db, 'exercises', exerciseId);
      nested$.subscribe({
        next: () => {
          updateDoc(flatRef, {
            ...(data as object),
            updatedAt: serverTimestamp(),
          })
            .then(() => { subscriber.next(); subscriber.complete(); })
            .catch((err) => subscriber.error(err));
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  deleteExercise(
    courseId: string,
    lessonId: string,
    exerciseId: string
  ): Observable<void> {
    const nested$ = this.delete(
      this.exercisePath(courseId, lessonId),
      exerciseId
    );

    return new Observable<void>((subscriber) => {
      nested$.subscribe({
        next: () => {
          deleteDoc(doc(db, 'exercises', exerciseId))
            .then(() => { subscriber.next(); subscriber.complete(); })
            .catch(() => { subscriber.next(); subscriber.complete(); }); // Ignore flat delete errors
        },
        error: (err) => subscriber.error(err),
      });
    });
  }
}
