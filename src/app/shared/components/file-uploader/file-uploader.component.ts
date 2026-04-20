import { Component, EventEmitter, Input, Output, signal, inject, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DriveService, DriveUploadResponse } from '../../../core/services/drive.service';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './file-uploader.component.html',
})
export class FileUploaderComponent implements OnInit, OnChanges {
  @Input() label = 'Chọn file';
  @Input() accept = '*/*';
  @Input() fileId: string | undefined;
  @Input() disabled = false;
  @Output() uploaded = new EventEmitter<DriveUploadResponse>();
  @Output() cleared = new EventEmitter<void>();

  private drive = inject(DriveService);

  uploading = signal(false);
  progress = signal<number | null>(null);
  error = signal('');
  currentFileId = signal('');

  ngOnInit() {
    this.currentFileId.set(this.fileId ?? '');
  }

  ngOnChanges() {
    this.currentFileId.set(this.fileId ?? '');
  }

  onFileSelected(event: Event) {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.progress.set(0);
    this.error.set('');

    this.drive.uploadFileWithProgress(file, file.name, file.type).subscribe({
      next: (event) => {
        this.progress.set(event.progress);
        if (!event.response) return;
        this.uploading.set(false);
        this.currentFileId.set(event.response.fileId);
        this.uploaded.emit(event.response);
        input.value = '';
      },
      error: (err: { status?: number; message?: string; error?: unknown }) => {
        this.uploading.set(false);
        this.progress.set(null);
        const base = err?.message ?? 'Lỗi không xác định';
        const connectionFailed =
          err?.status === 0 ||
          /failed|network|reset|refused|Unknown Error/i.test(String(base));
        const devHint = connectionFailed
          ? ' Chạy API local: `npm run api` trong terminal thứ hai, hoặc dùng `npm run dev` (web + API).'
          : '';
        this.error.set('Tải lên thất bại: ' + base + devHint);
      },
      complete: () => {
        this.progress.set(null);
      },
    });
  }

  clearFile() {
    this.currentFileId.set('');
    this.cleared.emit();
  }
}
