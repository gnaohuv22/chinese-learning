import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { InteractiveVideoService } from '../../core/services/interactive-video.service';
import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { ModalService } from '../../shared/components/modal/modal.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { CloudinaryUploadResponse } from '../../core/services/cloudinary.service';
import { InteractiveVideo, VideoCheckpoint, Course, Lesson } from '../../core/models';

@Component({
  selector: 'app-admin-interactive-videos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    FileUploaderComponent,
  ],
  templateUrl: './admin-interactive-videos.component.html',
})
export class AdminInteractiveVideosComponent implements OnInit, OnDestroy {
  @ViewChild('previewVideoEl') previewVideoRef?: ElementRef<HTMLVideoElement>;

  private videoService = inject(InteractiveVideoService);
  private modalService = inject(ModalService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private destroyRef = inject(DestroyRef);

  courses = signal<Course[]>([]);
  selectedCourseLessons = signal<Lesson[]>([]);

  videos = signal<InteractiveVideo[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingVideo = signal<InteractiveVideo | null>(null);

  // Timestamp editor state
  previewTime = signal(0);
  previewDuration = signal(0);
  previewPlaying = signal(false);
  showCheckpointForm = signal(false);
  editingCheckpointIndex = signal<number | null>(null);

  // Checkpoints being built
  checkpoints = signal<VideoCheckpoint[]>([]);

  // Checkpoint sub-form
  cpForm = this.fb.group({
    question: ['', Validators.required],
    option0: ['', Validators.required],
    option1: ['', Validators.required],
    option2: [''],
    option3: [''],
    helperContent: [''],
    lessonLinkCourseId: [''],
    lessonLinkLessonId: [''],
  });

  /**
   * Tracks which option KEYS ('option0'…'option3') are marked correct.
   * We store keys — not text values — so duplicate/identical option texts
   * never cause false-positive cross-selection in the UI.
   */
  correctAnswerKeys = signal<string[]>([]);
  noCorrectAnswerError = signal(false);

  pinnedTimestamp = signal<number | null>(null);

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    videoUrl: ['', Validators.required],
    published: [false],
    order: [0],
  });

