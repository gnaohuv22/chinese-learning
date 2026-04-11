import { Component, Input, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { DriveService } from '../../../core/services/drive.service';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

@Component({
  selector: 'app-exercise-audio-mcq',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './audio-mcq.component.html',
})
export class AudioMcqComponent {
  @Input({ required: true }) exercise!: Exercise;
  @ViewChild('audioEl') audioElRef?: ElementRef<HTMLAudioElement>;

  speeds = SPEED_OPTIONS;
  currentSpeed = signal(1);
  selectedIndex = signal<number | null>(null);
  checked = signal(false);

  constructor(private drive: DriveService) {}

  get audioSrc(): string {
    return this.exercise.mediaUrl
      ? this.drive.getDirectUrl(this.exercise.mediaUrl)
      : '';
  }

  setSpeed(speed: number) {
    this.currentSpeed.set(speed);
    if (this.audioElRef?.nativeElement) {
      this.audioElRef.nativeElement.playbackRate = speed;
    }
  }

  selectOption(i: number) {
    if (!this.checked()) this.selectedIndex.set(i);
  }

  check() {
    this.checked.set(true);
  }

  isCorrect(): boolean {
    const answer = this.exercise.answer;
    const selected = this.selectedIndex();
    if (selected === null) return false;
    if (typeof answer === 'string') {
      const idx = parseInt(answer, 10);
      if (!isNaN(idx)) return selected === idx;
      return (this.exercise.options?.[selected] ?? '') === answer;
    }
    return false;
  }

  correctOptionText(): string {
    const answer = this.exercise.answer;
    if (typeof answer === 'string') {
      const idx = parseInt(answer, 10);
      if (!isNaN(idx)) return this.exercise.options?.[idx] ?? answer;
      return answer;
    }
    return '';
  }

  optionLabel(i: number): string {
    return String.fromCharCode(65 + i);
  }

  getOptionClass(i: number): string {
    const base = 'border-2 ';
    if (!this.checked()) {
      return (
        base +
        (this.selectedIndex() === i
          ? 'border-red-500 bg-red-50'
          : 'border-gray-200 bg-white hover:border-gray-300')
      );
    }
    const answer = this.exercise.answer;
    const correctIdx =
      typeof answer === 'string' && !isNaN(parseInt(answer, 10))
        ? parseInt(answer, 10)
        : this.exercise.options?.indexOf(answer as string) ?? -1;

    if (i === correctIdx) return base + 'border-green-500 bg-green-50';
    if (i === this.selectedIndex()) return base + 'border-red-500 bg-red-50';
    return base + 'border-gray-200 bg-white opacity-50';
  }
}
