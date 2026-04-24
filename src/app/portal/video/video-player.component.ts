import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InteractiveVideoService } from '../../core/services/interactive-video.service';
import { CheckpointStateService } from '../../core/services/checkpoint-state.service';
import { VideoModalService } from '../../core/services/video-modal.service';
import { InteractiveVideo, VideoCheckpoint } from '../../core/models';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './video-player.component.html',
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoService = inject(InteractiveVideoService);
  private checkpointState = inject(CheckpointStateService);
  readonly videoModal = inject(VideoModalService);
  private destroyRef = inject(DestroyRef);

  videoData = signal<InteractiveVideo | null>(null);
  loading = signal(true);
  notFound = signal(false);

  // Player state
  isLocked = false;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  isMuted = false;
  videoAspectRatio = signal<number | null>(null);

  videoMaxHeight = computed(() => {
    const ratio = this.videoAspectRatio();
    if (!ratio) {
      return 'min(72vh, 760px)';
    }
    if (ratio < 0.8) {
      return 'min(86vh, 980px)';
    }
    if (ratio < 1.15) {
      return 'min(78vh, 860px)';
    }
    return 'min(72vh, 760px)';
  });

  // Checkpoint state
  completedCheckpoints = new Set<string>();
  private lastTriggeredId: string | null = null;
  private lockedAtTime = 0;

  currentCheckpoint: VideoCheckpoint | null = null;
  selectedOption: string | null = null;
  answerResult: 'correct' | 'wrong' | null = null;

  private nativeListeners: Array<() => void> = [];

  ngOnInit() {
    this.videoModal.registerHandlers({
      onSelectOption: (option) => this.selectOption(option),
      onConfirmAnswer: () => this.confirmAnswer(),
      onRetryQuestion: () => this.retryQuestion(),
      onHelperContinue: () => this.onHelperContinue(),
      onCloseInfo: () => this.closeInfoModal(),
      onResetProgress: () => {
        this.resetProgress();
        this.closeInfoModal();
      },
    });

    const id = this.route.snapshot.paramMap.get('videoId')!;
    this.videoService
      .getVideo(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vid) => {
          if (!vid || !vid.published) {
            this.notFound.set(true);
            this.loading.set(false);
            return;
          }
          this.videoData.set(vid);
          this.videoAspectRatio.set(null);
          this.completedCheckpoints = this.checkpointState.getCompleted(vid.id);
          this.loading.set(false);
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
  }

  ngAfterViewInit() {
    // Attach after video element is rendered (guarded by loading signal)
  }

  private attachNativeListeners() {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    // Clear existing to prevent double binding
    this.nativeListeners.forEach((fn) => fn());
    this.nativeListeners = [];

    const onPlay = () => {
      if (this.isLocked) {
        video.pause();
      }
    };
    const onSeeked = () => {
      if (this.isLocked) {
        video.currentTime = this.lockedAtTime;
      }
    };
    const onFullscreenChange = () => {
      if (this.isLocked && document.fullscreenElement === video) {
        document.exitFullscreen?.();
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('seeked', onSeeked);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    this.nativeListeners.push(
      () => video.removeEventListener('play', onPlay),
      () => video.removeEventListener('seeked', onSeeked),
      () =>
        document.removeEventListener('fullscreenchange', onFullscreenChange)
    );
  }

  ngOnDestroy() {
    this.nativeListeners.forEach((fn) => fn());
    this.videoModal.clearHandlers();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.isLocked) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Global shortcuts when not locked
    if (!this.isLocked && event.code === 'Space') {
      event.preventDefault();
      this.togglePlay();
    }
  }

  // Called from template once video metadata loads
  onVideoReady() {
    this.attachNativeListeners();
    const video = this.videoRef.nativeElement;
    this.duration = video.duration || 0;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (width > 0 && height > 0) {
      this.videoAspectRatio.set(width / height);
    }
  }

  onTimeUpdate() {
    if (this.isLocked) return;
    const video = this.videoRef.nativeElement;
    this.currentTime = video.currentTime;

    const vid = this.videoData();
    if (!vid) return;

    const checkpoint = this.findTriggerable(video.currentTime, vid.checkpoints ?? []);
    if (checkpoint && checkpoint.id !== this.lastTriggeredId) {
      this.lastTriggeredId = checkpoint.id;
      this.triggerCheckpoint(checkpoint);
    }
  }

  private findTriggerable(currentTime: number, checkpoints: VideoCheckpoint[]): VideoCheckpoint | null {
    return checkpoints.find((cp) => {
      if (this.completedCheckpoints.has(cp.id)) return false;
      return Math.abs(currentTime - cp.timestamp) <= (cp.tolerance ?? 0.5);
    }) ?? null;
  }

  private triggerCheckpoint(checkpoint: VideoCheckpoint) {
    const video = this.videoRef.nativeElement;
    this.lockedAtTime = video.currentTime;
    video.pause();
    this.isLocked = true;
    this.isPlaying = false;
    this.currentCheckpoint = checkpoint;
    this.selectedOption = null;
    this.answerResult = null;
    this.videoModal.openQuestion(checkpoint, this.selectedOption, this.answerResult);
  }

  selectOption(option: string) {
    if (this.selectedOption !== null) return; // already answered
    this.selectedOption = option;
    const cp = this.currentCheckpoint!;
    const isCorrect = cp.correctAnswers.some(
      (ans) => ans.trim().toLowerCase() === option.trim().toLowerCase()
    );
    this.answerResult = isCorrect ? 'correct' : 'wrong';
    this.videoModal.updateQuestionResult(this.selectedOption, this.answerResult);
  }

  confirmAnswer() {
    if (!this.currentCheckpoint || !this.selectedOption) return;
    if (this.answerResult === 'correct') {
      this.markDone(this.currentCheckpoint.id);
      this.videoModal.close();
      this.isLocked = false;
      this.lastTriggeredId = null;
      this.videoRef.nativeElement.play();
      this.isPlaying = true;
    } else {
      this.videoModal.openHelper(this.currentCheckpoint);
    }
  }

  retryQuestion() {
    this.selectedOption = null;
    this.answerResult = null;
    if (this.currentCheckpoint) {
      this.videoModal.openQuestion(this.currentCheckpoint, this.selectedOption, this.answerResult);
    }
  }

  onHelperContinue() {
    if (this.currentCheckpoint) this.markDone(this.currentCheckpoint.id);
    this.videoModal.close();
    this.isLocked = false;
    this.lastTriggeredId = null;
    this.videoRef.nativeElement.play();
    this.isPlaying = true;
  }

  private markDone(id: string) {
    const vid = this.videoData();
    if (!vid) return;
    this.completedCheckpoints.add(id);
    this.completedCheckpoints = new Set(this.completedCheckpoints);
    this.checkpointState.markDone(vid.id, id);
  }

  resetProgress() {
    const vid = this.videoData();
    if (!vid) return;
    this.checkpointState.reset(vid.id);
    this.completedCheckpoints = new Set();
  }

  openInfoModal() {
    this.videoModal.openInfo(this.completedCheckpoints.size > 0);
    if (!this.isLocked && !this.videoRef.nativeElement.paused) {
      this.togglePlay(); // Pause while reading info
    }
  }

  closeInfoModal() {
    this.videoModal.close();
  }

  togglePlay() {
    if (this.isLocked) return;
    const video = this.videoRef.nativeElement;
    if (video.paused) {
      video.play();
      this.isPlaying = true;
    } else {
      video.pause();
      this.isPlaying = false;
    }
  }

  onSeek(event: Event) {
    if (this.isLocked) return;
    const val = +(event.target as HTMLInputElement).value;
    this.videoRef.nativeElement.currentTime = val;
    this.currentTime = val;
  }

  onVolumeChange(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    this.volume = val;
    this.videoRef.nativeElement.volume = val;
    this.isMuted = val === 0;
  }

  toggleMute() {
    const video = this.videoRef.nativeElement;
    this.isMuted = !this.isMuted;
    video.muted = this.isMuted;
    if (!this.isMuted && this.volume === 0) {
      this.volume = 1;
      video.volume = 1;
    }
  }

  onEnded() {
    this.isPlaying = false;
  }

  onPlay() {
    this.isPlaying = true;
  }

  onPause() {
    if (!this.isLocked) {
      this.isPlaying = false;
    }
  }

  onDurationChange() {
    this.duration = this.videoRef?.nativeElement?.duration ?? 0;
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getProgressPercent(): number {
    const vid = this.videoData();
    if (!vid?.checkpoints?.length) return 0;
    const done = [...this.completedCheckpoints].filter((id) =>
      vid.checkpoints.some((cp) => cp.id === id)
    ).length;
    return Math.round((done / vid.checkpoints.length) * 100);
  }

  getCompletedCount(): number {
    const vid = this.videoData();
    if (!vid?.checkpoints?.length) return 0;
    return [...this.completedCheckpoints].filter((id) =>
      vid.checkpoints.some((cp) => cp.id === id)
    ).length;
  }

  goBack() {
    this.router.navigate(['/video']);
  }
}
