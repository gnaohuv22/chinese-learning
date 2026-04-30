import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { MockTestService } from '../../core/services/mock-test.service';
import { SubmittedExamService } from '../../core/services/submitted-exam.service';
import { MockTest, MockTestQuestion, Skill } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';
import { DriveService } from '../../core/services/drive.service';

type TestState = 'loading' | 'running' | 'submitted';

interface SectionAnswer {
  exerciseId: string;
  selected: string | null;
}

interface SectionResult {
  skill: Skill;
  exercises: MockTestQuestion[];
  answers: SectionAnswer[];
  score: number;
  total: number;
}

const STORAGE_PREFIX = 'mock_test_progress_';

@Component({
  selector: 'app-mock-test-exam',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './mock-test-exam.component.html',
  styleUrl: './mock-test-exam.component.scss',
})
export class MockTestExamComponent implements OnInit, OnDestroy {
  @Input({ required: true }) testId!: string;

  private mockTestService = inject(MockTestService);
  private submittedExamService = inject(SubmittedExamService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  readonly drive = inject(DriveService);

  state = signal<TestState>('loading');
  test = signal<MockTest | null>(null);
  answerMap = signal<Map<string, string>>(new Map());
  timeLeft = signal(0);
  wasAutoSubmitted = signal(false);
  activeSection = signal<Skill>('listening');
  sectionResults = signal<SectionResult[]>([]);

  sections: Skill[] = ['listening', 'speaking', 'reading', 'writing'];
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  totalExercises = computed(() => {
    const t = this.test();
    if (!t) return 0;
    return this.mockTestService.totalExercises(t);
  });

  totalAnswered = computed(() => this.answerMap().size);

  timerPercent = computed(() => {
    const total = this.test()?.timeLimitSeconds ?? 1;
    return Math.max(0, (this.timeLeft() / total) * 100);
  });

  totalScore = computed(() =>
    this.sectionResults().reduce((s, r) => s + r.score, 0)
  );

  scorePercent = computed(() => {
    const total = this.totalExercises();
    return total > 0 ? Math.round((this.totalScore() / total) * 100) : 0;
  });

  private get storageKey(): string {
    return STORAGE_PREFIX + this.testId;
  }

  ngOnInit() {
    this.loadTest();
  }

  private loadTest() {
    this.mockTestService.getMockTest(this.testId).pipe(take(1)).subscribe({
      next: (test) => {
        if (!test) {
          this.state.set('running');
          return;
        }
        this.test.set(test);
        this.restoreProgress(test);
      },
      error: () => this.state.set('running'),
    });
  }

  private restoreProgress(test: MockTest) {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const { answers, timeLeft } = JSON.parse(saved) as {
          answers: Array<[string, string]>;
          timeLeft: number;
        };
        this.answerMap.set(new Map(answers));
        this.timeLeft.set(timeLeft > 0 ? timeLeft : test.timeLimitSeconds);
      } else {
        this.timeLeft.set(test.timeLimitSeconds);
      }
    } catch {
      this.timeLeft.set(test.timeLimitSeconds);
    }

    const firstSection = this.sections.find(
      (s) => test.sections[s].length > 0
    );
    if (firstSection) this.activeSection.set(firstSection);

