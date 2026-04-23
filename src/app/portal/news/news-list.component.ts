import { Component, inject, signal, OnInit, computed, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewsService } from '../../core/services/news.service';
import { News } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 10;
type NewsListViewState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, DatePipe, PaginationComponent],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss',
})
export class NewsListComponent implements OnInit {
  private newsService = inject(NewsService);
  private destroyRef = inject(DestroyRef);
  allNews = signal<News[]>([]);
  viewState = signal<NewsListViewState>('loading');
  currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  newsList = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.allNews().slice(start, start + this.pageSize);
  });

  ngOnInit() {
    this.newsService.getNewsList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.allNews.set(n);
          this.viewState.set(n.length > 0 ? 'ready' : 'empty');
        },
        error: (err) => {
          console.error('News load error:', err);
          this.viewState.set('error');
        },
      });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  markdownExcerpt(content: string, maxLength = 150): string {
    const plain = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // remove markdown images
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[#*_`>[\]()!]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.slice(0, maxLength) + (plain.length > maxLength ? '…' : '');
  }

  getNewsCover(news: News): string | null {
    if (news.mediaUrl) return news.mediaUrl;
    // Extract first markdown image: ![alt](url)
    const mdMatch = news.content.match(/!\[.*?\]\((.*?)\)/);
    if (mdMatch) return mdMatch[1];
    // Extract first HTML image: <img src="url">
    const htmlMatch = news.content.match(/<img.*?src=["'](.*?)["']/);
    if (htmlMatch) return htmlMatch[1];
    return null;
  }
}
