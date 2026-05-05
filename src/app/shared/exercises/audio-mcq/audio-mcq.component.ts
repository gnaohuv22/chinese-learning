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
    const url = this.exercise.mediaUrl || '';
    if (url.startsWith('http')) return url; // Cloudinary or full URL
    return url ? this.drive.getDirectUrl(url) : '';
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

  isCorrect(): boolean {
    const selected = this.selectedIndex();
    if (selected === null) return false;
    return selected === this.getCorrectOriginalIndex();
  }

  correctOptionText(): string {
    const idx = this.getCorrectOriginalIndex();
    if (idx >= 0) return this.exercise.options?.[idx] ?? '';
    return '';
  }

  optionLabel(i: number): string {
    return String.fromCharCode(65 + i);
  }

  getOptionStyle(i: number): Record<string, string> {
    if (!this.checked()) {
      return this.selectedIndex() === i
        ? {
            background: 'rgba(126, 72, 10, 0.12)',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-text)',
          }
        : {
            background: 'var(--color-bg-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          };
    }
    const correctIdx = this.getCorrectOriginalIndex();

    if (i === correctIdx) {
      return {
        background: 'rgba(22, 163, 74, 0.14)',
        borderColor: '#16a34a',
        color: '#15803d',
      };
    }
    if (i === this.selectedIndex()) {
      return {
        background: 'rgba(220, 38, 38, 0.14)',
        borderColor: '#dc2626',
        color: '#dc2626',
      };
    }
    return {
      background: 'var(--color-bg-surface)',
      borderColor: 'var(--color-border)',
      color: 'var(--color-text-muted)',
      opacity: '0.45',
    };
  }
}
