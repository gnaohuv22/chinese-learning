import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { Course, Lesson } from '../../core/models';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent implements OnInit {
  @Input({ required: true }) courseId!: string;

  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private destroyRef = inject(DestroyRef);

  course = signal<Course | null>(null);
  lessons = signal<Lesson[]>([]);
  viewState = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  private emptyStateTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.courseService
      .getCourse(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => {
        this.course.set(c ?? null);
      });

    this.lessonService
      .getLessons(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (l) => {
          this.lessons.set(l);
          this.resolveViewState(l.length);
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
      this.viewState.set(this.lessons().length === 0 ? 'empty' : 'ready');
    }, 320);
  }

  private clearEmptyStateTimer() {
    if (this.emptyStateTimer) {
      clearTimeout(this.emptyStateTimer);
      this.emptyStateTimer = null;
    }
  }
}
