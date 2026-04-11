import { Component, Input, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { DriveService } from '../../../core/services/drive.service';

@Component({
  selector: 'app-exercise-video',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './video-exercise.component.html',
})
export class VideoExerciseComponent implements OnDestroy {
  @Input({ required: true }) exercise!: Exercise;

  showPromptOverlay = signal(false);
  silenceProgress = signal(100);
  private silenceInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private drive: DriveService) {}

  get embedUrl(): string {
    return this.exercise.mediaUrl
      ? this.drive.getEmbedUrl(this.exercise.mediaUrl)
      : '';
  }

  get directUrl(): string {
    return this.exercise.mediaUrl
      ? this.drive.getDirectUrl(this.exercise.mediaUrl)
      : '';
  }

  triggerOverlay() {
    this.showPromptOverlay.set(true);
    const duration = this.exercise.durationSeconds ?? 30;
    this.silenceProgress.set(100);

    this.silenceInterval = setInterval(() => {
      this.silenceProgress.update((p) => {
        const next = p - 100 / duration;
        if (next <= 0) {
          this.clearInterval();
          this.showPromptOverlay.set(false);
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  dismissOverlay() {
    this.clearInterval();
    this.showPromptOverlay.set(false);
  }

  private clearInterval() {
    if (this.silenceInterval) {
      clearInterval(this.silenceInterval);
      this.silenceInterval = null;
    }
  }

  ngOnDestroy() {
    this.clearInterval();
  }
}
