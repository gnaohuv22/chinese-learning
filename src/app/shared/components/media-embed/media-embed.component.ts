import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriveService } from '../../../core/services/drive.service';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-media-embed',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './media-embed.component.html',
})
export class MediaEmbedComponent implements OnInit {
  @Input({ required: true }) fileId!: string;
  @Input() mediaType: 'video' | 'audio' | 'image' = 'video';

  private drive = inject(DriveService);
  private router = inject(Router);

  isMockTest = false;
  hasPlayed = false;
  isEnded = false;
  isPlaying = false;

  get isCloudinary(): boolean {
    return this.fileId.startsWith('http');
  }

  get srcUrl(): string {
    if (this.isCloudinary) return this.fileId;
    return this.drive.getDirectUrl(this.fileId);
  }

  get thumbnailUrl(): string {
    if (this.isCloudinary) {
      // Basic thumbnail replacement for cloudinary urls
      if (this.mediaType === 'image') return this.fileId;
      return this.fileId.replace(/\.[^/.]+$/, '.jpg');
    }
    return this.drive.getThumbnailUrl(this.fileId);
  }

  ngOnInit() {
    this.isMockTest = this.router.url.includes('/thi-thu');
  }

  playMedia(mediaEl: HTMLMediaElement) {
    if (this.isMockTest && this.hasPlayed) return;
    this.hasPlayed = true;
    mediaEl.play();
  }

  onPlay() {
    this.isPlaying = true;
  }

  onPause(mediaEl: HTMLMediaElement) {
    this.isPlaying = false;
    if (this.isMockTest && !this.isEnded) {
      // In mock test, aggressively force resume if paused before ending
      // since there should be no pause allowed
      mediaEl.play();
    }
  }

  onEnded() {
    this.isPlaying = false;
    this.isEnded = true;
  }
}
