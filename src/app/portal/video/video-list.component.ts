import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InteractiveVideoService } from '../../core/services/interactive-video.service';
import { CheckpointStateService } from '../../core/services/checkpoint-state.service';
import { InteractiveVideo } from '../../core/models';

const EMPTY_STATE_SETTLE_MS = 320;

type VideoListViewState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './video-list.component.html',
})
export class VideoListComponent implements OnInit, OnDestroy {
  private videoService = inject(InteractiveVideoService);
  private checkpointState = inject(CheckpointStateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  videos = signal<InteractiveVideo[]>([]);
  viewState = signal<VideoListViewState>('loading');
  private emptyStateTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.videoService
      .getPublishedVideos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vids) => {
          this.videos.set(vids);
          this.resolveViewState(vids.length);
        },
        error: () => {
          this.clearEmptyStateTimer();
          this.viewState.set('error');
        },
      });
  }

  ngOnDestroy() {
    this.clearEmptyStateTimer();
  }

  getProgress(video: InteractiveVideo): { done: number; total: number } {
    const total = video.checkpoints?.length ?? 0;
    const done = this.checkpointState.getCompletedCount(video.id);
    return { done: Math.min(done, total), total };
  }

  getProgressPercent(video: InteractiveVideo): number {
    const { done, total } = this.getProgress(video);
    if (total === 0) return 100;
    return Math.round((done / total) * 100);
  }

  openVideo(videoId: string) {
    this.router.navigate(['/video', videoId]);
  }

  resolveThumbnail(video: InteractiveVideo): string | null {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (!this.isCloudinaryVideoUrl(video.videoUrl)) return null;
    return this.deriveCloudinaryThumbnail(video.videoUrl);
  }

  private resolveViewState(itemCount: number) {
    if (itemCount > 0) {
      this.clearEmptyStateTimer();
      this.viewState.set('ready');
      return;
    }

    if (this.viewState() === 'ready') {
      this.viewState.set('empty');
      return;
    }

    if (this.emptyStateTimer) {
      return;
    }

    this.emptyStateTimer = setTimeout(() => {
      this.emptyStateTimer = null;
      this.viewState.set(this.videos().length === 0 ? 'empty' : 'ready');
    }, EMPTY_STATE_SETTLE_MS);
  }

  private clearEmptyStateTimer() {
    if (this.emptyStateTimer) {
      clearTimeout(this.emptyStateTimer);
      this.emptyStateTimer = null;
    }
  }

  private isCloudinaryVideoUrl(url: string): boolean {
    return /res\.cloudinary\.com/i.test(url) && /\/video\/upload\//i.test(url);
  }

  private deriveCloudinaryThumbnail(url: string): string {
    const withJpgTransform = url.replace('/video/upload/', '/video/upload/f_jpg,q_auto/');
    return withJpgTransform.replace(/\.[^/.?#]+([?#].*)?$/, '.jpg$1');
  }
}
