import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LessonService } from '../../core/services/lesson.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { Lesson, Exercise, Skill } from '../../core/models';
import { ExerciseRendererComponent } from '../../shared/exercises/exercise-renderer.component';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule, ExerciseRendererComponent],
  templateUrl: './lesson-detail.component.html',
})
export class LessonDetailComponent implements OnInit {
  @Input({ required: true }) courseId!: string;
  @Input({ required: true }) lessonId!: string;

  private lessonService = inject(LessonService);
  private exerciseService = inject(ExerciseService);

  lesson = signal<Lesson | null>(null);
  allExercises = signal<Exercise[]>([]);
  activeSkill = signal<Skill>('listening');
  loading = signal(true);

  exercisesForActiveSkill() {
    return this.allExercises().filter((e) => e.skill === this.activeSkill());
  }

  ngOnInit() {
    this.lessonService.getLesson(this.courseId, this.lessonId).subscribe((l) => {
      if (l) {
        this.lesson.set(l);
        this.activeSkill.set(l.skills[0] ?? 'listening');
      }
      this.loading.set(false);
    });

    this.exerciseService.getExercises(this.courseId, this.lessonId).subscribe((exs) =>
      this.allExercises.set(exs)
    );
  }
}
