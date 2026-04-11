import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NewsService } from '../../core/services/news.service';
import { News } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, DatePipe, PaginationComponent],
  templateUrl: './news-list.component.html',
})
export class NewsListComponent implements OnInit {
  private newsService = inject(NewsService);
  allNews = signal<News[]>([]);
  loading = signal(true);
  currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  newsList = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.allNews().slice(start, start + this.pageSize);
  });

  ngOnInit() {
    this.newsService.getNewsList().subscribe({
      next: (n) => {
        this.allNews.set(n.slice().reverse());
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  markdownExcerpt(content: string, maxLength = 150): string {
    return content
      .replace(/[#*_`>[\]()!]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, maxLength) + (content.length > maxLength ? '…' : '');
  }
}
