import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, switchMap } from 'rxjs';
import { take } from 'rxjs/operators';
import { CourseService } from '../../core/services/course.service';
import { NewsService } from '../../core/services/news.service';
import { LessonService } from '../../core/services/lesson.service';
import { Course, News, Lesson } from '../../core/models';

type Skill = 'listening' | 'speaking' | 'reading' | 'writing';

const PRACTICE_STORAGE_KEY = 'practice_results';

const TYPING_WORDS = ['你好', '汉字', '学习', '成功', '语言', '文化', '进步', '努力'];
const TYPE_SPEED_MS = 120;
const DELETE_SPEED_MS = 80;
const PAUSE_MS = 1400;

export interface PracticeResult {
  lessonId: string;
  skill: Skill;
  correct: number;
  total: number;
  completedAt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, DatePipe],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  private newsService = inject(NewsService);
  private lessonService = inject(LessonService);

  courses = signal<Course[]>([]);
  news = signal<News[]>([]);
  activeSkill = signal<Skill | null>(null);
  skillLessons = signal<Array<{ lesson: Lesson; courseName: string; courseId: string }>>([]);
  loadingSkill = signal(false);

  // Typing animation
  typedText = signal('');
  showCursor = signal(true);

  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorTimer: ReturnType<typeof setInterval> | null = null;
  private wordIndex = 0;
  private charIndex = 0;
  private isDeleting = false;

  skills: Array<{ key: string; skill: Skill; icon: string }> = [
    { key: 'skills.listening', skill: 'listening', icon: 'fa-solid fa-headphones' },
    { key: 'skills.speaking', skill: 'speaking', icon: 'fa-solid fa-microphone' },
    { key: 'skills.reading', skill: 'reading', icon: 'fa-solid fa-book-open' },
    { key: 'skills.writing', skill: 'writing', icon: 'fa-solid fa-pen-nib' },
  ];

  statsTotal = computed(() => ({
    courses: this.courses().length,
    exams: 0,
  }));

  ngOnInit() {
    this.courseService.getCourses().subscribe((c) => this.courses.set(c));
    this.newsService.getNewsList().subscribe((n) => this.news.set(n));
    this.startTypingAnimation();
    this.startCursorBlink();
  }

  ngOnDestroy() {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.cursorTimer) clearInterval(this.cursorTimer);
  }

  private startTypingAnimation(): void {
    const tick = () => {
      const word = TYPING_WORDS[this.wordIndex];

      if (!this.isDeleting) {
        this.charIndex++;
        this.typedText.set(word.slice(0, this.charIndex));

        if (this.charIndex === word.length) {
          this.isDeleting = true;
          this.typingTimer = setTimeout(tick, PAUSE_MS);
          return;
        }
        this.typingTimer = setTimeout(tick, TYPE_SPEED_MS);
      } else {
        this.charIndex--;
        this.typedText.set(word.slice(0, this.charIndex));

        if (this.charIndex === 0) {
          this.isDeleting = false;
          this.wordIndex = (this.wordIndex + 1) % TYPING_WORDS.length;
          this.typingTimer = setTimeout(tick, 300);
          return;
        }
        this.typingTimer = setTimeout(tick, DELETE_SPEED_MS);
      }
    };

    this.typingTimer = setTimeout(tick, 500);
  }

  private startCursorBlink(): void {
    this.cursorTimer = setInterval(() => {
      this.showCursor.update((v) => !v);
    }, 530);
  }

  toggleSkill(skill: Skill) {
    if (this.activeSkill() === skill) {
      this.activeSkill.set(null);
      this.skillLessons.set([]);
      return;
    }
    this.activeSkill.set(skill);
    this.loadingSkill.set(true);
    this.skillLessons.set([]);

    const startTime = Date.now();

    this.courseService.getCourses().pipe(
      take(1),
      switchMap((courses) => {
        if (courses.length === 0) return of([] as Array<Array<{ lesson: Lesson; courseName: string; courseId: string }>>);
        return forkJoin(
          courses.map((course) =>
            this.lessonService.getLessons(course.id).pipe(
              take(1),
              switchMap((lessons) => {
                const filtered = lessons.filter((l) => l.skills.includes(skill));
                return of(filtered.map((l) => ({ lesson: l, courseName: course.title, courseId: course.id })));
              })
            )
          )
        );
      })
    ).subscribe({
      next: (groups) => {
        const flat = (groups as Array<Array<{ lesson: Lesson; courseName: string; courseId: string }>>).flat();
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 500 - elapsed);
        setTimeout(() => {
          this.skillLessons.set(flat);
          this.loadingSkill.set(false);
        }, delay);
      },
      error: () => this.loadingSkill.set(false),
    });
  }

  getPracticeResults(lessonId: string): PracticeResult | null {
    try {
      const data = localStorage.getItem(PRACTICE_STORAGE_KEY);
      if (!data) return null;
      const results: PracticeResult[] = JSON.parse(data);
      return results.find((r) => r.lessonId === lessonId) ?? null;
    } catch {
      return null;
    }
  }

  markdownExcerpt(content: string, maxLength = 120): string {
    // Strip markdown syntax for list preview
    return content
      .replace(/[#*_`>[\]()!]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, maxLength) + (content.length > maxLength ? '…' : '');
  }
}
