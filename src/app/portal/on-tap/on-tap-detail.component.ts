import { Component, inject, signal, computed, OnInit, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { Course, Lesson, Skill } from '../../core/models';

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
export class OnTapDetailComponent implements OnInit, OnChanges {
  @Input({ required: true }) phan!: string;

  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);

  phanNumber = signal<number>(1);
  course = signal<Course | null>(null);
  lessons = signal<Lesson[]>([]);
  loading = signal(true);
  notFound = signal(false);
  activeSkillFilter = signal<SkillFilter>('all');

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

  private load() {
    const n = parseInt(this.phan, 10);
    const phanNum = isNaN(n) || n < 1 || n > 4 ? 1 : n;
    this.phanNumber.set(phanNum);
    this.loading.set(true);
    this.notFound.set(false);
    this.course.set(null);
    this.lessons.set([]);
    this.activeSkillFilter.set('all');

    // URL phan 1–4 maps to zero-based course.order (see admin-courses drag/reorder).
    this.courseService.getCourseByOrder(phanNum - 1).pipe(take(1)).subscribe({
      next: (course) => {
        if (!course) {
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.course.set(course);
        this.lessonService.getLessons(course.id).pipe(take(1)).subscribe({
          next: (lessons) => {
            this.lessons.set(lessons);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  hocPhanItems = [1, 2, 3, 4] as const;
}
