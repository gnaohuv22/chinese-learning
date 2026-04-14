import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { MockTestService } from '../../core/services/mock-test.service';
import { MockTest } from '../../core/models';

@Component({
  selector: 'app-mock-test-summary',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './mock-test-summary.component.html',
  styleUrl: './mock-test-summary.component.scss',
})
export class MockTestSummaryComponent implements OnInit {
  @Input({ required: true }) testId!: string;

  private mockTestService = inject(MockTestService);

  test = signal<MockTest | null>(null);
  loading = signal(true);
  notFound = signal(false);

  ngOnInit() {
    this.mockTestService.getMockTest(this.testId).pipe(take(1)).subscribe({
      next: (test) => {
        if (!test) {
          this.notFound.set(true);
        } else {
          this.test.set(test);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  totalExercises(): number {
    const t = this.test();
    if (!t) return 0;
    return this.mockTestService.totalExercises(t);
  }

  formatMinutes(seconds: number): number {
    return Math.round(seconds / 60);
  }

  skillSections(): Array<{ key: string; count: number }> {
    const t = this.test();
    if (!t) return [];
    return [
      { key: 'listening', count: t.sections.listening.length },
      { key: 'speaking', count: t.sections.speaking.length },
      { key: 'reading', count: t.sections.reading.length },
      { key: 'writing', count: t.sections.writing.length },
    ].filter((s) => s.count > 0);
  }
}
