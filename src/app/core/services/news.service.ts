import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreBaseService } from './firestore-base.service';
import { News, NewsCreatePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class NewsService extends FirestoreBaseService<News> {
  private readonly path = 'news';

  getNewsList(limitCount = 100): Observable<News[]> {
    return this.getOnce(this.path, 'publishedAt:desc', limitCount);
  }

  getNews(id: string): Observable<News | undefined> {
    return this.getById(this.path, id);
  }

  createNews(data: NewsCreatePayload): Observable<string> {
    return this.create(this.path, data);
  }

  updateNews(id: string, data: Partial<NewsCreatePayload>): Observable<void> {
    return this.update(this.path, id, data);
  }

  deleteNews(id: string): Observable<void> {
    return this.delete(this.path, id);
  }
}
