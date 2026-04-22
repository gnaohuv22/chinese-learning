import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { InteractiveVideoService } from '../../core/services/interactive-video.service';
import { CheckpointStateService } from '../../core/services/checkpoint-state.service';
import { InteractiveVideo } from '../../core/models';

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './video-list.component.html',
})
export class VideoListComponent implements OnInit {
  private videoService = inject(InteractiveVideoService);
  private checkpointState = inject(CheckpointStateService);
  private router = inject(Router);

  videos = signal<InteractiveVideo[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.videoService.getPublishedVideos().subscribe({
      next: (vids) => {
        this.videos.set(vids);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
}
