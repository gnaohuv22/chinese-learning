import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { MediaEmbedComponent } from '../../components/media-embed/media-embed.component';

@Component({
  selector: 'app-exercise-dictation',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MediaEmbedComponent],
  templateUrl: './dictation.component.html',
})
export class DictationComponent {
  @Input({ required: true }) exercise!: Exercise;

  userInput = signal('');
  checked = signal(false);

  constructor() {}

  // Media logic is now handled by app-media-embed

  check() {
    this.checked.set(true);
  }

  isCorrect(): boolean {
    const expected = this.expectedAnswer();
    if (!expected) return false;
    return this.userInput().trim() === expected.trim();
  }

  expectedAnswer(): string {
    const a = this.exercise.answer;
    if (Array.isArray(a) && a.length > 0) return typeof a[0] === 'string' ? a[0] : '';
    return typeof a === 'string' ? a : '';
  }
}
