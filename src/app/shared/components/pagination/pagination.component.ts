import { Component, Input, Output, EventEmitter, computed, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent implements OnChanges {
  @Input() total = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 1;
  @Output() pageChange = new EventEmitter<number>();

  pages = signal<number[]>([]);

  ngOnChanges() {
    const count = Math.ceil(this.total / this.pageSize);
    this.pages.set(Array.from({ length: count }, (_, i) => i + 1));
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) return this.pages();

    const pages: number[] = [];
    pages.push(1);
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      pages.push(p);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  goTo(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }
}
