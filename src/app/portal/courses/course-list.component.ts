import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CourseService } from '../../core/services/course.service';
import { Course } from '../../core/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, PaginationComponent],
  templateUrl: './course-list.component.html',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);
  allCourses = signal<Course[]>([]);
  loading = signal(true);
  currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  courses = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.allCourses().slice(start, start + this.pageSize);
  });

  private readonly palette = [
    '#b91c1c', '#1d4ed8', '#15803d', '#7e22ce',
    '#b45309', '#0f766e', '#be185d', '#1e40af',
  ];

  courseColor(order: number): string {
    return this.palette[order % this.palette.length];
  }

  ngOnInit() {
    this.courseService.getCourses().subscribe({
      next: (c) => {
        this.allCourses.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
