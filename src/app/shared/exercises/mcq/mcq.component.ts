import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MediaEmbedComponent } from '../../components/media-embed/media-embed.component';
import { Exercise } from '../../../core/models';

interface ShuffledOption {
  text: string;
  originalIndex: number;
}

@Component({
  selector: 'app-exercise-mcq',
  standalone: true,
  imports: [CommonModule, TranslateModule, MediaEmbedComponent],
  templateUrl: './mcq.component.html',
})
export class McqComponent implements OnInit {
  @Input({ required: true }) exercise!: Exercise;

  selectedIndex = signal<number | null>(null);
  checked = signal(false);
  displayOptions = signal<ShuffledOption[]>([]);

  ngOnInit() {
    this.buildOptions();
  }

  private buildOptions() {
    const opts = (this.exercise.options ?? []).map((text, idx) => ({ text, originalIndex: idx }));
    if (this.exercise.shuffle) {
      const shuffled = [...opts].sort(() => Math.random() - 0.5);
      this.displayOptions.set(shuffled);
    } else {
      this.displayOptions.set(opts);
    }
  }

  selectOption(displayIdx: number) {
    if (!this.checked()) {
      this.selectedIndex.set(displayIdx);
    }
  }

  check() {
    this.checked.set(true);
  }

  reset() {
    this.selectedIndex.set(null);
    this.checked.set(false);
    this.buildOptions();
  }

  private getCorrectOriginalIndex(): number {
    const answer = this.exercise.answer;
    if (typeof answer === 'string') {
      const idx = parseInt(answer, 10);
      if (!isNaN(idx)) return idx;
      return this.exercise.options?.indexOf(answer) ?? -1;
    }
    return -1;
  }

  isCorrect(): boolean {
    const selected = this.selectedIndex();
    if (selected === null) return false;
    const selectedOriginal = this.displayOptions()[selected]?.originalIndex ?? -1;
    return selectedOriginal === this.getCorrectOriginalIndex();
  }

  correctOptionText(): string {
    const correctOrig = this.getCorrectOriginalIndex();
    return this.exercise.options?.[correctOrig] ?? '';
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

    const correctOrig = this.getCorrectOriginalIndex();
    const displayCorrectIdx = this.displayOptions().findIndex(
      (o) => o.originalIndex === correctOrig
    );

    if (i === displayCorrectIdx) return base + 'border-green-500 bg-green-50';
    if (i === this.selectedIndex() && i !== displayCorrectIdx) return base + 'border-red-500 bg-red-50';
    return base + 'border-gray-200 bg-white opacity-50';
  }
}
