import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('filename', filename);
    formData.append('mimeType', mimeType);
    return this.http.post<DriveUploadResponse>(
      environment.driveUploadUrl,
      formData
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
