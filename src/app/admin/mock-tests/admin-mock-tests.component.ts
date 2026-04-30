import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MockTestService } from '../../core/services/mock-test.service';
import { MockTest, MockTestCreatePayload, HocPhan, MockTestQuestion, ExerciseType, SKILL_EXERCISE_TYPES } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { MediaEmbedComponent } from '../../shared/components/media-embed/media-embed.component';
import { ToastService } from '../../shared/components/toast/toast.service';
import { DriveUploadResponse } from '../../core/services/drive.service';

type Skill = 'listening' | 'speaking' | 'reading' | 'writing';

@Component({
  selector: 'app-admin-mock-tests',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TranslateModule, DragDropModule,
    FileUploaderComponent, MediaEmbedComponent
  ],
  templateUrl: './admin-mock-tests.component.html',
})
export class AdminMockTestsComponent implements OnInit {
  private mockTestService = inject(MockTestService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  mockTests = signal<MockTest[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingTest = signal<MockTest | null>(null);

  skills: Skill[] = ['listening', 'speaking', 'reading', 'writing'];
  hocPhanOptions = [1, 2, 3, 4] as const;

  sectionMap = signal<Record<Skill, MockTestQuestion[]>>({
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

  // Question editing state
  editingQuestionId = signal<string | null>(null);
  editingQuestionSkill = signal<Skill | null>(null);
  correctAnswers = signal<number[]>([]);
  validationErrors = signal<Record<string, string>>({});

  questionForm = this.fb.group({
    type: ['mcq' as ExerciseType, Validators.required],
    skill: ['listening' as Skill, Validators.required],
    prompt: ['', Validators.required],
    mediaUrl: [''],
    mediaType: [''],
    answer: [''],
    options: this.fb.array([]),
  });

  get optionsArray() {
    return this.questionForm.get('options') as FormArray;
  }

  get needsMedia(): boolean {
    return ['mcq', 'audio_mcq', 'dictation', 'interactive_video', 'reflex_speaking'].includes(
      this.questionForm.value.type ?? ''
    );
  }

  get needsOptions(): boolean {
    return ['mcq', 'audio_mcq'].includes(this.questionForm.value.type ?? '');
  }

  get needsAnswer(): boolean {
    return ['mcq', 'audio_mcq', 'dictation', 'scramble', 'scramble_dnd', 'viet_chinese_translation'].includes(this.questionForm.value.type ?? '');
  }

  mediaAccept(): string {
    const t = this.questionForm.value.mediaType;
    if (t === 'video') return 'video/*';
    if (t === 'audio') return 'audio/*';
    if (t === 'image') return 'image/*';
    return '*/*';
  }

  get validExerciseTypes(): ExerciseType[] {
    const skill = this.editingQuestionSkill();
    if (!skill) return [];
    return SKILL_EXERCISE_TYPES[skill];
  }

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
  }

  dropSection(event: CdkDragDrop<MockTestQuestion[]>, section: Skill) {
    const list = [...this.sectionMap()[section]];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.sectionMap.update((m) => ({ ...m, [section]: list }));
  }

  openCreate() {
    this.editingTest.set(null);
    this.form.reset({ title: '', description: '', hocPhan: 1, timeLimitSeconds: 3600 });
    this.sectionMap.set({ listening: [], speaking: [], reading: [], writing: [] });
    this.cancelQuestion();
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
      listening: [...(test.sections?.listening ?? [])],
      speaking: [...(test.sections?.speaking ?? [])],
      reading: [...(test.sections?.reading ?? [])],
      writing: [...(test.sections?.writing ?? [])],
    });
    this.showForm.set(true);
    this.cancelQuestion();
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingTest.set(null);
    this.cancelQuestion();
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.translate.instant('common.error'));
      return;
    }
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
      this.toast.success(this.translate.instant('common.save_success'));
    };
    const onError = () => {
      this.saving.set(false);
      this.toast.error(this.translate.instant('common.error'));
    };

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

  // Question editing methods
  addQuestion(skill: Skill) {
    this.editingQuestionId.set('new');
    this.editingQuestionSkill.set(skill);
    this.correctAnswers.set([]);
    this.validationErrors.set({});
    
    while (this.optionsArray.length) this.optionsArray.removeAt(0);
    
    const validTypes = SKILL_EXERCISE_TYPES[skill];
    const defaultType = validTypes.includes('mcq') ? 'mcq' : validTypes[0];

    this.questionForm.reset({
      type: defaultType,
      skill: skill,
      prompt: '',
      mediaUrl: '',
      mediaType: '',
      answer: ''
    });
  }

  editQuestion(q: MockTestQuestion, skill: Skill) {
    this.editingQuestionId.set(q.id);
    this.editingQuestionSkill.set(skill);
    this.correctAnswers.set([]);
    this.validationErrors.set({});

    while (this.optionsArray.length) this.optionsArray.removeAt(0);
    (q.options ?? []).forEach(o => this.optionsArray.push(this.fb.control(o)));

    this.questionForm.patchValue({
      type: q.type,
      skill: skill,
      prompt: q.prompt,
      mediaUrl: q.mediaUrl ?? '',
      mediaType: q.mediaType ?? '',
      answer: (q.type === 'mcq' || q.type === 'audio_mcq')
        ? ''
        : Array.isArray(q.answer) ? q.answer.join(', ') : (q.answer ?? '')
    });

    if ((q.type === 'mcq' || q.type === 'audio_mcq') && q.answer !== undefined) {
      const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
      const indices = answers
        .map(a => typeof a === 'string' ? parseInt(a, 10) : a)
        .filter(a => !isNaN(a as number)) as number[];
      this.correctAnswers.set(indices);
    }
  }

  async deleteQuestion(q: MockTestQuestion, skill: Skill) {
    const confirmed = await this.modalService.confirm({
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question?',
      type: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    
    this.sectionMap.update(m => {
      const list = m[skill].filter(x => x.id !== q.id);
      return { ...m, [skill]: list };
    });
  }

  cancelQuestion() {
    this.editingQuestionId.set(null);
    this.editingQuestionSkill.set(null);
  }

  saveQuestion() {
    this.questionForm.markAllAsTouched();

    const errors: Record<string, string> = {};
    if (this.questionForm.controls.prompt.invalid) errors['prompt'] = 'admin.error_required';
    if (this.questionForm.controls.type.invalid) errors['type'] = 'admin.error_required';
    if (this.needsOptions && this.optionsArray.length < 2) errors['options'] = 'admin.error_min_options';

    const vPre = this.questionForm.value;
    const typePre = vPre.type as ExerciseType;

    if ((typePre === 'mcq' || typePre === 'audio_mcq') && this.correctAnswers().length === 0) {
      errors['options'] = 'admin.error_min_correct';
    }
    if (typePre === 'dictation') {
      const mt = vPre.mediaType;
      if (!vPre.mediaUrl?.trim()) errors['media'] = 'admin.error_dictation_media';
      else if (mt !== 'audio' && mt !== 'video') errors['media'] = 'admin.error_dictation_media_type';
      if (!(vPre.answer?.trim() ?? '')) errors['answer'] = 'admin.error_dictation_answer';
    } else if (this.needsAnswer && typePre !== 'mcq' && typePre !== 'audio_mcq') {
      if (!(vPre.answer?.trim() ?? '')) {
        errors['answer'] = 'admin.error_required';
      }
    }

    this.validationErrors.set(errors);
    if (Object.keys(errors).length > 0) return;

    const v = this.questionForm.value;
    const type = v.type as ExerciseType;
    const skill = this.editingQuestionSkill()!;

    let answer: string | string[] | undefined;
    if (type === 'mcq' || type === 'audio_mcq') {
      const arr = this.correctAnswers();
      answer = arr.length > 0 ? arr.map(String) : undefined;
    } else {
      const answerRaw = v.answer?.trim() ?? '';
      if (answerRaw) {
        answer = (type === 'scramble' || type === 'scramble_dnd')
          ? answerRaw.split(/\s+/).filter(Boolean)
          : answerRaw;
      }
    }

    const q: MockTestQuestion = {
      id: this.editingQuestionId() === 'new' ? crypto.randomUUID() : this.editingQuestionId()!,
      type,
      skill,
      prompt: v.prompt!,
      ...(v.mediaUrl ? { mediaUrl: v.mediaUrl } : {}),
      ...(v.mediaType ? { mediaType: v.mediaType as any } : {}),
      ...(answer !== undefined ? { answer } : {}),
      ...(this.optionsArray.length ? { options: this.optionsArray.value.filter(Boolean) } : {}),
    };

    this.sectionMap.update(m => {
      const list = [...m[skill]];
      if (this.editingQuestionId() === 'new') {
        list.push(q);
      } else {
        const idx = list.findIndex(x => x.id === q.id);
        if (idx >= 0) list[idx] = q;
      }
      return { ...m, [skill]: list };
    });

    this.cancelQuestion();
  }

  // Form array helpers
  addOption() {
    if (this.optionsArray.length >= 10) return;
    this.optionsArray.push(this.fb.control(''));
  }
  removeOption(i: number) {
    this.optionsArray.removeAt(i);
    // Remove i from correctAnswers and shift indices > i
    this.correctAnswers.update(arr => 
      arr.filter(idx => idx !== i)
         .map(idx => idx > i ? idx - 1 : idx)
    );
  }
  toggleCorrectAnswer(i: number) {
    this.correctAnswers.update(arr => 
      arr.includes(i) ? arr.filter(x => x !== i) : [...arr, i]
    );
  }
  onMediaUploaded(resp: DriveUploadResponse) {
    this.questionForm.patchValue({ mediaUrl: resp.fileId });
  }
  onMediaCleared() {
    this.questionForm.patchValue({ mediaUrl: '' });
  }
}
