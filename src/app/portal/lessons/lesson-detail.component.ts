import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LessonService } from '../../core/services/lesson.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { Lesson, Exercise } from '../../core/models';
import { ExerciseRendererComponent } from '../../shared/exercises/exercise-renderer.component';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule, ExerciseRendererComponent],
  templateUrl: './lesson-detail.component.html',
  styleUrl: './lesson-detail.component.scss',
})
export class LessonDetailComponent implements OnInit {
  @Input({ required: true }) courseId!: string;
  @Input({ required: true }) lessonId!: string;

  private lessonService = inject(LessonService);
  private exerciseService = inject(ExerciseService);
  private destroyRef = inject(DestroyRef);

  lesson = signal<Lesson | null>(null);
  exercises = signal<Exercise[]>([]);
  viewState = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  private emptyStateTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.lessonService
      .getLesson(this.courseId, this.lessonId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((l) => {
        if (l) this.lesson.set(l);
      });

    this.exerciseService
      .getExercises(this.courseId, this.lessonId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exs) => {
          this.exercises.set(exs);
          this.resolveViewState(exs.length);
        },
        error: () => this.viewState.set('error'),
      });
  }

  ngOnDestroy() {
    this.clearEmptyStateTimer();
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

    if (this.emptyStateTimer) return;

    this.emptyStateTimer = setTimeout(() => {
      this.emptyStateTimer = null;
      this.viewState.set(this.exercises().length === 0 ? 'empty' : 'ready');
    }, 320);
  }

  private clearEmptyStateTimer() {
    if (this.emptyStateTimer) {
      clearTimeout(this.emptyStateTimer);
      this.emptyStateTimer = null;
    }
  }
}
