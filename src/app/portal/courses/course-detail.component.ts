import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { Course, Lesson } from '../../core/models';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent implements OnInit {
  @Input({ required: true }) courseId!: string;

  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);

  course = signal<Course | null>(null);
  lessons = signal<Lesson[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.courseService.getCourse(this.courseId).subscribe((c) => {
      this.course.set(c ?? null);
      this.loading.set(false);
    });
    this.lessonService.getLessons(this.courseId).subscribe((l) =>
      this.lessons.set(l)
    );
  }
}
