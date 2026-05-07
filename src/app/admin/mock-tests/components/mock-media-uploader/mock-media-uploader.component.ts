import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { MockMediaGridComponent } from '../../../../shared/components/mock-media-grid/mock-media-grid.component';
import { MockMedia } from '../../../../core/models';

@Component({
  selector: 'app-mock-media-uploader',
  standalone: true,
  imports: [CommonModule, MockMediaGridComponent],
  template: `
    <div class="space-y-4">
      <app-mock-media-grid
        [medias]="medias"
        [maxMedias]="3"
        (removeMedia)="onRemoveMedia($event)"
        (addMediaClick)="fileInput.click()"
      ></app-mock-media-grid>

      <!-- Hidden file input -->
      <input
        type="file"
        #fileInput
        class="hidden"
        accept="image/*,audio/*"
        (change)="onFileSelected($event)"
      />

      <!-- Progress / Error -->
      @if (uploading()) {
        <div class="flex items-center gap-3 text-sm" style="color: var(--color-primary);">
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style="border-color: var(--color-primary); border-top-color: transparent;"></div>
          <span>Đang tải lên... {{ progress() !== null ? progress() + '%' : '' }}</span>
        </div>
      }
      @if (error()) {
        <p class="text-sm text-red-500 flex items-center gap-1 mt-2">
          <i class="fa-solid fa-triangle-exclamation"></i>
          {{ error() }}
        </p>
      }
    </div>
  `
})
export class MockMediaUploaderComponent {
  @Input() medias: MockMedia[] = [];
  @Output() mediasChange = new EventEmitter<MockMedia[]>();

  private cloudinary = inject(CloudinaryService);

  uploading = signal(false);
  progress = signal<number | null>(null);
  error = signal('');

  onRemoveMedia(index: number) {
    const updated = [...this.medias];
    updated.splice(index, 1);
    this.mediasChange.emit(updated);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.medias.length >= 3) {
      this.error.set('Tối đa 3 file được phép tải lên.');
      input.value = '';
      return;
    }

    // Determine type from MIME type — only image and audio are allowed
    let type: 'audio' | 'image';
    if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else if (file.type.startsWith('image/')) {
      type = 'image';
    } else {
      this.error.set('Chỉ cho phép tải lên ảnh hoặc audio.');
      input.value = '';
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB cap for images/audio
    if (file.size > MAX_SIZE) {
      this.error.set('Kích thước file vượt quá 20MB.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.progress.set(0);
    this.error.set('');

    this.cloudinary.uploadFileWithProgress(file, file.name, file.type).subscribe({
      next: (evt) => {
        this.progress.set(evt.progress);
        if (!evt.response) return;
        
        this.uploading.set(false);
        const updated = [...this.medias, { url: evt.response.fileId, type }];
        this.mediasChange.emit(updated);
        input.value = '';
      },
      error: (err: any) => {
        this.uploading.set(false);
        this.progress.set(null);
        const base = err?.message ?? 'Lỗi không xác định';
        this.error.set('Tải lên thất bại: ' + base);
        input.value = '';
      },
      complete: () => {
        this.progress.set(null);
      }
    });
  }
}
