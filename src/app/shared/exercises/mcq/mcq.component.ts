import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MediaEmbedComponent } from '../../components/media-embed/media-embed.component';
import { Exercise } from '../../../core/models';

interface ShuffledOption {
  text: string;
  originalIndex: number;
}

/** Per-option visual state after checking */
type OptionState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'faded';

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
      this.displayOptions.set([...opts].sort(() => Math.random() - 0.5));
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
    if (answer === undefined || answer === null) return -1;
    
    let target: any = answer;
    if (Array.isArray(answer) && answer.length > 0) {
      target = answer[0];
    }
    
    if (typeof target === 'number') return target;
    
    if (typeof target === 'string') {
      const trimmed = target.trim();
      const idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx.toString() === trimmed) return idx;
      
      if (trimmed.length === 1) {
        const charCode = trimmed.toUpperCase().charCodeAt(0);
        if (charCode >= 65 && charCode <= 90) return charCode - 65;
      }
      
      const options = this.exercise.options || [];
      const foundIdx = options.findIndex(opt => opt.trim().toLowerCase() === trimmed.toLowerCase());
      if (foundIdx !== -1) return foundIdx;
      
      const partialIdx = options.findIndex(opt => 
        trimmed.toLowerCase().includes(opt.trim().toLowerCase()) || 
        opt.trim().toLowerCase().includes(trimmed.toLowerCase())
      );
      if (partialIdx !== -1) return partialIdx;
    }
    
    return -1;
  }

  private getDisplayCorrectIdx(): number {
    return this.displayOptions().findIndex(
      (o) => o.originalIndex === this.getCorrectOriginalIndex()
    );
  }

  isCorrect(): boolean {
    const selected = this.selectedIndex();
    if (selected === null) return false;
    return this.displayOptions()[selected]?.originalIndex === this.getCorrectOriginalIndex();
  }

  correctOptionText(): string {
    const correctOrig = this.getCorrectOriginalIndex();
    return this.exercise.options?.[correctOrig] ?? '';
  }

  optionLabel(i: number): string {
    return String.fromCharCode(65 + i);
  }

  optionState(i: number): OptionState {
    if (!this.checked()) {
      return this.selectedIndex() === i ? 'selected' : 'neutral';
    }
    const displayCorrectIdx = this.getDisplayCorrectIdx();
    if (i === displayCorrectIdx) return 'correct';
    if (i === this.selectedIndex()) return 'wrong';
    return 'faded';
  }

  optionStyle(i: number): Record<string, string> {
    const state = this.optionState(i);
    switch (state) {
      case 'selected':
        return {
          background: 'rgba(126, 72, 10, 0.12)',
          borderColor: 'var(--color-primary)',
          color: 'var(--color-text)',
        };
      case 'correct':
        return {
          background: 'rgba(22, 163, 74, 0.14)',
          borderColor: '#16a34a',
          color: '#15803d',
        };
      case 'wrong':
        return {
          background: 'rgba(220, 38, 38, 0.14)',
          borderColor: '#dc2626',
          color: '#dc2626',
        };
      case 'faded':
        return {
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
          opacity: '0.45',
        };
      default:
        return {
          background: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        };
    }
  }
}
