import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';

@Component({
  selector: 'app-exercise-guided-writing',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './guided-writing.component.html',
})
export class GuidedWritingComponent {
  @Input({ required: true }) exercise!: Exercise;

  userText = '';
  usedKeywordsCount = signal(0);

  onInput() {
    const text = this.userText.toLowerCase();
    const used = (this.exercise.keywords ?? []).filter((kw) =>
      text.includes(kw.toLowerCase())
    ).length;
    this.usedKeywordsCount.set(used);
  }

  isKeywordUsed(kw: string): boolean {
    return this.userText.toLowerCase().includes(kw.toLowerCase());
  }
}
