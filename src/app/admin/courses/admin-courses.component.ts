import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';
import { ToastService } from '../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, DragDropModule],
  styleUrl: './admin-courses.component.scss',
  templateUrl: './admin-courses.component.html',
})
export class AdminCoursesComponent implements OnInit {
  private courseService = inject(CourseService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  courses = signal<Course[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingCourse = signal<Course | null>(null);

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
  });

  ngOnInit() {
    this.courseService
      .getCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (courses) => {
          this.courses.set(courses);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  drop(event: CdkDragDrop<Course[]>) {
    const list = [...this.courses()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.courses.set(list);
    list.forEach((course, idx) => {
      this.courseService.updateCourse(course.id, { order: idx }).subscribe();
    });
  }

  openForm(course?: Course) {
    this.editingCourse.set(course ?? null);
    this.form.reset({
      title: course?.title ?? '',
      description: course?.description ?? '',
    });
    this.showForm.set(true);
  }

  editCourse(course: Course) {
    this.openForm(course);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingCourse.set(null);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const payload = {
      title: this.form.value.title!,
      description: this.form.value.description ?? '',
      order: this.editingCourse()?.order ?? this.courses().length,
    };

    const editing = this.editingCourse();
    const isEditing = !!editing;

    const op$ = (editing
      ? this.courseService.updateCourse(editing.id, payload)
      : this.courseService.createCourse(payload)) as import('rxjs').Observable<unknown>;

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

  async deleteCourse(course: Course) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_course_title'),
      message: this.translate.instant('admin.delete_confirm_msg', { name: course.title }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.courseService.deleteCourse(course.id).subscribe({
      next: () => this.toast.success(this.translate.instant('admin.deleted_success')),
      error: () => this.toast.error(this.translate.instant('common.error')),
    });
  }
}
