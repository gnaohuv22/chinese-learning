import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { MediaEmbedComponent } from '../../components/media-embed/media-embed.component';

@Component({
  selector: 'app-exercise-speaking-topic',
  standalone: true,
  imports: [CommonModule, TranslateModule, MediaEmbedComponent],
  templateUrl: './speaking-topic.component.html',
})
export class SpeakingTopicComponent {
  @Input({ required: true }) exercise!: Exercise;

  started = signal(false);

  start() {
    this.started.set(true);
  }

  reset() {
    this.started.set(false);
  }
}
