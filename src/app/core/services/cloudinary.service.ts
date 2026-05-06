import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { map, filter, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryUploadResponse {
  fileId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

interface CloudinarySignResponse {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
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
    return this.http.post<CloudinarySignResponse>(environment.cloudinarySignUrl, {}).pipe(
      switchMap((signData) => {
        const formData = new FormData();
        formData.append('file', file, filename);
        formData.append('api_key', signData.api_key);
        formData.append('timestamp', signData.timestamp.toString());
        formData.append('signature', signData.signature);

        const req = new HttpRequest(
          'POST',
          `https://api.cloudinary.com/v1_1/${signData.cloud_name}/auto/upload`,
          formData,
          { reportProgress: true }
        );

        return this.http.request<any>(req).pipe(
          map((event: HttpEvent<any>) => {
            if (event.type === HttpEventType.UploadProgress) {
              const total = event.total ?? 0;
              const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
              return { progress };
            }
            if (event.type === HttpEventType.Response) {
              const body = event.body;
              return {
                progress: 100,
                response: {
                  fileId: body.secure_url,
                  embedUrl: body.secure_url,
                  thumbnailUrl: body.secure_url.replace(/\.[^/.]+$/, '.jpg'),
                },
              };
            }
            return { progress: 0 };
          })
        );
      })
    );
  }

  deleteFile(fileId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.cloudinaryDeleteUrl}?fileId=${fileId}`
    );
  }
}
