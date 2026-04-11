import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { LessonService } from '../../core/services/lesson.service';
import { CourseService } from '../../core/services/course.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { Lesson, Course, Skill } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';
import { ToastService } from '../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-lessons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, DragDropModule],
  templateUrl: './admin-lessons.component.html',
})
export class AdminLessonsComponent implements OnInit {
  @Input() courseId!: string;

  private lessonService = inject(LessonService);
  private courseService = inject(CourseService);
  private exerciseService = inject(ExerciseService);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  lessons = signal<Lesson[]>([]);
  course = signal<Course | null>(null);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingLesson = signal<Lesson | null>(null);
  derivedSkills = signal<Skill[]>([]);
  loadingSkills = signal(false);

  form = this.fb.group({ title: ['', Validators.required] });

  ngOnInit() {
    this.courseService.getCourse(this.courseId).subscribe((c) =>
      this.course.set(c ?? null)
    );
    this.lessonService.getLessons(this.courseId).subscribe({
      next: (lessons) => {
        this.lessons.set(lessons);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  drop(event: CdkDragDrop<Lesson[]>) {
    const list = [...this.lessons()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.lessons.set(list);
    list.forEach((lesson, idx) => {
      this.lessonService.updateLesson(this.courseId, lesson.id, { order: idx }).subscribe();
    });
  }

  openForm(lesson?: Lesson) {
    this.editingLesson.set(lesson ?? null);
    this.derivedSkills.set(lesson?.skills ?? []);
    this.form.reset({ title: lesson?.title ?? '' });

    if (lesson) {
      this.loadingSkills.set(true);
      this.exerciseService.getExercises(this.courseId, lesson.id).subscribe({
        next: (exercises) => {
          const skills = [...new Set(exercises.map((e) => e.skill))] as Skill[];
          this.derivedSkills.set(skills.length > 0 ? skills : lesson.skills ?? []);
          this.loadingSkills.set(false);
        },
        error: () => this.loadingSkills.set(false),
      });
    }

    this.showForm.set(true);
  }

  editLesson(lesson: Lesson) {
    this.openForm(lesson);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingLesson.set(null);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload = {
      title: this.form.value.title!,
      order: this.editingLesson()?.order ?? this.lessons().length,
      skills: this.derivedSkills(),
    };

    const editing = this.editingLesson();
    const isEditing = !!editing;

    const op$ = (editing
      ? this.lessonService.updateLesson(this.courseId, editing.id, payload)
      : this.lessonService.createLesson(this.courseId, payload)) as import('rxjs').Observable<unknown>;

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success(
          this.translate.instant(isEditing ? 'admin.updated_success' : 'admin.created_success')
        );
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.translate.instant('common.error'));
      },
    });
  }

  async deleteLesson(lesson: Lesson) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_lesson_title'),
      message: this.translate.instant('admin.delete_confirm_msg', { name: lesson.title }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.lessonService.deleteLesson(this.courseId, lesson.id).subscribe({
      next: () => this.toast.success(this.translate.instant('admin.deleted_success')),
      error: () => this.toast.error(this.translate.instant('common.error')),
    });
  }
}
