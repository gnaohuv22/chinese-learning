import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockMedia } from '../../../core/models';

@Component({
  selector: 'app-mock-media-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      @for (media of medias; track $index) {
        <div class="relative w-full aspect-square rounded-xl overflow-hidden border bg-gray-50 flex items-center justify-center group" style="background-color: var(--color-bg-surface); border-color: var(--color-border);">
          @if (media.type === 'audio') {
            <div class="flex flex-col items-center justify-center w-full h-full text-gray-400" style="color: var(--color-text-muted);">
              <i class="fa-solid fa-file-audio text-3xl mb-2"></i>
              <span class="text-xs font-medium">Audio</span>
              <!-- Hidden audio element for preview if needed, or rely on media-embed -->
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <button type="button" class="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg" (click)="toggleAudio($event, audioEl)">
                  <i class="fa-solid fa-play"></i>
                </button>
              </div>
              <audio #audioEl [src]="getSrcUrl(media.url)" class="hidden" controls preload="metadata"></audio>
            </div>
          } @else if (media.type === 'image') {
            <img [src]="getSrcUrl(media.url)" class="w-full h-full object-cover" alt="Image preview" />
          } @else if (media.type === 'video') {
            <div class="w-full h-full relative">
              <img [src]="getThumbnailUrl(media.url)" class="w-full h-full object-cover" alt="Video thumbnail" />
              <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                <div class="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <i class="fa-solid fa-play ml-1"></i>
                </div>
              </div>
            </div>
          }
          
          <!-- Delete button (only show if readonly is false) -->
          @if (!readonly) {
            <button type="button" 
                    class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors z-10"
                    (click)="removeMedia.emit($index)">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          }
        </div>
      }
      
      <!-- Empty slots for uploader (if less than max and not readonly) -->
      @if (!readonly && medias.length < maxMedias) {
        @for (empty of [].constructor(maxMedias - medias.length); track $index) {
          <div class="w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
               style="border-color: var(--color-border); color: var(--color-text-muted);"
               (click)="addMediaClick.emit()">
            <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2"></i>
            <span class="text-xs font-medium">Tải lên</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .aspect-square {
      aspect-ratio: 1 / 1;
    }
  `]
})
export class MockMediaGridComponent {
  @Input() medias: MockMedia[] = [];
  @Input() readonly = false;
  @Input() maxMedias = 3;

  @Output() removeMedia = new EventEmitter<number>();
  @Output() addMediaClick = new EventEmitter<void>();

  // Use Cloudinary format if it starts with http, otherwise format it appropriately
  isCloudinary(url: string): boolean {
    return url.startsWith('http');
  }

  getSrcUrl(url: string): string {
    if (this.isCloudinary(url)) return url;
    // Fallback for Drive (should be deprecated, but kept for backward compatibility if old data exists)
    return `https://drive.google.com/uc?export=download&id=${url}`;
  }

  getThumbnailUrl(url: string): string {
    if (this.isCloudinary(url)) {
      return url.replace(/\.[^/.]+$/, '.jpg');
    }
    return `https://drive.google.com/thumbnail?id=${url}`;
  }

  toggleAudio(event: Event, audioEl: HTMLAudioElement) {
    event.stopPropagation();
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  }
}
