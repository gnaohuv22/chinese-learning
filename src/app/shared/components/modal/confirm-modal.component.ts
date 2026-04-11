import {
  Component,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ModalService, ModalOptions } from './modal.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './confirm-modal.component.html',
})
export class ConfirmModalComponent {
  private modalService = inject(ModalService);

  get state() {
    return this.modalService.state();
  }

  confirm() {
    this.modalService.resolve(true);
  }

  cancel() {
    this.modalService.resolve(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.state.open) this.cancel();
  }
}