    this.state.set('running');
    this.startTimer();
  }

  private saveProgress() {
    try {
      const payload = {
        answers: Array.from(this.answerMap().entries()),
        timeLeft: this.timeLeft(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {
      // Silently ignore storage errors
    }
  }

  private clearProgress() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Silently ignore
    }
  }

  private startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft.update((t) => {
        if (t <= 1) {
          this.clearTimer();
          this.wasAutoSubmitted.set(true);
          this.finalizeSubmit();
          return 0;
        }
        const next = t - 1;
        // Save progress every 5 seconds
        if (next % 5 === 0) this.saveProgress();
        return next;
      });
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  sectionExercises(section: Skill): MockTestQuestion[] {
    const test = this.test();
    if (!test) return [];
    return test.sections[section] || [];
  }

  answeredInSection(section: Skill): number {
    return this.sectionExercises(section).filter((ex) =>
      this.answerMap().has(ex.id)
    ).length;
  }

  getAnswer(exerciseId: string): string | null {
    return this.answerMap().get(exerciseId) ?? null;
  }

  setAnswer(exerciseId: string, value: string) {
    this.answerMap.update((m) => {
      const next = new Map(m);
      next.set(exerciseId, value);
      return next;
    });
    this.saveProgress();
  }

  toggleMcqAnswer(exerciseId: string, value: string) {
    const current = this.getAnswer(exerciseId);
    let arr = current ? current.split(',') : [];
    if (arr.includes(value)) {
      arr = arr.filter((x) => x !== value);
    } else {
      arr.push(value);
    }
    
    if (arr.length > 0) {
      this.setAnswer(exerciseId, arr.sort().join(','));
    } else {
      this.answerMap.update((m) => {
        const next = new Map(m);
        next.delete(exerciseId);
        return next;
      });
      this.saveProgress();
    }
  }

  async submitTest() {
    const unanswered = this.totalExercises() - this.totalAnswered();
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('mock_test.confirm_submit_title'),
      message: this.translate.instant('mock_test.confirm_submit_message', {
        answered: this.totalAnswered(),
        total: this.totalExercises(),
      }),
      type: unanswered > 0 ? 'warning' : 'info',
      confirmLabel: this.translate.instant('mock_test.submit'),
      cancelLabel: this.translate.instant('exam.continue'),
    });
    if (!confirmed) return;
    this.clearTimer();
    this.finalizeSubmit();
  }

  private finalizeSubmit() {
    const results: SectionResult[] = this.sections.map((section) => {
      const exercises = this.sectionExercises(section);
      const answers: SectionAnswer[] = exercises.map((ex) => ({
        exerciseId: ex.id,
        selected: this.getAnswer(ex.id),
      }));
      const score = answers.filter((a, i) =>
        this.checkAnswer(exercises[i], a.selected)
      ).length;
      return { skill: section, exercises, answers, score, total: exercises.length };
    });

    this.sectionResults.set(results);
    this.clearProgress();

    const test = this.test();
    if (test) {
      this.submittedExamService.submitMockTest({
        examId: test.id,
        examTitle: test.title,
        mockTestId: test.id,
        isMockTest: true,
        participantName: this.translate.instant('mock_test.anonymous_participant'),
        totalScore: results.reduce((s, r) => s + r.score, 0),
        totalExercises: results.reduce((s, r) => s + r.total, 0),
        sections: results.map((r) => ({
          skill: r.skill,
          score: r.score,
          total: r.total,
          answers: r.answers.map((a) => ({ exerciseId: a.exerciseId, selected: a.selected })),
        })),
        submittedAt: new Date(),
        autoSubmitted: this.wasAutoSubmitted(),
      }).subscribe();
    }

    this.state.set('submitted');
  }

  checkAnswer(ex: MockTestQuestion, selected: string | null): boolean {
    if (!selected) return false;
    const answer = ex.answer;
    
    if (Array.isArray(answer)) {
      if (ex.type === 'mcq' || ex.type === 'audio_mcq') {
        const selectedArr = selected.split(',').sort();
        const correctArr = [...answer].map(String).sort();
        return JSON.stringify(selectedArr) === JSON.stringify(correctArr);
      }
      return false;
    }

    if (typeof answer === 'string') {
      if (ex.type === 'dictation' || ex.type === 'viet_chinese_translation') {
        return selected.trim() === answer.trim();
      }
      const idx = parseInt(answer, 10);
      if (!isNaN(idx)) return selected === idx.toString();
      return selected.trim().toLowerCase() === answer.trim().toLowerCase();
    }
    return false;
  }

  displayAnswer(ex: MockTestQuestion, selected: string | null): string {
    if (!selected) return '';
    if (ex.type === 'mcq' || ex.type === 'audio_mcq') {
      return selected.split(',').map(val => {
        const idx = parseInt(val, 10);
        if (!isNaN(idx) && ex.options?.[idx]) {
          const letter = ['A','B','C','D','E','F','G','H','I','J'][idx];
          return `${letter}. ${ex.options[idx]}`;
        }
        return val;
      }).join(' | ');
    }
    return selected;
  }

  displayCorrectAnswer(ex: MockTestQuestion): string {
    const answer = ex.answer;
    if (Array.isArray(answer)) {
      if (ex.type === 'mcq' || ex.type === 'audio_mcq') {
        return answer.map(val => {
          const idx = parseInt(val, 10);
          if (!isNaN(idx) && ex.options?.[idx]) {
            const letter = ['A','B','C','D','E','F','G','H','I','J'][idx];
            return `${letter}. ${ex.options[idx]}`;
          }
          return val;
        }).join(' | ');
      }
      return answer.join(' ');
    }

    if (typeof answer === 'string') {
      const idx = parseInt(answer, 10);
      if (!isNaN(idx) && ex.options?.[idx]) {
        const letter = ['A','B','C','D','E','F','G','H','I','J'][idx];
        return `${letter}. ${ex.options[idx]}`;
      }
      return answer;
    }
    return '';
  }

  retake() {
    this.clearTimer();
    this.clearProgress();
    this.answerMap.set(new Map());
    this.sectionResults.set([]);
    this.wasAutoSubmitted.set(false);
    const test = this.test();
    if (test) {
      this.timeLeft.set(test.timeLimitSeconds);
      const firstSection = this.sections.find((s) => test.sections[s].length > 0);
      if (firstSection) this.activeSection.set(firstSection);
      this.state.set('running');
      this.startTimer();
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /** SVG circle circumference for timer ring (radius 18) */
  readonly CIRCUMFERENCE = 2 * Math.PI * 18;

  timerDashOffset = computed(
    () => this.CIRCUMFERENCE * (1 - this.timerPercent() / 100)
  );

  ngOnDestroy() {
    this.clearTimer();
  }
}