  ngOnInit() {
    this.videoService
      .getAllVideos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vids) => {
          this.videos.set(vids);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.courseService
      .getCourses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => this.courses.set(c));
  }

  ngOnDestroy() {
    this.previewVideoRef?.nativeElement?.pause();
  }

  // ─── Form open/close ──────────────────────────────────────────────────────

  openCreate() {
    this.editingVideo.set(null);
    this.checkpoints.set([]);
    this.showCheckpointForm.set(false);
    this.editingCheckpointIndex.set(null);
    this.pinnedTimestamp.set(null);
    this.form.reset({ title: '', description: '', videoUrl: '', published: false, order: this.videos().length });
    this.showForm.set(true);
  }

  openEdit(video: InteractiveVideo) {
    this.editingVideo.set(video);
    this.checkpoints.set([...(video.checkpoints ?? [])]);
    this.showCheckpointForm.set(false);
    this.editingCheckpointIndex.set(null);
    this.pinnedTimestamp.set(null);
    this.form.patchValue({
      title: video.title,
      description: video.description ?? '',
      videoUrl: video.videoUrl,
      published: video.published,
      order: video.order ?? 0,
    });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingVideo.set(null);
    this.showCheckpointForm.set(false);
  }

  // ─── Video upload ──────────────────────────────────────────────────────────

  onVideoUploaded(resp: CloudinaryUploadResponse) {
    // resp.fileId for cloudinary is the full URL
    this.form.patchValue({ videoUrl: resp.fileId });
  }

  onVideoClear() {
    this.form.patchValue({ videoUrl: '' });
  }

  // ─── Preview controls ─────────────────────────────────────────────────────

  onPreviewLoaded() {
    const v = this.previewVideoRef?.nativeElement;
    if (v) this.previewDuration.set(v.duration || 0);
  }

  onPreviewTimeUpdate() {
    const v = this.previewVideoRef?.nativeElement;
    if (v) this.previewTime.set(v.currentTime);
  }

  togglePreviewPlay() {
    const v = this.previewVideoRef?.nativeElement;
    if (!v) return;
    if (v.paused) { v.play(); this.previewPlaying.set(true); }
    else { v.pause(); this.previewPlaying.set(false); }
  }

  seekPreview(event: Event) {
    const val = +(event.target as HTMLInputElement).value;
    const v = this.previewVideoRef?.nativeElement;
    if (v) { v.currentTime = val; this.previewTime.set(val); }
  }

  pinCurrentTime() {
    this.pinnedTimestamp.set(this.previewTime());
    this.previewVideoRef?.nativeElement?.pause();
    this.previewPlaying.set(false);
    this.cpForm.reset({ lessonLinkCourseId: '', lessonLinkLessonId: '' });
    this.correctAnswerKeys.set([]);
    this.noCorrectAnswerError.set(false);
    this.selectedCourseLessons.set([]);
    this.editingCheckpointIndex.set(null);
    this.showCheckpointForm.set(true);
  }

  updatePinnedTimestamp() {
    this.pinnedTimestamp.set(this.previewTime());
  }

  formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onCourseChange(courseId: string) {
    this.selectedCourseLessons.set([]);
    this.cpForm.patchValue({ lessonLinkLessonId: '' });
    if (courseId) {
      this.lessonService
        .getLessons(courseId)
        .pipe(take(1))
        .subscribe((l) => {
          this.selectedCourseLessons.set(l);
        });
    }
  }

  // ─── Checkpoint sub-form ──────────────────────────────────────────────────

  getOptionsForForm(): string[] {
    const v = this.cpForm.value;
    return [v.option0, v.option1, v.option2, v.option3].filter(Boolean) as string[];
  }

  /**
   * Toggle which option KEY is correct — never the text value.
   * This means two options with identical text can never cross-select.
   */
  toggleCorrectAnswer(key: string) {
    const optionText = (this.cpForm.get(key)?.value as string) ?? '';
    if (!optionText) return;
    const current = this.correctAnswerKeys();
    if (current.includes(key)) {
      this.correctAnswerKeys.set(current.filter(k => k !== key));
    } else {
      this.correctAnswerKeys.set([...current, key]);
    }
    this.noCorrectAnswerError.set(false);
  }

  isCorrectAnswer(key: string): boolean {
    return this.correctAnswerKeys().includes(key);
  }

  openEditCheckpoint(index: number) {
    const cp = this.checkpoints()[index];
    this.editingCheckpointIndex.set(index);
    this.pinnedTimestamp.set(cp.timestamp);
    this.cpForm.patchValue({
      question: cp.question,
      option0: cp.options[0] ?? '',
      option1: cp.options[1] ?? '',
      option2: cp.options[2] ?? '',
      option3: cp.options[3] ?? '',
      helperContent: cp.helperContent ?? '',
      lessonLinkCourseId: cp.lessonLink?.courseId ?? '',
      lessonLinkLessonId: cp.lessonLink?.lessonId ?? '',
    });

    // Re-derive which keys are correct based on their position in cp.options
    const optionKeys = ['option0', 'option1', 'option2', 'option3'];
    const correctKeys = optionKeys.filter((_, i) =>
      i < cp.options.length && cp.correctAnswers.includes(cp.options[i])
    );
    this.correctAnswerKeys.set(correctKeys);
    this.noCorrectAnswerError.set(false);

    if (cp.lessonLink?.courseId) {
      this.lessonService
        .getLessons(cp.lessonLink.courseId)
        .pipe(take(1))
        .subscribe((l) => {
          this.selectedCourseLessons.set(l);
        });
    } else {
      this.selectedCourseLessons.set([]);
    }

    this.showCheckpointForm.set(true);
  }

  saveCheckpoint() {
    this.cpForm.markAllAsTouched();
    const v = this.cpForm.value;
    const options = this.getOptionsForForm();

    // Build correctAnswers from keys (not text) — immune to duplicate option text
    const correctAnswers = this.correctAnswerKeys()
      .map(k => (this.cpForm.get(k)?.value as string) ?? '')
      .filter(Boolean);

    if (correctAnswers.length === 0) {
      this.noCorrectAnswerError.set(true);
      return;
    }

    if (this.cpForm.invalid) return;

    let lessonLink: { courseId: string; lessonId: string; label: string } | undefined;
    if (v.lessonLinkCourseId && v.lessonLinkLessonId) {
      const c = this.courses().find(x => x.id === v.lessonLinkCourseId);
      const l = this.selectedCourseLessons().find(x => x.id === v.lessonLinkLessonId);
      if (c && l) {
        lessonLink = {
          courseId: c.id,
          lessonId: l.id,
          label: `${c.title} - ${l.title}`
        };
      }
    }

    const cp: any = {
      id: `cp_${Date.now()}`,
      timestamp: this.pinnedTimestamp() ?? 0,
      tolerance: 0.5,
      question: v.question!,
      options,
      correctAnswers,
    };
    if (v.helperContent) cp.helperContent = v.helperContent;
    if (lessonLink) cp.lessonLink = lessonLink;

    const list = [...this.checkpoints()];
    const editIdx = this.editingCheckpointIndex();
    if (editIdx !== null) {
      cp.id = list[editIdx].id;
      list[editIdx] = cp;
    } else {
      list.push(cp);
    }
    list.sort((a, b) => a.timestamp - b.timestamp);
    this.checkpoints.set(list);
    this.showCheckpointForm.set(false);
    this.editingCheckpointIndex.set(null);
    this.pinnedTimestamp.set(null);
    this.correctAnswerKeys.set([]);
    this.noCorrectAnswerError.set(false);
    this.cpForm.reset({ lessonLinkCourseId: '', lessonLinkLessonId: '' });
  }

  cancelCheckpoint() {
    this.showCheckpointForm.set(false);
    this.editingCheckpointIndex.set(null);
    this.correctAnswerKeys.set([]);
    this.noCorrectAnswerError.set(false);
  }

  removeCheckpoint(index: number) {
    const list = [...this.checkpoints()];
    list.splice(index, 1);
    this.checkpoints.set(list);
  }

  // ─── Save video ───────────────────────────────────────────────────────────

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const v = this.form.value;
    const payload: any = {
      title: v.title!,
      videoUrl: v.videoUrl!,
      published: v.published ?? false,
      order: v.order ?? 0,
      checkpoints: this.checkpoints(),
    };
    if (v.description) {
      payload.description = v.description;
    }

    const editing = this.editingVideo();
    const op$ = (editing
      ? this.videoService.updateVideo(editing.id, payload)
      : this.videoService.createVideo(payload)) as import('rxjs').Observable<any>;

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.toast.success(this.translate.instant(editing ? 'admin.updated_success' : 'admin.created_success'));
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.translate.instant('common.error'));
      },
    });
  }

  async deleteVideo(video: InteractiveVideo) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_video_title'),
      message: this.translate.instant('admin.delete_confirm_msg', { name: video.title }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.videoService.deleteVideo(video.id).subscribe({
      next: () => this.toast.success(this.translate.instant('admin.deleted_success')),
      error: () => this.toast.error(this.translate.instant('common.error')),
    });
  }
}
