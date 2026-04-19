import { Component, inject, signal, OnInit, Input, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ExerciseService } from '../../core/services/exercise.service';
import { LessonService } from '../../core/services/lesson.service';
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { Exercise, ExerciseType, Skill } from '../../core/models';
import { DriveUploadResponse } from '../../core/services/drive.service';
import { ModalService } from '../../shared/components/modal/modal.service';
import { ToastService } from '../../shared/components/toast/toast.service';

const EXERCISE_TYPES: ExerciseType[] = [
  'mcq',
  'scramble',
  'guided_writing',
  'speaking_topic',
  'speaking_record',
  'reflex_speaking',
  'audio_mcq',
  'dictation',
  'interactive_video',
];
const SKILLS: Skill[] = ['listening', 'speaking', 'reading', 'writing'];

@Component({
  selector: 'app-admin-exercises',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    FileUploaderComponent,
    DragDropModule,
  ],
  templateUrl: './admin-exercises.component.html',
  styleUrl: './admin-exercises.component.scss',
})
export class AdminExercisesComponent implements OnInit {
  @Input() courseId!: string;
  @Input() lessonId!: string;
  @ViewChild('formPanel') formPanelRef?: ElementRef<HTMLElement>;

  private exerciseService = inject(ExerciseService);
  private lessonService = inject(LessonService);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  exercises = signal<Exercise[]>([]);
  lessonTitle = signal('');
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingExercise = signal<Exercise | null>(null);
  validationErrors = signal<Record<string, string>>({});
  shuffleDefault = signal(false);
  fadingOutId = signal<string | null>(null);

  exerciseTypes = EXERCISE_TYPES;
  skills = SKILLS;

  form = this.fb.group({
    type: ['mcq' as ExerciseType, Validators.required],
    skill: ['listening' as Skill, Validators.required],
    prompt: ['', Validators.required],
    mediaUrl: [''],
    mediaType: [''],
    answer: [''],
    durationSeconds: [60],
    shuffle: [false],
    options: this.fb.array([]),
    keywords: this.fb.array([]),
    outline: this.fb.array([]),
  });

  get optionsArray() {
    return this.form.get('options') as FormArray;
  }
  get keywordsArray() {
    return this.form.get('keywords') as FormArray;
  }
  get outlineArray() {
    return this.form.get('outline') as FormArray;
  }

  get needsMedia(): boolean {
    return ['mcq', 'audio_mcq', 'dictation', 'interactive_video', 'reflex_speaking'].includes(
      this.form.value.type ?? ''
    );
  }

  get needsOptions(): boolean {
    return ['mcq', 'audio_mcq'].includes(this.form.value.type ?? '');
  }

  get needsAnswer(): boolean {
    return ['mcq', 'audio_mcq', 'dictation', 'scramble'].includes(this.form.value.type ?? '');
  }

  get needsKeywords(): boolean {
    return this.form.value.type === 'guided_writing';
  }

  get needsOutline(): boolean {
    return ['speaking_topic', 'reflex_speaking'].includes(this.form.value.type ?? '');
  }

  mediaAccept(): string {
    const t = this.form.value.mediaType;
    if (t === 'video') return 'video/*';
    if (t === 'audio') return 'audio/*';
    if (t === 'image') return 'image/*';
    return '*/*';
  }

