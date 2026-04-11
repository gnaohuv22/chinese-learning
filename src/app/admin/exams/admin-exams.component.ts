import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ExamService } from '../../core/services/exam.service';
import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { Exam, Course, Lesson, Exercise } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';

type Section = 'listening' | 'speaking' | 'reading' | 'writing';

@Component({
  selector: 'app-admin-exams',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, DragDropModule],
  templateUrl: './admin-exams.component.html',
})
export class AdminExamsComponent implements OnInit {
  private examService = inject(ExamService);
  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);

  exams = signal<Exam[]>([]);
  courses = signal<Course[]>([]);
  lessons = signal<Lesson[]>([]);
  availableExercises = signal<Exercise[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingExam = signal<Exam | null>(null);
  sections: Section[] = ['listening', 'speaking', 'reading', 'writing'];
  selectedCourseId = signal('');

  sectionMap = signal<Record<Section, string[]>>({
    listening: [],
    speaking: [],
    reading: [],
    writing: [],
  });

  form = this.fb.group({
    title: ['', Validators.required],
    timeLimitSeconds: [3600, Validators.required],
  });

  ngOnInit() {
    this.examService.getExams().subscribe({
      next: (e) => {
        this.exams.set(e);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.courseService.getCourses().subscribe((c) => this.courses.set(c));
  }

  drop(event: CdkDragDrop<Exam[]>) {
    const list = [...this.exams()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.exams.set(list);
    list.forEach((exam, idx) => {
      this.examService.updateExam(exam.id, { order: idx } as Partial<Exam>).subscribe();
    });
  }

  onCourseChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    this.selectedCourseId.set(id);
    this.lessons.set([]);
    this.availableExercises.set([]);
    if (id) {
      this.lessonService.getLessons(id).subscribe((l) => this.lessons.set(l));
    }
  }

  onLessonChange(e: Event) {
    const lessonId = (e.target as HTMLSelectElement).value;
    const courseId = this.selectedCourseId();
    this.availableExercises.set([]);
    if (lessonId && courseId) {
      this.exerciseService
        .getExercises(courseId, lessonId)
        .subscribe((exs) => this.availableExercises.set(exs));
    }
  }

  isExerciseSelected(ex: Exercise): boolean {
    return Object.values(this.sectionMap()).some((ids) => ids.includes(ex.id));
  }

  toggleExercise(ex: Exercise) {
    const map = this.sectionMap();
    const section = ex.skill as Section;
    const current = map[section];
    if (current.includes(ex.id)) {
      this.sectionMap.update((m) => ({ ...m, [section]: current.filter((id) => id !== ex.id) }));
    } else {
      this.sectionMap.update((m) => ({ ...m, [section]: [...current, ex.id] }));
    }
  }

  getSectionIds(section: Section): string[] {
    return this.sectionMap()[section];
  }

  removeFromSection(section: Section, id: string) {
    this.sectionMap.update((m) => ({
      ...m,
      [section]: m[section].filter((i) => i !== id),
    }));
  }

  clearSection(section: Section) {
    this.sectionMap.update((m) => ({ ...m, [section]: [] }));
  }

  totalExercises(exam: Exam): number {
    return Object.values(exam.sections).reduce((sum, arr) => sum + arr.length, 0);
  }

  openForm(exam?: Exam) {
    this.editingExam.set(exam ?? null);
    this.form.reset({
      title: exam?.title ?? '',
      timeLimitSeconds: exam?.timeLimitSeconds ?? 3600,
    });
    this.sectionMap.set({
      listening: [...(exam?.sections.listening ?? [])],
      speaking: [...(exam?.sections.speaking ?? [])],
      reading: [...(exam?.sections.reading ?? [])],
      writing: [...(exam?.sections.writing ?? [])],
    });
    this.showForm.set(true);
  }

  editExam(exam: Exam) {
    this.openForm(exam);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingExam.set(null);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload = {
      title: this.form.value.title!,
      timeLimitSeconds: this.form.value.timeLimitSeconds!,
      sections: this.sectionMap(),
    };

    const editing = this.editingExam();
    const op$ = (editing
      ? this.examService.updateExam(editing.id, payload)
      : this.examService.createExam(payload)) as import('rxjs').Observable<unknown>;

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
      },
      error: () => this.saving.set(false),
    });
  }

  async deleteExam(exam: Exam) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_exam_title'),
      message: exam.title,
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.examService.deleteExam(exam.id).subscribe();
  }
}
