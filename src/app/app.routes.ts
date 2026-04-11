import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./portal/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'courses',
    loadComponent: () =>
      import('./portal/courses/course-list.component').then(
        (m) => m.CourseListComponent
      ),
  },
  {
    path: 'courses/:courseId',
    loadComponent: () =>
      import('./portal/courses/course-detail.component').then(
        (m) => m.CourseDetailComponent
      ),
  },
  {
    path: 'courses/:courseId/lessons/:lessonId',
    loadComponent: () =>
      import('./portal/lessons/lesson-detail.component').then(
        (m) => m.LessonDetailComponent
      ),
  },
  {
    path: 'exam/:examId',
    loadComponent: () =>
      import('./portal/exam/exam.component').then((m) => m.ExamComponent),
  },
  {
    path: 'news',
    loadComponent: () =>
      import('./portal/news/news-list.component').then(
        (m) => m.NewsListComponent
      ),
  },
  {
    path: 'news/:newsId',
    loadComponent: () =>
      import('./portal/news/news-detail.component').then(
        (m) => m.NewsDetailComponent
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent
      ),
    children: [
      {
        path: '',
        redirectTo: 'courses',
        pathMatch: 'full',
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./admin/courses/admin-courses.component').then(
            (m) => m.AdminCoursesComponent
          ),
      },
      {
        path: 'courses/:courseId/lessons',
        loadComponent: () =>
          import('./admin/lessons/admin-lessons.component').then(
            (m) => m.AdminLessonsComponent
          ),
      },
      {
        path: 'courses/:courseId/lessons/:lessonId/exercises',
        loadComponent: () =>
          import('./admin/exercises/admin-exercises.component').then(
            (m) => m.AdminExercisesComponent
          ),
      },
      {
        path: 'exams',
        loadComponent: () =>
          import('./admin/exams/admin-exams.component').then(
            (m) => m.AdminExamsComponent
          ),
      },
      {
        path: 'news',
        loadComponent: () =>
          import('./admin/news/admin-news.component').then(
            (m) => m.AdminNewsComponent
          ),
      },
      {
        path: 'submitted-exams',
        loadComponent: () =>
          import('./admin/submitted-exams/admin-submitted-exams.component').then(
            (m) => m.AdminSubmittedExamsComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