  ngOnInit() {
    this.lessonService.getLesson(this.courseId, this.lessonId).subscribe((l) => {
      this.lessonTitle.set(l?.title ?? '');
    });

    this.exerciseService.getExercises(this.courseId, this.lessonId).subscribe({
      next: (exs) => {
        this.exercises.set(exs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  drop(event: CdkDragDrop<Exercise[]>) {
    const list = [...this.exercises()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.exercises.set(list);
    list.forEach((ex, idx) => {
      this.exerciseService
        .updateExercise(this.courseId, this.lessonId, ex.id, { order: idx })
        .subscribe();
    });
  }

  addOption() {
    if (this.optionsArray.length >= 10) return;
    this.optionsArray.push(this.fb.control(''));
  }
  removeOption(i: number) {
    this.optionsArray.removeAt(i);
  }
  addKeyword() {
    this.keywordsArray.push(this.fb.control(''));
  }
  removeKeyword(i: number) {
    this.keywordsArray.removeAt(i);
  }
  addOutline() {
    this.outlineArray.push(this.fb.control(''));
  }
  removeOutline(i: number) {
    this.outlineArray.removeAt(i);
  }

  onMediaUploaded(resp: DriveUploadResponse) {
    this.form.patchValue({ mediaUrl: resp.fileId });
  }

  onMediaCleared() {
    this.form.patchValue({ mediaUrl: '' });
  }

  openForm(exercise?: Exercise) {
    this.editingExercise.set(exercise ?? null);
    this.validationErrors.set({});

    while (this.optionsArray.length) this.optionsArray.removeAt(0);
    while (this.keywordsArray.length) this.keywordsArray.removeAt(0);
    while (this.outlineArray.length) this.outlineArray.removeAt(0);

    if (exercise?.options) {
      exercise.options.forEach((o) => this.optionsArray.push(this.fb.control(o)));
    }
    if (exercise?.keywords) {
      exercise.keywords.forEach((k) => this.keywordsArray.push(this.fb.control(k)));
    }
    if (exercise?.outline) {
      exercise.outline.forEach((o) => this.outlineArray.push(this.fb.control(o)));
    }

    this.form.reset({
      type: exercise?.type ?? 'mcq',
      skill: exercise?.skill ?? 'listening',
      prompt: exercise?.prompt ?? '',
      mediaUrl: exercise?.mediaUrl ?? '',
      mediaType: exercise?.mediaType ?? '',
      answer: Array.isArray(exercise?.answer)
        ? exercise.answer.join(', ')
        : exercise?.answer ?? '',
      durationSeconds: exercise?.durationSeconds ?? 60,
      // When editing, use the exercise's value; when creating, use the header default
      shuffle: exercise ? (exercise.shuffle ?? false) : this.shuffleDefault(),
    });

    this.showForm.set(true);
    setTimeout(() => {
      this.formPanelRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  editExercise(ex: Exercise) {
    this.fadingOutId.set(ex.id);
    setTimeout(() => {
      this.fadingOutId.set(null);
      this.openForm(ex);
    }, 220);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingExercise.set(null);
    this.validationErrors.set({});
  }

  save() {
    this.form.markAllAsTouched();

    const errors: Record<string, string> = {};
    if (this.form.controls.prompt.invalid) errors['prompt'] = 'admin.error_required';
    if (this.form.controls.type.invalid) errors['type'] = 'admin.error_required';
    if (this.form.controls.skill.invalid) errors['skill'] = 'admin.error_required';
    if (this.needsOptions && this.optionsArray.length < 2) errors['options'] = 'admin.error_min_options';

    const vPre = this.form.value;
    const typePre = vPre.type as ExerciseType;
    if (typePre === 'dictation') {
      const mt = vPre.mediaType;
      if (!vPre.mediaUrl?.trim()) errors['media'] = 'admin.error_dictation_media';
      else if (mt !== 'audio' && mt !== 'video') errors['media'] = 'admin.error_dictation_media_type';
      if (!(vPre.answer?.trim() ?? '')) errors['answer'] = 'admin.error_dictation_answer';
    }

    this.validationErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 50);
      return;
    }

    this.saving.set(true);

    const v = this.form.value;
    const type = v.type as ExerciseType;

    const answerRaw = v.answer?.trim() ?? '';
    const answer: string | string[] =
      type === 'scramble' ? answerRaw.split(/\s+/).filter(Boolean) : answerRaw;

    const payload: Omit<Exercise, 'id' | 'courseId' | 'lessonId'> = {
      type,
      skill: v.skill as Skill,
      prompt: v.prompt!,
      order: this.editingExercise()?.order ?? this.exercises().length,
      shuffle: v.shuffle ?? false,
      ...(v.mediaUrl ? { mediaUrl: v.mediaUrl } : {}),
      ...(v.mediaType ? { mediaType: v.mediaType as Exercise['mediaType'] } : {}),
      ...(answerRaw ? { answer } : {}),
      ...(this.optionsArray.length
        ? { options: this.optionsArray.value.filter(Boolean) }
        : {}),
      ...(this.keywordsArray.length
        ? { keywords: this.keywordsArray.value.filter(Boolean) }
        : {}),
      ...(this.outlineArray.length
        ? { outline: this.outlineArray.value.filter(Boolean) }
        : {}),
      ...(['speaking_topic', 'reflex_speaking'].includes(type)
        ? { durationSeconds: v.durationSeconds ?? 60 }
        : {}),
    };

    const editing = this.editingExercise();
    const op$ = (editing
      ? this.exerciseService.updateExercise(
          this.courseId,
          this.lessonId,
          editing.id,
          payload
        )
      : this.exerciseService.createExercise(
          this.courseId,
          this.lessonId,
          payload
        )) as import('rxjs').Observable<unknown>;

    const isEditing = !!editing;
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

  async deleteExercise(ex: Exercise) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_question_title'),
      message: this.translate.instant('admin.delete_question_message', { prompt: ex.prompt }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.exerciseService
      .deleteExercise(this.courseId, this.lessonId, ex.id)
      .subscribe({
        next: () => this.toast.success(this.translate.instant('admin.deleted_success')),
        error: () => this.toast.error(this.translate.instant('common.error')),
      });
  }
}
