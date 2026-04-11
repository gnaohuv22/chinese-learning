import { Component, Input, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';

@Component({
  selector: 'app-exercise-speaking-topic',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './speaking-topic.component.html',
})
export class SpeakingTopicComponent implements OnDestroy {
  @Input({ required: true }) exercise!: Exercise;

  started = signal(false);
  timeOver = signal(false);
  timeLeft = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  get duration(): number {
    return this.exercise.durationSeconds ?? 60;
  }

  progressPercent(): number {
    return (this.timeLeft() / this.duration) * 100;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  start() {
    this.timeLeft.set(this.duration);
    this.started.set(true);
    this.timeOver.set(false);

    this.intervalId = setInterval(() => {
      this.timeLeft.update((t) => {
        if (t <= 1) {
          this.stop();
          this.timeOver.set(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.started.set(false);
    this.timeOver.set(false);
    this.timeLeft.set(0);
  }

  ngOnDestroy() {
    this.stop();
  }
}
