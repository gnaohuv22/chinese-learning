import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  inject,
  OnInit,
  OnChanges,
  OnDestroy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DriveService, DriveUploadResponse } from '../../../core/services/drive.service';

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './file-uploader.component.html',
})
export class FileUploaderComponent implements OnInit, OnChanges, OnDestroy {
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
  showPreview = signal(false);

  /** Blob URL created from the locally selected file — for in-browser preview. */
  previewBlobUrl = signal('');

  /** True when we have a fileId from a previous upload but no local blob (edit mode). */
  hasRemoteFile = computed(() => !!this.currentFileId() && !this.previewBlobUrl());

  ngOnInit() {
    this.currentFileId.set(this.fileId ?? '');
  }

  ngOnChanges() {
    this.currentFileId.set(this.fileId ?? '');
    // If cleared externally, collapse preview
    if (!this.fileId) {
      this.revokeBlob();
      this.showPreview.set(false);
    }
  }

  ngOnDestroy() {
    this.revokeBlob();
  }

  onFileSelected(event: Event) {
    if (this.disabled) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      this.error.set('admin.error_file_too_large');
      input.value = '';
      return;
    }

    // Create a local blob URL for preview
    this.revokeBlob();
    this.previewBlobUrl.set(URL.createObjectURL(file));
    this.showPreview.set(false);

    this.uploading.set(true);
    this.progress.set(0);
    this.error.set('');

    this.drive.uploadFileWithProgress(file, file.name, file.type).subscribe({
      next: (evt) => {
        this.progress.set(evt.progress);
        if (!evt.response) return;
        this.uploading.set(false);
        this.currentFileId.set(evt.response.fileId);
        this.uploaded.emit(evt.response);
        input.value = '';
      },
      error: (err: { status?: number; message?: string; error?: unknown }) => {
        this.uploading.set(false);
        this.progress.set(null);
        this.revokeBlob();
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
    this.revokeBlob();
    this.currentFileId.set('');
    this.showPreview.set(false);
    this.cleared.emit();
  }

  togglePreview() {
    this.showPreview.update((v) => !v);
  }

  private revokeBlob() {
    const url = this.previewBlobUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewBlobUrl.set('');
    }
  }
}
