import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
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
import { LessonService } from '../../core/services/lesson.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { Course, Lesson, Skill, Exercise } from '../../core/models';

type SkillFilter = 'all' | Skill;

interface SkillOption {
  value: SkillFilter;
  icon: string;
  labelKey: string;
}

const SKILL_OPTIONS: SkillOption[] = [
  { value: 'all', icon: 'fa-solid fa-layer-group', labelKey: 'common.all' },
  { value: 'listening', icon: 'fa-solid fa-headphones', labelKey: 'skills.listening' },
  { value: 'speaking', icon: 'fa-solid fa-microphone', labelKey: 'skills.speaking' },
  { value: 'reading', icon: 'fa-solid fa-book-open', labelKey: 'skills.reading' },
  { value: 'writing', icon: 'fa-solid fa-pen', labelKey: 'skills.writing' },
];

@Component({
  selector: 'app-on-tap-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './on-tap-detail.component.html',
  styleUrl: './on-tap-detail.component.scss',
})
export class OnTapDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) phan!: string;

  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private exerciseService = inject(ExerciseService);
  private destroyRef = inject(DestroyRef);

  phanNumber = signal<number>(1);
  course = signal<Course | null>(null);
  lessons = signal<Lesson[]>([]);
  viewState = signal<'loading' | 'ready' | 'empty' | 'error' | 'not-found'>('loading');
  activeSkillFilter = signal<SkillFilter>('all');
  private emptyStateTimer: ReturnType<typeof setTimeout> | null = null;

  readonly skillOptions = SKILL_OPTIONS;

  filteredLessons = computed(() => {
    const skill = this.activeSkillFilter();
    if (skill === 'all') return this.lessons();
    return this.lessons().filter((l) => l.skills.includes(skill));
  });

  ngOnInit() {
    this.load();
  }

  ngOnChanges() {
    this.load();
  }

  ngOnDestroy() {
    this.clearEmptyStateTimer();
  }

  private load() {
    const n = parseInt(this.phan, 10);
    const phanNum = isNaN(n) || n < 1 || n > 4 ? 1 : n;
    this.phanNumber.set(phanNum);
    this.viewState.set('loading');
    this.course.set(null);
    this.lessons.set([]);
    this.activeSkillFilter.set('all');
    this.clearEmptyStateTimer();

    // URL phan 1–4 maps to zero-based course.order.
    this.courseService
      .getCourseByOrder(phanNum - 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (course) => {
          if (!course) {
            this.viewState.set('not-found');
            return;
          }
          this.course.set(course);
          this.lessonService
            .getLessons(course.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (lessons) => {
                this.exerciseService.getExercisesByCourse(course.id)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: (exercises) => {
                      const dynamicLessons = lessons.map(l => {
                        const lessonExercises = exercises.filter(e => e.lessonId === l.id);
                        const dynamicSkills = [...new Set(lessonExercises.map(e => e.skill))];
                        return { ...l, skills: dynamicSkills.length > 0 ? dynamicSkills : l.skills };
                      });
                      this.lessons.set(dynamicLessons);
                      this.resolveViewState(dynamicLessons.length);
                    },
                    error: () => {
                      this.lessons.set(lessons);
                      this.resolveViewState(lessons.length);
                    }
                  });
              },
              error: () => this.viewState.set('error'),
            });
        },
        error: () => this.viewState.set('not-found'),
      });
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

  hocPhanItems = [1, 2, 3, 4] as const;
}
