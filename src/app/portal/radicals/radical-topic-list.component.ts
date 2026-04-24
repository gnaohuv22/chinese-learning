import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RadicalTopic } from '../../core/models';
import { RadicalTopicService } from '../../core/services/radical-topic.service';

@Component({
  selector: 'app-radical-topic-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './radical-topic-list.component.html',
})
export class RadicalTopicListComponent {
  private topicService = inject(RadicalTopicService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  topics = signal<RadicalTopic[]>([]);
  loading = signal(true);
  hasError = signal(false);

  constructor() {
    this.topicService
      .getPublishedTopics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (topics) => {
          this.topics.set(topics);
          this.loading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.loading.set(false);
        },
      });
  }

  openTopic(topicId: string) {
    this.router.navigate(['/bo-thu', topicId]);
  }
}
