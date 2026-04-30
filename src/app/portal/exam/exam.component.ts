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
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { ExamService } from '../../core/services/exam.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { SubmittedExamService } from '../../core/services/submitted-exam.service';
import { Exam, Exercise, Skill } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';
import { DriveService } from '../../core/services/drive.service';

type ExamState = 'loading' | 'ready' | 'running' | 'submitted';

interface SectionAnswer {
  exerciseId: string;
  selected: string | null;
}

interface SectionResult {
  skill: Skill;
  exercises: Exercise[];
  answers: SectionAnswer[];
  score: number;
  total: number;
}

@Component({
  selector: 'app-exam',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './exam.component.html',
  styleUrl: './exam.component.scss',
})
export class ExamComponent implements OnInit, OnDestroy {
  @Input({ required: true }) examId!: string;

  private examService = inject(ExamService);
  private exerciseService = inject(ExerciseService);
  private submittedExamService = inject(SubmittedExamService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  readonly drive = inject(DriveService);

  examState = signal<ExamState>('loading');
  exam = signal<Exam | null>(null);
  exerciseMap = signal<Map<string, Exercise>>(new Map());
  answerMap = signal<Map<string, string>>(new Map());
  timeLeft = signal(0);
  wasAutoSubmitted = signal(false);
  activeSection = signal<Skill>('listening');
  sectionResults = signal<SectionResult[]>([]);
  participantName = signal('');

  sections: Skill[] = ['listening', 'speaking', 'reading', 'writing'];
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  totalExercises = computed(() => {
    const exam = this.exam();
    if (!exam) return 0;
    return Object.values(exam.sections).reduce((sum, arr) => sum + arr.length, 0);
  });

  totalAnswered = computed(() => this.answerMap().size);

  timerPercent = computed(() => {
    const total = this.exam()?.timeLimitSeconds ?? 1;
    return (this.timeLeft() / total) * 100;
  });

  totalScore = computed(() =>
    this.sectionResults().reduce((sum, r) => sum + r.score, 0)
  );

  scorePercent = computed(() => {
    const total = this.totalExercises();
    return total > 0 ? (this.totalScore() / total) * 100 : 0;
  });

  ngOnInit() {
    this.loadExam();
  }

  private loadExam() {
    this.examService
      .getExam(this.examId)
      .pipe(take(1))
      .subscribe((exam) => {
        if (!exam) {
          this.examState.set('ready');
          return;
        }
        this.exam.set(exam);
        this.examState.set('ready');
      });
  }

  sectionExercises(section: Skill): Exercise[] {
    const exam = this.exam();
    if (!exam) return [];
    const ids = exam.sections[section];
    return ids
      .map((id) => this.exerciseMap().get(id))
      .filter((e): e is Exercise => !!e);
  }

  answeredInSection(section: Skill): number {
    return this.sectionExercises(section).filter(
      (ex) => this.answerMap().has(ex.id)
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
    }
  }

  startExam() {
    const exam = this.exam();
    if (!exam) return;

    const allIds = [
      ...exam.sections.listening,
      ...exam.sections.speaking,
      ...exam.sections.reading,
      ...exam.sections.writing,
    ];

    if (allIds.length === 0) {
      this.examState.set('running');
      this.startTimer();
      return;
    }

    this.examState.set('loading');

    // Fetch all exercises from the flat collection in parallel
    const fetches = allIds.map((id) =>
      this.exerciseService.getFlatExercise(id).pipe(take(1))
    );

    forkJoin(fetches).subscribe({
      next: (exercises) => {
        const map = new Map<string, Exercise>();
        for (const ex of exercises) {
          if (ex) map.set(ex.id, ex);
        }
        this.exerciseMap.set(map);
        this.examState.set('running');
        this.startTimer();

        const firstSection = this.sections.find(
          (s) => exam.sections[s].length > 0
        );
        if (firstSection) this.activeSection.set(firstSection);
      },
      error: () => {
        // Fall back to running with empty map (exercises just won't display)
        this.examState.set('running');
        this.startTimer();
      },
    });
  }

  private startTimer() {
    this.timeLeft.set(this.exam()?.timeLimitSeconds ?? 3600);
    this.timerInterval = setInterval(() => {
      this.timeLeft.update((t) => {
        if (t <= 1) {
          this.clearTimer();
          this.wasAutoSubmitted.set(true);
          this.finalizeSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async submitExam() {
    const unanswered = this.totalExercises() - this.totalAnswered();
    if (unanswered > 0) {
      const confirmed = await this.modalService.confirm({
        title: this.translate.instant('exam.incomplete_title'),
        message: this.translate.instant('exam.incomplete_message', { count: unanswered }),
        type: 'warning',
        confirmLabel: this.translate.instant('exam.submit'),
        cancelLabel: this.translate.instant('exam.continue'),
      });
      if (!confirmed) return;
    } else {
      const confirmed = await this.modalService.confirm({
        title: this.translate.instant('exam.confirm_submit_title'),
        message: this.translate.instant('exam.confirm_submit_message'),
        type: 'info',
        confirmLabel: this.translate.instant('exam.submit'),
      });
      if (!confirmed) return;
    }
    this.clearTimer();
    this.finalizeSubmit();
  }

  private finalizeSubmit() {
    const exam = this.exam();
    if (!exam) return;

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
    this.examState.set('submitted');

    // Persist the result to Firestore
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const totalExercises = results.reduce((s, r) => s + r.total, 0);
    this.submittedExamService.submitExam({
      examId: exam.id,
      examTitle: exam.title,
      participantName: this.participantName(),
      totalScore,
      totalExercises,
      autoSubmitted: this.wasAutoSubmitted(),
      submittedAt: new Date(),
      sections: results.map((r) => ({
        skill: r.skill,
        score: r.score,
        total: r.total,
        answers: r.answers,
      })),
    }).subscribe();
  }

  checkAnswer(ex: Exercise, selected: string | null): boolean {
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

  displayAnswer(ex: Exercise, selected: string | null): string {
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

  displayCorrectAnswer(ex: Exercise): string {
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

  retakeExam() {
    this.clearTimer();
    this.answerMap.set(new Map());
    this.sectionResults.set([]);
    this.wasAutoSubmitted.set(false);
    this.examState.set('ready');
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  ngOnDestroy() {
    this.clearTimer();
  }
}
