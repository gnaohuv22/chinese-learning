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
    this.error.set('');

    this.drive.uploadFile(file, file.name, file.type).subscribe({
      next: (response) => {
        this.uploading.set(false);
        this.currentFileId.set(response.fileId);
        this.uploaded.emit(response);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set('Tải lên thất bại: ' + (err?.message ?? 'Lỗi không xác định'));
      },
    });
  }

  clearFile() {
    this.currentFileId.set('');
    this.cleared.emit();
  }
}
