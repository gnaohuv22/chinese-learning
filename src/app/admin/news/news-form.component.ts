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
import { WysiwygEditorComponent } from '../../shared/components/wysiwyg-editor/wysiwyg-editor.component';
import { News } from '../../core/models';

@Component({
  selector: 'app-news-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, WysiwygEditorComponent],
  templateUrl: './news-form.component.html',
  styleUrl: './news-form.component.scss',
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
