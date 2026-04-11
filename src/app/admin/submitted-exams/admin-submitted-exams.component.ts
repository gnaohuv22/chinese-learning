import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SubmittedExamService } from '../../core/services/submitted-exam.service';
import { SubmittedExam } from '../../core/models/submitted-exam.model';
import { ModalService } from '../../shared/components/modal/modal.service';

@Component({
  selector: 'app-admin-submitted-exams',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule],
  templateUrl: './admin-submitted-exams.component.html',
})
export class AdminSubmittedExamsComponent implements OnInit {
  private service = inject(SubmittedExamService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);

  submissions = signal<SubmittedExam[]>([]);
  loading = signal(true);
  expandedId = signal<string | null>(null);

  ngOnInit() {
    this.service.getSubmissions().subscribe({
      next: (data) => {
        this.submissions.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleExpand(id: string) {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  scorePercent(sub: SubmittedExam): number {
    return sub.totalExercises > 0
      ? Math.round((sub.totalScore / sub.totalExercises) * 100)
      : 0;
  }

  async deleteSubmission(sub: SubmittedExam) {
    const confirmed = await this.modalService.confirm({
      title: this.translate.instant('admin.delete_submission_title'),
      message: `${sub.participantName} — ${sub.examTitle}`,
      type: 'danger',
      confirmLabel: this.translate.instant('common.delete'),
    });
    if (!confirmed) return;
    this.service.deleteSubmission(sub.id).subscribe();
  }
}
