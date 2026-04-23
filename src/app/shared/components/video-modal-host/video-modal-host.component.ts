import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VideoModalService } from '../../../core/services/video-modal.service';

@Component({
  selector: 'app-video-modal-host',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './video-modal-host.component.html',
})
export class VideoModalHostComponent {
  readonly videoModal = inject(VideoModalService);

  get state() {
    return this.videoModal.state();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (!this.state.open || this.state.type !== 'info') return;
    this.videoModal.closeInfo();
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
