import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import HanziWriter from 'hanzi-writer';
import { RadicalTopic } from '../../core/models';
import { RadicalTopicService } from '../../core/services/radical-topic.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-radical-practice',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './radical-practice.component.html',
  styleUrls: ['./radical-practice.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadicalPracticeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('writerSurface') writerSurface?: ElementRef<HTMLDivElement>;
  @ViewChild('writerHost') writerHost?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceVideo') practiceVideo?: ElementRef<HTMLVideoElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private topicService = inject(RadicalTopicService);
  private themeService = inject(ThemeService);
  private destroyRef = inject(DestroyRef);

  topic = signal<RadicalTopic | null>(null);
  loading = signal(true);
  notFound = signal(false);
  videoAspectRatio = signal<number | null>(null);
  currentIndex = signal(0);
  mistakeCount = signal(0);
  completedIndexes = signal<number[]>([]);
  isAnimatingDemo = signal(false);
  isMuted = signal(false);
  isPlaying = signal(false);
  showScrollTop = signal(false);

  private writer: any | null = null;
  private canAdvance = false;
  private quizSessionId = 0;
  private autoNextTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSetupFrame: number | null = null;
  private pendingResizeFrame: number | null = null;
  private writerSurfaceGuards: AbortController | null = null;
  private viewportGuards: AbortController | null = null;
  private scrollUiGuards: AbortController | null = null;
  private writerResizeObserver: ResizeObserver | null = null;
  private loadSessionId = 0;
  private setupSessionId = 0;
  private lastHapticAt = 0;
  private lastCanvasSize = 0;
  private readonly hapticCooldownMs = 120;
  private isDestroyed = false;

  currentCharacter = computed(() => {
    const current = this.topic()?.characters[this.currentIndex()];
    return current ?? null;
  });

  videoMaxHeight = computed(() => {
    const ratio = this.videoAspectRatio();
    if (!ratio) {
      return 'min(34vh, 245px)';
    }
    if (ratio < 0.8) {
      return 'min(60vh, 581px)';
    }
    if (ratio < 1.15) {
      return 'min(49vh, 474px)';
    }
    return 'min(37vh, 330px)';
  });

  constructor() {
    effect(() => {
      this.themeService.isDark();
      if (!this.writer || this.isDestroyed) return;
      this.setupWriter();
    });
  }

  ngAfterViewInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const topicId = params.get('topicId');
      if (!topicId) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.loadTopic(topicId);
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.loadSessionId += 1;
    this.setupSessionId += 1;
    if (this.pendingSetupFrame !== null) {
      cancelAnimationFrame(this.pendingSetupFrame);
      this.pendingSetupFrame = null;
    }
    if (this.pendingResizeFrame !== null) {
      cancelAnimationFrame(this.pendingResizeFrame);
      this.pendingResizeFrame = null;
    }
    this.releaseWriterSurfaceGuards();
    this.releaseViewportGuards();
    this.releaseWriterResizeObserver();
    this.clearAutoNextTimer();
    this.destroyWriter();
  }

  private loadTopic(topicId: string) {
    this.loadSessionId += 1;
    const activeLoadSession = this.loadSessionId;
    this.loading.set(true);
    this.notFound.set(false);
    this.destroyWriter();
    this.topicService
      .getTopic(topicId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (topic) => {
          if (!this.isActiveLoadSession(activeLoadSession)) return;
          if (!topic || !topic.published) {
            this.notFound.set(true);
            this.loading.set(false);
            return;
          }
          this.notFound.set(false);
          this.topic.set(topic);
          this.videoAspectRatio.set(null);
          this.currentIndex.set(0);
          this.mistakeCount.set(0);
          this.completedIndexes.set([]);
          this.loading.set(false);
          requestAnimationFrame(() => {
            this.setupWriter();
          });
        },
        error: () => {
          if (!this.isActiveLoadSession(activeLoadSession)) return;
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
  }

  setupWriter() {
    const character = this.currentCharacter()?.hanzi;
    const surface = this.writerSurface?.nativeElement;
    const host = this.writerHost?.nativeElement;
    if (!character || !host || !surface) return;

    this.destroyWriter();
    this.clearAutoNextTimer();
    this.setupSessionId += 1;
    const activeSetupSession = this.setupSessionId;
    this.registerWriterSurfaceGuards(surface);
    this.registerViewportGuards();
    this.observeWriterSurface(surface);

    this.pendingSetupFrame = requestAnimationFrame(() => {
      this.pendingSetupFrame = null;
      if (!this.isActiveSetupSession(activeSetupSession)) return;
      const canvasSize = this.resolveCanvasSize(host);
      this.lastCanvasSize = canvasSize;

      host.innerHTML = '';
      const palette = this.getWriterPalette();
      this.writer = (HanziWriter as any).create(host, character, {
        width: canvasSize,
        height: canvasSize,
        padding: 8,
        strokeColor: palette.strokeColor,
        outlineColor: palette.outlineColor,
        radicalColor: palette.radicalColor,
        delayBetweenLoops: 250,
      });

      this.startQuiz();
    });
  }

  private startQuiz() {
    if (!this.writer) return;
    this.mistakeCount.set(0);
    this.canAdvance = false;
    this.quizSessionId += 1;
    const activeSessionId = this.quizSessionId;
    const startIndex = this.currentIndex();

    this.writer.quiz({
      leniency: 1.2,
      showHintAfterMisses: 4,
      onMistake: () => {
        if (!this.isActiveQuizSession(activeSessionId, startIndex)) {
          this.telemetry('ignore_stale_mistake_callback', { activeSessionId, startIndex });
          return;
        }
        this.vibrateOnMistake();
        const next = this.mistakeCount() + 1;
        this.mistakeCount.set(next);
        if (next >= 3) {
          this.writer?.showHint?.();
        }
      },
      onComplete: () => {
        if (!this.isActiveQuizSession(activeSessionId, startIndex)) {
          this.telemetry('ignore_stale_complete_callback', { activeSessionId, startIndex });
          return;
        }
        this.canAdvance = true;
        this.completedIndexes.update((list) =>
          list.includes(this.currentIndex()) ? list : [...list, this.currentIndex()]
        );
        this.scheduleAutoNext();
      },
    });
  }

  async playDemo() {
    if (!this.writer || this.isAnimatingDemo()) return;
    this.clearAutoNextTimer();
    this.isAnimatingDemo.set(true);
    this.writer.cancelQuiz?.();
    await this.writer.animateCharacter?.();
    if (this.isDestroyed) return;
    this.isAnimatingDemo.set(false);
    this.startQuiz();
  }

  nextCharacter() {
    if (!this.canAdvance || !this.topic()) return;
    const lastIndex = this.topic()!.characters.length - 1;
    if (this.currentIndex() >= lastIndex) return;
    this.clearAutoNextTimer();
    this.currentIndex.update((i) => i + 1);
    this.setupWriter();
  }

  isCompleted(index: number): boolean {
    return this.completedIndexes().includes(index);
  }

  isLocked(index: number): boolean {
    return index > this.currentIndex();
  }

  togglePlayVideo() {
    const video = this.practiceVideo?.nativeElement;
    if (!video) return;
    if (video.paused) {
      video.play();
      this.isPlaying.set(true);
    } else {
      video.pause();
      this.isPlaying.set(false);
    }
  }

  toggleMute() {
    const video = this.practiceVideo?.nativeElement;
    if (!video) return;
    this.isMuted.update((v) => !v);
    video.muted = this.isMuted();
  }

  onPracticeVideoReady() {
    const video = this.practiceVideo?.nativeElement;
    if (!video) return;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (width > 0 && height > 0) {
      this.videoAspectRatio.set(width / height);
    }
  }

  goBack() {
    this.router.navigate(['/bo-thu']);
  }

  private destroyWriter() {
    this.clearAutoNextTimer();
    this.quizSessionId += 1;
    this.setupSessionId += 1;
    if (this.pendingSetupFrame !== null) {
      cancelAnimationFrame(this.pendingSetupFrame);
      this.pendingSetupFrame = null;
    }
    if (this.pendingResizeFrame !== null) {
      cancelAnimationFrame(this.pendingResizeFrame);
      this.pendingResizeFrame = null;
    }
    this.writer?.cancelQuiz?.();
    this.writer?.destroy?.();
    this.writer = null;
    if (this.writerHost?.nativeElement) {
      this.writerHost.nativeElement.innerHTML = '';
    }
  }

  private scheduleAutoNext() {
    this.clearAutoNextTimer();
    this.autoNextTimer = setTimeout(() => {
      this.autoNextTimer = null;
      if (!this.canAdvance || this.isDestroyed) return;
      this.nextCharacter();
    }, 1200);
  }

  private clearAutoNextTimer() {
    if (!this.autoNextTimer) return;
    clearTimeout(this.autoNextTimer);
    this.autoNextTimer = null;
  }

  private registerWriterSurfaceGuards(surface: HTMLDivElement) {
    this.releaseWriterSurfaceGuards();
    const controller = new AbortController();
    this.writerSurfaceGuards = controller;
    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    surface.addEventListener('touchmove', preventScroll, {
      passive: false,
      signal: controller.signal,
    });
    surface.addEventListener('wheel', preventScroll, {
      passive: false,
      signal: controller.signal,
    });
  }

  private releaseWriterSurfaceGuards() {
    this.writerSurfaceGuards?.abort();
    this.writerSurfaceGuards = null;
  }

  private registerViewportGuards() {
    if (this.viewportGuards || typeof window === 'undefined') {
      return;
    }
    const controller = new AbortController();
    this.viewportGuards = controller;
    const onViewportResize = () => this.scheduleWriterResizeIfNeeded();

    window.addEventListener('resize', onViewportResize, { signal: controller.signal });
    window.addEventListener('orientationchange', onViewportResize, { signal: controller.signal });
  }

  private releaseViewportGuards() {
    this.viewportGuards?.abort();
    this.viewportGuards = null;
  }

  private observeWriterSurface(surface: HTMLDivElement) {
    this.releaseWriterResizeObserver();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.writerResizeObserver = new ResizeObserver(() => {
      this.scheduleWriterResizeIfNeeded();
    });
    this.writerResizeObserver.observe(surface);
  }

  private releaseWriterResizeObserver() {
    this.writerResizeObserver?.disconnect();
    this.writerResizeObserver = null;
  }

  private scheduleWriterResizeIfNeeded() {
    if (this.isDestroyed || !this.writer || this.loading() || this.notFound()) {
      return;
    }
    const host = this.writerHost?.nativeElement;
    if (!host) {
      return;
    }
    const nextSize = this.resolveCanvasSize(host);
    if (Math.abs(nextSize - this.lastCanvasSize) < 1) {
      return;
    }
    if (this.pendingResizeFrame !== null) {
      cancelAnimationFrame(this.pendingResizeFrame);
    }
    this.pendingResizeFrame = requestAnimationFrame(() => {
      this.pendingResizeFrame = null;
      if (this.isDestroyed) {
        return;
      }
      this.setupWriter();
    });
  }

  private resolveCanvasSize(host: HTMLDivElement): number {
    const containerWidth = host.clientWidth || 0;
    const viewportWidth =
      typeof window === 'undefined'
        ? containerWidth
        : (window.visualViewport?.width ?? window.innerWidth);
    const viewportBound = Math.max(220, Math.min(520, viewportWidth - 48));
    const effectiveWidth = containerWidth > 0 ? containerWidth : viewportBound;
    return Math.max(220, Math.min(effectiveWidth, viewportBound));
  }

  private getWriterPalette() {
    if (this.themeService.isDark()) {
      return {
        strokeColor: '#efdcc7',
        outlineColor: '#8e6c47',
        radicalColor: '#f2be69',
      };
    }

    return {
      strokeColor: '#6a3e08',
      outlineColor: '#d9c4ab',
      radicalColor: '#b06b1b',
    };
  }

  private vibrateOnMistake() {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }
    const now = Date.now();
    if (now - this.lastHapticAt < this.hapticCooldownMs) {
      return;
    }
    this.lastHapticAt = now;
    navigator.vibrate(24);
  }

  private isActiveLoadSession(sessionId: number): boolean {
    return !this.isDestroyed && this.loadSessionId === sessionId;
  }

  private isActiveSetupSession(sessionId: number): boolean {
    return !this.isDestroyed && this.setupSessionId === sessionId;
  }

  private isActiveQuizSession(sessionId: number, index: number): boolean {
    return !this.isDestroyed && sessionId === this.quizSessionId && index === this.currentIndex();
  }

  private telemetry(event: string, payload: Record<string, unknown>) {
    // Lightweight diagnostic logs for race-case investigations during practice flow.
    console.debug('[radicals-quiz]', event, payload);
  }
}
