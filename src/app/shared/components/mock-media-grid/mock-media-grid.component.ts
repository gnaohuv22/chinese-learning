import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockMedia } from '../../../core/models';

@Component({
  selector: 'app-mock-media-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="media-grid">
      @for (media of medias; track $index; let mi = $index) {

        <!-- Audio card (admin preview only) -->
        @if (media.type === 'audio' && !hideAudio) {
          <div class="media-cell media-cell--audio" [class.played]="isPlayed(media.url)">
            <i class="fa-solid fa-file-audio audio-icon"></i>
            <span class="audio-label">Audio</span>
            @if (isPlayed(media.url)) {
              <div class="played-overlay">
                <i class="fa-solid fa-check-circle"></i>
                <span>Đã phát</span>
              </div>
            } @else {
              <button type="button" class="audio-play-btn" (click)="playAudio($event, audioEl, media.url)">
                <i class="fa-solid fa-play"></i>
              </button>
            }
            <audio #audioEl [src]="getSrcUrl(media.url)" class="hidden" preload="metadata"></audio>
            @if (!readonly) {
              <button type="button" class="delete-btn" (click)="removeMedia.emit(mi)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            }
          </div>
        }

        <!-- Image — scales from its own position on hover (no overlay, no flicker) -->
        @if (media.type === 'image') {
          <div class="media-cell media-cell--image">
            <img [src]="getSrcUrl(media.url)" class="media-img" alt="Image" loading="lazy" />
            @if (!readonly) {
              <button type="button" class="delete-btn" (click)="removeMedia.emit(mi)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            }
          </div>
        }

        <!-- Video -->
        @if (media.type === 'video') {
          <div class="media-cell media-cell--image">
            <img [src]="getThumbnailUrl(media.url)" class="media-img" alt="Video thumbnail" />
            <div class="video-overlay">
              <div class="video-play-icon"><i class="fa-solid fa-play"></i></div>
            </div>
            @if (!readonly) {
              <button type="button" class="delete-btn" (click)="removeMedia.emit(mi)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            }
          </div>
        }
      }

      <!-- Empty upload slots (admin) -->
      @if (!readonly && medias.length < maxMedias) {
        @for (s of emptySlots(); track $index) {
          <div class="upload-slot" (click)="addMediaClick.emit()">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Tải lên</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      /* Must be visible so hover-scaled images bleed outside the host bounds */
      overflow: visible;
    }

    /* ── Grid ── */
    .media-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-start;
      overflow: visible;
    }

    /* ── Generic cell ── */
    .media-cell {
      position: relative;
      border-radius: 10px;
      flex-shrink: 0;
      overflow: visible; /* critical: let scaled image escape bounds */
    }

    /* ── Audio cell ── */
    .media-cell--audio {
      width: 110px; height: 110px;
      border: 1px solid var(--color-border);
      background: var(--color-bg-surface);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 6px; color: var(--color-text-muted);
      transition: opacity 0.2s;
      border-radius: 10px;
      overflow: hidden;
      &.played { opacity: 0.55; }
    }

    .audio-icon { font-size: 2rem; }
    .audio-label { font-size: 0.72rem; font-weight: 500; }

    .audio-play-btn {
      position: absolute; inset: 0;
      border-radius: 10px; border: none; background: transparent;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.2s;
      i { opacity: 0; transition: opacity 0.2s; font-size: 1.4rem; color: #fff; }
      &:hover { background: rgba(0,0,0,0.45); i { opacity: 1; } }
    }

    .played-overlay {
      position: absolute; inset: 0; border-radius: 10px;
      background: rgba(0,0,0,0.38);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
      color: #fff; pointer-events: none;
      i { font-size: 1.4rem; color: #4ade80; }
      span { font-size: 0.65rem; font-weight: 600; }
    }

    /* ── Image cell ── */
    .media-cell--image {
      /* No fixed size — image defines dimensions */
      max-width: min(340px, 100%);
      overflow: visible; /* allow scaled image to float above siblings */
    }

    /* ─── The image itself ──────────────────────────────────────
       Pure-CSS hover scale: grows from its own center position.
       No JS, no overlay, no flicker.
       z-index elevates it above sibling question cards.
    ─────────────────────────────────────────────────────────── */
    .media-img {
      display: block;
      max-width: 100%;
      max-height: 260px;
      width: auto; height: auto;
      object-fit: contain;
      border-radius: 10px;
      cursor: zoom-in;

      /* Base state */
      position: relative;
      z-index: 1;
      transform: scale(1);
      transform-origin: center center;
      transition:
        transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
        box-shadow 0.28s ease,
        z-index 0s;

      /* Floating above on hover — no dimming, no backdrop */
      &:hover {
        transform: scale(2.2);
        z-index: 200;
        box-shadow:
          0 12px 40px rgba(0, 0, 0, 0.45),
          0 4px 12px rgba(0, 0, 0, 0.25);
        border-radius: 12px;
        cursor: zoom-out;
      }
    }

    /* ── Video overlay ── */
    .video-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.18); border-radius: 10px;
    }
    .video-play-icon {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.9);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      i { margin-left: 3px; color: #222; }
    }

    /* ── Delete button ── */
    .delete-btn {
      position: absolute; top: 6px; right: 6px;
      width: 24px; height: 24px; border-radius: 50%;
      background: #ef4444; color: #fff; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 10; font-size: 0.7rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: background 0.15s;
      &:hover { background: #dc2626; }
    }

    /* ── Upload slot ── */
    .upload-slot {
      width: 110px; height: 110px; border-radius: 10px;
      border: 2px dashed var(--color-border);
      color: var(--color-text-muted);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; font-size: 0.72rem; font-weight: 500;
      transition: background 0.15s, border-color 0.15s;
      i { font-size: 1.4rem; }
      &:hover { background: var(--color-bg-surface); border-color: var(--color-primary); }
    }

    .hidden { display: none; }
  `]
})
export class MockMediaGridComponent {
  @Input() medias: MockMedia[] = [];
  @Input() readonly = false;
  @Input() maxMedias = 3;
  @Input() hideAudio = false;
  @Input() disabledAudioUrls: Set<string> = new Set();

  @Output() removeMedia = new EventEmitter<number>();
  @Output() addMediaClick = new EventEmitter<void>();
  @Output() audioPlayed = new EventEmitter<string>();

  emptySlots(): number[] {
    return Array.from({ length: Math.max(0, this.maxMedias - this.medias.length) });
  }

  isPlayed(url: string): boolean {
    return this.disabledAudioUrls.has(url);
  }

  isCloudinary(url: string): boolean { return url.startsWith('http'); }

  getSrcUrl(url: string): string {
    return this.isCloudinary(url) ? url : `https://drive.google.com/uc?export=download&id=${url}`;
  }

  getThumbnailUrl(url: string): string {
    return this.isCloudinary(url) ? url.replace(/\.[^/.]+$/, '.jpg') : `https://drive.google.com/thumbnail?id=${url}`;
  }

  playAudio(event: Event, audioEl: HTMLAudioElement, url: string) {
    event.stopPropagation();
    if (this.isPlayed(url)) return;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    this.audioPlayed.emit(url);
  }
}
