import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NewsService } from '../../core/services/news.service';
import { News } from '../../core/models';
import { ModalService } from '../../shared/components/modal/modal.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { NewsFormComponent } from './news-form.component';

@Component({
  selector: 'app-admin-news',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule, NewsFormComponent],
  templateUrl: './admin-news.component.html',
})
export class AdminNewsComponent implements OnInit {
  @ViewChild(NewsFormComponent) formRef?: NewsFormComponent;

  private newsService = inject(NewsService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  newsList = signal<News[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingNews = signal<News | null>(null);

  ngOnInit() {
    this.newsService.getNewsList().subscribe({
      next: (n) => {
        this.newsList.set(n);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(news?: News) {
    this.editingNews.set(news ?? null);
    this.showForm.set(true);
  }

  editNews(news: News) {
    this.openForm(news);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingNews.set(null);
  }

  onSaved(payload: { title: string; content: string; publishedAt: Date }): void {
    const editing = this.editingNews();
    const isEditing = !!editing;
    this.formRef?.setSaving(true);

    const op$ = (editing
      ? this.newsService.updateNews(editing.id, payload)
      : this.newsService.createNews(payload)) as import('rxjs').Observable<unknown>;

    op$.subscribe({
      next: () => {
        this.formRef?.setSaving(false);
        this.closeForm();
        this.toast.success(
          this.translate.instant(isEditing ? 'admin.updated_success' : 'admin.created_success')
        );
      },
      error: () => {
        this.formRef?.setSaving(false);
        this.toast.error(this.translate.instant('common.error'));
      },
    });
  }

  markdownExcerpt(content: string, maxLength = 150): string {
    return content
      .replace(/[#*_`>[\]()!]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, maxLength) + (content.length > maxLength ? '…' : '');
  }

  async deleteNews(news: News) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_news_title'),
      message: this.translate.instant('admin.delete_confirm_msg', { name: news.title }),
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.newsService.deleteNews(news.id).subscribe({
      next: () => this.toast.success(this.translate.instant('admin.deleted_success')),
      error: () => this.toast.error(this.translate.instant('common.error')),
    });
  }
}
