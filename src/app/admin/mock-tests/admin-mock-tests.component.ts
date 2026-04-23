import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { MockTestService } from '../../core/services/mock-test.service';
import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { MockTest, MockTestCreatePayload, HocPhan, Course, Lesson, Exercise } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';

type Skill = 'listening' | 'speaking' | 'reading' | 'writing';

@Component({
  selector: 'app-admin-mock-tests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, DragDropModule],
  templateUrl: './admin-mock-tests.component.html',
})
export class AdminMockTestsComponent implements OnInit {
  private mockTestService = inject(MockTestService);
  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private exerciseService = inject(ExerciseService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);

  mockTests = signal<MockTest[]>([]);
  courses = signal<Course[]>([]);
  lessons = signal<Lesson[]>([]);
  availableExercises = signal<Exercise[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingTest = signal<MockTest | null>(null);
  previewTest = signal<MockTest | null>(null);
  selectedCourseId = signal('');

  skills: Skill[] = ['listening', 'speaking', 'reading', 'writing'];
  hocPhanOptions = [1, 2, 3, 4] as const;

  sectionMap = signal<Record<Skill, string[]>>({
    listening: [],
    speaking: [],
    reading: [],
    writing: [],
  });

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    hocPhan: [1 as HocPhan, Validators.required],
    timeLimitSeconds: [3600, Validators.required],
  });

  ngOnInit() {
    this.mockTestService
      .getMockTests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tests) => {
          this.mockTests.set(tests);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.courseService
      .getCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => this.courses.set(c));
  }

  onCourseChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    this.selectedCourseId.set(id);
    this.lessons.set([]);
    this.availableExercises.set([]);
    if (id) {
      this.lessonService
        .getLessons(id)
        .pipe(take(1))
        .subscribe((l) => this.lessons.set(l));
    }
  }

  onLessonChange(e: Event) {
    const lessonId = (e.target as HTMLSelectElement).value;
    const courseId = this.selectedCourseId();
    if (lessonId && courseId) {
      this.exerciseService
        .getExercises(courseId, lessonId)
        .pipe(take(1))
        .subscribe((exs) => this.availableExercises.set(exs));
    } else {
      this.availableExercises.set([]);
    }
  }

  isInSection(section: Skill, exerciseId: string): boolean {
    return this.sectionMap()[section].includes(exerciseId);
  }

  toggleExercise(section: Skill, exerciseId: string) {
    const current = this.sectionMap()[section];
    const updated = current.includes(exerciseId)
      ? current.filter((id) => id !== exerciseId)
      : [...current, exerciseId];
    this.sectionMap.update((m) => ({ ...m, [section]: updated }));
  }

  dropSection(event: CdkDragDrop<string[]>, section: Skill) {
    const list = [...this.sectionMap()[section]];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.sectionMap.update((m) => ({ ...m, [section]: list }));
  }

  openCreate() {
    this.editingTest.set(null);
    this.form.reset({ title: '', description: '', hocPhan: 1, timeLimitSeconds: 3600 });
    this.sectionMap.set({ listening: [], speaking: [], reading: [], writing: [] });
    this.showForm.set(true);
  }

  openEdit(test: MockTest) {
    this.editingTest.set(test);
    this.form.patchValue({
      title: test.title,
      description: test.description,
      hocPhan: test.hocPhan,
      timeLimitSeconds: test.timeLimitSeconds,
    });
    this.sectionMap.set({
      listening: [...test.sections.listening],
      speaking: [...test.sections.speaking],
      reading: [...test.sections.reading],
      writing: [...test.sections.writing],
    });
    this.showForm.set(true);
  }

  openPreview(test: MockTest) {
    this.previewTest.set(test);
  }

  closePreview() {
    this.previewTest.set(null);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingTest.set(null);
  }

  async save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const val = this.form.value;
    const payload: MockTestCreatePayload = {
      title: val.title!,
      description: val.description ?? '',
      hocPhan: Number(val.hocPhan) as HocPhan,
      timeLimitSeconds: Number(val.timeLimitSeconds),
      sections: {
        listening: this.sectionMap().listening,
        speaking: this.sectionMap().speaking,
        reading: this.sectionMap().reading,
        writing: this.sectionMap().writing,
      },
    };

    const editing = this.editingTest();
    const onSuccess = () => {
      this.saving.set(false);
      this.showForm.set(false);
      this.editingTest.set(null);
    };
    const onError = () => this.saving.set(false);

    if (editing) {
      this.mockTestService.updateMockTest(editing.id, payload).subscribe({
        next: onSuccess,
        error: onError,
      });
    } else {
      this.mockTestService.createMockTest(payload).subscribe({
        next: onSuccess,
        error: onError,
      });
    }
  }

  async delete(test: MockTest) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_mock_test_title'),
      message: this.translate.instant('admin.delete_confirm_msg', { name: test.title }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.mockTestService.deleteMockTest(test.id).subscribe();
  }

  totalExercises(test: MockTest): number {
    return this.mockTestService.totalExercises(test);
  }

  formatMinutes(seconds: number): number {
    return Math.round(seconds / 60);
  }

  previewTotalExercises(): number {
    const t = this.previewTest();
    if (!t) return 0;
    return this.mockTestService.totalExercises(t);
  }

  previewSkillSections() {
    const t = this.previewTest();
    if (!t) return [];
    return [
      { key: 'listening', count: t.sections.listening.length },
      { key: 'speaking', count: t.sections.speaking.length },
      { key: 'reading', count: t.sections.reading.length },
      { key: 'writing', count: t.sections.writing.length },
    ].filter((s) => s.count > 0);
  }
}
