import { Injectable } from '@angular/core';
import { FirestoreBaseService } from './firestore-base.service';
import { InteractiveVideo, InteractiveVideoCreatePayload } from '../models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InteractiveVideoService extends FirestoreBaseService<InteractiveVideo> {
  private readonly COLLECTION = 'interactive_videos';

  getAllVideos(): Observable<InteractiveVideo[]> {
    return this.getAll(this.COLLECTION, 'order');
  }

  getPublishedVideos(): Observable<InteractiveVideo[]> {
    return this.getAll(this.COLLECTION, 'order', [
      { field: 'published', op: '==', value: true },
    ]);
  }

  getVideo(id: string): Observable<InteractiveVideo | undefined> {
    return this.getById(this.COLLECTION, id);
  }

  createVideo(data: InteractiveVideoCreatePayload): Observable<string> {
    return this.create(this.COLLECTION, data);
  }

  updateVideo(id: string, data: Partial<InteractiveVideoCreatePayload>): Observable<void> {
    return this.update(this.COLLECTION, id, data);
  }

  deleteVideo(id: string): Observable<void> {
    return this.delete(this.COLLECTION, id);
  }
}
