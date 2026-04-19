import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { DriveService } from '../../../core/services/drive.service';

@Component({
  selector: 'app-exercise-dictation',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './dictation.component.html',
})
export class DictationComponent {
  @Input({ required: true }) exercise!: Exercise;

  userInput = signal('');
  checked = signal(false);

  constructor(private drive: DriveService) {}

  get audioSrc(): string {
    return this.exercise.mediaUrl ? this.drive.getDirectUrl(this.exercise.mediaUrl) : '';
  }

  get embedUrl(): string {
    return this.exercise.mediaUrl ? this.drive.getEmbedUrl(this.exercise.mediaUrl) : '';
  }

  get directUrl(): string {
    return this.exercise.mediaUrl ? this.drive.getDirectUrl(this.exercise.mediaUrl) : '';
  }

  check() {
    this.checked.set(true);
  }

  isCorrect(): boolean {
    const expected = this.exercise.answer;
    if (typeof expected !== 'string') return false;
    return this.userInput().trim() === expected.trim();
  }

  expectedAnswer(): string {
    const a = this.exercise.answer;
    return typeof a === 'string' ? a : '';
  }
}
