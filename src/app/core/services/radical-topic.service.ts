import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreBaseService } from './firestore-base.service';
import { RadicalTopic, RadicalTopicCreatePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class RadicalTopicService extends FirestoreBaseService<RadicalTopic> {
  private readonly COLLECTION = 'radical_topics';
  private readonly MIN_CHARACTERS = 1;
  private readonly MAX_CHARACTERS = 10;

  getAllTopics(): Observable<RadicalTopic[]> {
    return this.getAll(this.COLLECTION, 'order');
  }

  getPublishedTopics(): Observable<RadicalTopic[]> {
    // Avoid composite-index dependency (published + order) by sorting client-side.
    return this.getAll(this.COLLECTION, undefined, [{ field: 'published', op: '==', value: true }]).pipe(
      map((topics) => [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    );
  }

  getTopic(id: string): Observable<RadicalTopic | undefined> {
    return this.getById(this.COLLECTION, id);
  }

  createTopic(data: RadicalTopicCreatePayload): Observable<string> {
    return this.create(this.COLLECTION, this.normalizePayload(data));
  }

  updateTopic(id: string, data: Partial<RadicalTopicCreatePayload>): Observable<void> {
    return this.update(this.COLLECTION, id, this.normalizePayload(data));
  }

  deleteTopic(id: string): Observable<void> {
    return this.delete(this.COLLECTION, id);
  }

  private normalizePayload<T extends Partial<RadicalTopicCreatePayload>>(payload: T): T {
    const sanitized = { ...payload } as Record<string, unknown>;

    // Firestore rejects undefined field values on create/update.
    Object.keys(sanitized).forEach((key) => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    if (typeof sanitized['videoUrl'] === 'string' && !(sanitized['videoUrl'] as string).trim()) {
      delete sanitized['videoUrl'];
    }

    if (!Array.isArray(sanitized['characters'])) {
      return sanitized as T;
    }

    const characters = (sanitized['characters'] as RadicalTopicCreatePayload['characters'])
      .map((char) => ({
        hanzi: (char.hanzi ?? '').trim(),
        pinyin: (char.pinyin ?? '').trim(),
        definition: (char.definition ?? '').trim(),
      }))
      .filter((char) => char.hanzi && char.pinyin && char.definition)
      .slice(0, this.MAX_CHARACTERS);

    if (characters.length < this.MIN_CHARACTERS) {
      throw new Error('Radical topic must contain at least one character.');
    }

    return { ...sanitized, characters } as T;
  }
}
