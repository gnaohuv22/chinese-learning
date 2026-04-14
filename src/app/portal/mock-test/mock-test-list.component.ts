import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MockTestService } from '../../core/services/mock-test.service';
import { MockTest, HocPhan } from '../../core/models';

@Component({
  selector: 'app-mock-test-list',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './mock-test-list.component.html',
  styleUrl: './mock-test-list.component.scss',
})
export class MockTestListComponent implements OnInit {
  private mockTestService = inject(MockTestService);

  allTests = signal<MockTest[]>([]);
  loading = signal(true);
  activeHocPhan = signal<HocPhan>(1);

  hocPhanItems = [1, 2, 3, 4] as const;

  filteredTests = computed(() =>
    this.allTests().filter((t) => t.hocPhan === this.activeHocPhan())
  );

  ngOnInit() {
    this.mockTestService.getMockTests().subscribe({
      next: (tests) => {
        this.allTests.set(tests);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  countForHocPhan(n: HocPhan): number {
    return this.allTests().filter((t) => t.hocPhan === n).length;
  }

  totalExercises(test: MockTest): number {
    return this.mockTestService.totalExercises(test);
  }

  formatMinutes(seconds: number): number {
    return Math.round(seconds / 60);
  }

  selectHocPhan(n: HocPhan) {
    this.activeHocPhan.set(n);
  }
}
