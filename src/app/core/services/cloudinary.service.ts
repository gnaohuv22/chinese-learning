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

export interface CloudinaryUploadResponse {
  fileId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private http = inject(HttpClient);

  uploadFile(
    file: File | Blob,
    filename: string,
    mimeType: string
  ): Observable<CloudinaryUploadResponse> {
    return this.uploadFileWithProgress(file, filename, mimeType).pipe(
      filter((e): e is { progress: number; response: CloudinaryUploadResponse } => !!e.response),
      map((e) => e.response)
    );
  }

  uploadFileWithProgress(
    file: File | Blob,
    filename: string,
    mimeType: string
  ): Observable<{ progress: number; response?: CloudinaryUploadResponse }> {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('filename', filename);
    formData.append('mimeType', mimeType);

    const req = new HttpRequest('POST', environment.cloudinaryUploadUrl, formData, {
      reportProgress: true,
    });

    return this.http.request<CloudinaryUploadResponse>(req).pipe(
      map((event: HttpEvent<CloudinaryUploadResponse>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          return { progress };
        }
        if (event.type === HttpEventType.Response) {
          return { progress: 100, response: event.body as CloudinaryUploadResponse };
        }
        return { progress: 0 };
      })
    );
  }

  deleteFile(fileId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.cloudinaryDeleteUrl}?fileId=${fileId}`
    );
  }
}
