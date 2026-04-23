import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewsService } from '../../core/services/news.service';
import { News } from '../../core/models';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, TranslateModule, MarkdownViewerComponent],
  templateUrl: './news-detail.component.html',
  styleUrl: './news-detail.component.scss',
})
export class NewsDetailComponent implements OnInit {
  @Input({ required: true }) newsId!: string;

  private newsService = inject(NewsService);
  private destroyRef = inject(DestroyRef);
  news = signal<News | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.newsService
      .getNews(this.newsId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.news.set(n ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
