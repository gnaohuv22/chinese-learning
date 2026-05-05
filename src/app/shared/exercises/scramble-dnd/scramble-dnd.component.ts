import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { MediaEmbedComponent } from '../../components/media-embed/media-embed.component';

@Component({
  selector: 'app-exercise-scramble-dnd',
  standalone: true,
  imports: [CommonModule, DragDropModule, TranslateModule, MediaEmbedComponent],
  templateUrl: './scramble-dnd.component.html',
})
export class ScrambleDndComponent implements OnInit {
  @Input({ required: true }) exercise!: Exercise;

  arrangedWords = signal<string[]>([]);
  checked = signal(false);

  get correctWords(): string[] {
    const answer = this.exercise.answer;
    if (Array.isArray(answer)) return answer;
    if (typeof answer === 'string') {
      if (answer.includes(',')) {
        return answer.split(',').map(s => s.trim()).filter(Boolean);
      }
      return answer.split(/\s+/).filter(Boolean);
    }
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
