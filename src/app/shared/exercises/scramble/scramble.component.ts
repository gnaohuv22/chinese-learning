import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';

@Component({
  selector: 'app-exercise-scramble',
  standalone: true,
  imports: [CommonModule, DragDropModule, TranslateModule],
  templateUrl: './scramble.component.html',
})
export class ScrambleComponent implements OnInit {
  @Input({ required: true }) exercise!: Exercise;

  arrangedWords = signal<string[]>([]);
  checked = signal(false);

  get correctWords(): string[] {
    const answer = this.exercise.answer;
    if (Array.isArray(answer)) return answer;
    if (typeof answer === 'string') return answer.split(/\s+/).filter(Boolean);
    return [];
  }

  get correctSentence(): string {
    return this.correctWords.join(' ');
  }

  ngOnInit() {
    this.reset();
  }

  reset() {
    const shuffled = [...this.correctWords].sort(() => Math.random() - 0.5);
    this.arrangedWords.set(shuffled);
    this.checked.set(false);
  }

  drop(event: CdkDragDrop<string[]>) {
    const words = [...this.arrangedWords()];
    moveItemInArray(words, event.previousIndex, event.currentIndex);
    this.arrangedWords.set(words);
  }

  check() {
    this.checked.set(true);
  }

  isCorrect(): boolean {
    return (
      JSON.stringify(this.arrangedWords()) === JSON.stringify(this.correctWords)
    );
  }
}
