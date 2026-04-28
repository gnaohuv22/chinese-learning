import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { ModalService } from '../../shared/components/modal/modal.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { DriveUploadResponse } from '../../core/services/drive.service';
import { RadicalTopic, RadicalTopicCreatePayload } from '../../core/models';
import { RadicalTopicService } from '../../core/services/radical-topic.service';

@Component({
  selector: 'app-admin-radicals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DragDropModule,
    FileUploaderComponent,
  ],
  templateUrl: './admin-radicals.component.html',
})
export class AdminRadicalsComponent {
  private topicService = inject(RadicalTopicService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  topics = signal<RadicalTopic[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingTopic = signal<RadicalTopic | null>(null);

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    published: [false],
    characters: this.fb.array([]),
  });

  constructor() {
    this.topicService
      .getAllTopics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (topics) => {
          this.topics.set(topics);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  get characterArray(): FormArray {
    return this.form.controls.characters;
  }

  private createCharacterGroup() {
    return this.fb.group({
      hanzi: ['', Validators.required],
      pinyin: ['', Validators.required],
      definition: ['', Validators.required],
      videoUrl: [''],
    });
  }

  addCharacter() {
    if (this.characterArray.length >= 10) return;
    this.characterArray.push(this.createCharacterGroup());
  }

  removeCharacter(index: number) {
    if (this.characterArray.length <= 1) return;
    this.characterArray.removeAt(index);
  }

  openCreate() {
    this.editingTopic.set(null);
    this.form.reset({
      title: '',
      description: '',
      published: false,
    });
    this.characterArray.clear();
    this.addCharacter();
    this.showForm.set(true);
  }

  openEdit(topic: RadicalTopic) {
    this.editingTopic.set(topic);
    this.form.reset({
      title: topic.title,
      description: topic.description ?? '',
      published: topic.published,
    });
    this.characterArray.clear();
    topic.characters.forEach((char) => {
      this.characterArray.push(
        this.fb.group({
          hanzi: [char.hanzi, Validators.required],
          pinyin: [char.pinyin, Validators.required],
          definition: [char.definition, Validators.required],
          videoUrl: [char.videoUrl ?? ''],
        })
      );
    });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingTopic.set(null);
  }

  onVideoUploaded(resp: DriveUploadResponse, index: number) {
    this.characterArray.at(index).patchValue({ videoUrl: resp.fileId });
  }

  onVideoClear(index: number) {
    this.characterArray.at(index).patchValue({ videoUrl: '' });
  }

  drop(event: CdkDragDrop<RadicalTopic[]>) {
    const list = [...this.topics()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.topics.set(list);
    list.forEach((topic, idx) => {
      this.topicService.updateTopic(topic.id, { order: idx }).subscribe();
    });
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.characterArray.length < 1) return;

    this.saving.set(true);
    const value = this.form.getRawValue();
    const payload: RadicalTopicCreatePayload = {
      title: value.title!.trim(),
      description: value.description?.trim() ?? '',
      published: value.published ?? false,
      order: this.editingTopic()?.order ?? this.topics().length,
      characters: this.characterArray.controls.map((group) => ({
        hanzi: group.value.hanzi.trim(),
        pinyin: group.value.pinyin.trim(),
        definition: group.value.definition.trim(),
        videoUrl: group.value.videoUrl?.trim() || undefined,
      })),
    };

    const editing = this.editingTopic();
    const op$ = (editing
      ? this.topicService.updateTopic(editing.id, payload)
      : this.topicService.createTopic(payload)) as import('rxjs').Observable<unknown>;

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success(
          this.translate.instant(editing ? 'admin.updated_success' : 'admin.created_success')
        );
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.translate.instant('common.error'));
      },
    });
  }

  async deleteTopic(topic: RadicalTopic) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_topic_title'),
      message: this.translate.instant('admin.delete_confirm_msg', { name: topic.title }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.topicService.deleteTopic(topic.id).subscribe({
      next: () => this.toast.success(this.translate.instant('admin.deleted_success')),
      error: () => this.toast.error(this.translate.instant('common.error')),
    });
  }
}
