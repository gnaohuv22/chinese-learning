import { Component, Input, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Exercise } from '../../../core/models';
import { CloudinaryService } from '../../../core/services/cloudinary.service';

type RecordingState = 'idle' | 'recording' | 'uploading' | 'saved' | 'error';

@Component({
  selector: 'app-exercise-speaking-record',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './speaking-record.component.html',
})
export class SpeakingRecordComponent implements OnDestroy {
  @Input({ required: true }) exercise!: Exercise;

  private cloudinary = inject(CloudinaryService);

  state = signal<RecordingState>('idle');
  recordedUrl = signal<string | null>(null);
  errorMessage = signal('');
  recordingDuration = signal(0);

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private durationInterval: ReturnType<typeof setInterval> | null = null;

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.recordingDuration.set(0);
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        this.uploadRecording();
      };

      this.mediaRecorder.start(250);
      this.state.set('recording');

      this.durationInterval = setInterval(() => {
        this.recordingDuration.update((d) => d + 1);
      }, 1000);
    } catch {
      this.state.set('error');
      this.errorMessage.set('Không thể truy cập microphone');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private uploadRecording() {
    this.state.set('uploading');
    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const localUrl = URL.createObjectURL(blob);
    this.recordedUrl.set(localUrl);

    const filename = `recording_${Date.now()}.webm`;
    this.cloudinary.uploadFile(blob, filename, 'audio/webm').subscribe({
      next: () => {
        this.state.set('saved');
      },
      error: () => {
        this.state.set('error');
        this.errorMessage.set('Không thể tải lên bản ghi. Vui lòng thử lại.');
      },
    });
  }

  reset() {
    this.stopRecording();
    if (this.recordedUrl()) {
      URL.revokeObjectURL(this.recordedUrl()!);
    }
    this.recordedUrl.set(null);
    this.state.set('idle');
    this.errorMessage.set('');
    this.recordingDuration.set(0);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnDestroy() {
    this.stopRecording();
    if (this.recordedUrl()) {
      URL.revokeObjectURL(this.recordedUrl()!);
    }
  }
}
