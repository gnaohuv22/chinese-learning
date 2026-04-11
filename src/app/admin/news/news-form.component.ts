import {
  Component,
  inject,
  signal,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownEditorComponent } from '../../shared/components/markdown-editor/markdown-editor.component';
import { News } from '../../core/models';

@Component({
  selector: 'app-news-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MarkdownEditorComponent],
  template: `
    <div class="card animate-slide-up border-2 border-red-200 dark:border-red-900">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold" style="color: var(--color-text)">
          @if (editingNews) {
            <i class="fa-solid fa-pen-to-square text-red-600 mr-2"></i>{{ 'common.edit' | translate }} — {{ editingNews.title }}
          } @else {
            <i class="fa-solid fa-plus text-red-600 mr-2"></i>{{ 'common.create' | translate }} — {{ 'admin.news' | translate }}
          }
        </h2>
        <button type="button" (click)="cancel.emit()" class="hover:opacity-70 transition-opacity" style="color: var(--color-text-muted)">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div class="form-field">
          <label class="form-label">{{ 'admin.news_title' | translate }} *</label>
          <input formControlName="title" class="form-input" [placeholder]="'admin.news_title' | translate" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ 'admin.news_content' | translate }} *</label>
          <app-markdown-editor
            [value]="form.value.content ?? ''"
            (valueChange)="form.patchValue({ content: $event })"
          />
        </div>

        <div class="form-field">
          <label class="form-label">{{ 'admin.publish_date' | translate }} *</label>
          <input formControlName="publishedAt" type="date" class="form-input" />
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t" style="border-color: var(--color-border)">
          <button type="button" class="btn-secondary" (click)="cancel.emit()">{{ 'common.cancel' | translate }}</button>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
            @if (saving()) {
              <i class="fa-solid fa-spinner animate-spin"></i>{{ 'common.loading' | translate }}
            } @else {
              <i class="fa-solid fa-floppy-disk"></i>{{ 'common.save' | translate }}
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class NewsFormComponent implements OnChanges {
  @Input() editingNews: News | null = null;
  @Output() saved = new EventEmitter<{ title: string; content: string; publishedAt: Date }>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  saving = signal(false);

  form = this.fb.group({
    title: ['', Validators.required],
    content: ['', Validators.required],
    publishedAt: [new Date().toISOString().split('T')[0], Validators.required],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingNews']) {
      const news = this.editingNews;
      const publishedAt = news?.publishedAt
        ? new Date(news.publishedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      this.form.reset({
        title: news?.title ?? '',
        content: news?.content ?? '',
        publishedAt,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.saved.emit({
      title: v.title!,
      content: v.content!,
      publishedAt: new Date(v.publishedAt!),
    });
  }

  setSaving(value: boolean): void {
    this.saving.set(value);
  }
}
