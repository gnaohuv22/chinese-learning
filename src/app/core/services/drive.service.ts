import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DriveUploadResponse {
  fileId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

@Injectable({ providedIn: 'root' })
export class DriveService {
  private http = inject(HttpClient);

  uploadFile(
    file: File | Blob,
    filename: string,
    mimeType: string
  ): Observable<DriveUploadResponse> {
    return this.uploadFileWithProgress(file, filename, mimeType).pipe(
      filter((e): e is { progress: number; response: DriveUploadResponse } => !!e.response),
      map((e) => e.response)
    );
  }

  uploadFileWithProgress(
    file: File | Blob,
    filename: string,
    mimeType: string
  ): Observable<{ progress: number; response?: DriveUploadResponse }> {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('filename', filename);
    formData.append('mimeType', mimeType);

    const req = new HttpRequest('POST', environment.driveUploadUrl, formData, {
      reportProgress: true,
    });

    return this.http.request<DriveUploadResponse>(req).pipe(
      map((event: HttpEvent<DriveUploadResponse>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          return { progress };
        }
        if (event.type === HttpEventType.Response) {
          return { progress: 100, response: event.body as DriveUploadResponse };
        }
        return { progress: 0 };
      })
    );
  }

  deleteFile(fileId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.driveDeleteUrl}?fileId=${fileId}`
    );
  }

  getEmbedUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  getThumbnailUrl(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}`;
  }

  getDirectUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
}
