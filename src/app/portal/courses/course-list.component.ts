import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 10;
const EMPTY_STATE_SETTLE_MS = 320;

type CourseListViewState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, PaginationComponent],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);
  private destroyRef = inject(DestroyRef);

  allCourses = signal<Course[]>([]);
  viewState = signal<CourseListViewState>('loading');
  currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;
  private emptyStateTimer: ReturnType<typeof setTimeout> | null = null;

  courses = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.allCourses().slice(start, start + this.pageSize);
  });

  private readonly palette = [
    '#b91c1c', '#1d4ed8', '#15803d', '#7e22ce',
    '#b45309', '#0f766e', '#be185d', '#1e40af',
  ];

  courseColor(order: number): string {
    return this.palette[order % this.palette.length];
  }

  ngOnInit() {
    this.courseService
      .getCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.allCourses.set(c);
          this.resolveViewState(c.length);
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

  onPageChange(page: number) {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      this.viewState.set(this.allCourses().length === 0 ? 'empty' : 'ready');
    }, EMPTY_STATE_SETTLE_MS);
  }

  private clearEmptyStateTimer() {
    if (this.emptyStateTimer) {
      clearTimeout(this.emptyStateTimer);
      this.emptyStateTimer = null;
    }
  }
}
