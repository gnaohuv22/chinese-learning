import { Injectable, signal } from '@angular/core';

export type ModalType = 'danger' | 'warning' | 'info';

export interface ModalOptions {
  title: string;
  message?: string;
  type?: ModalType;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ModalState extends ModalOptions {
  open: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  state = signal<ModalState>({ open: false, title: '', type: 'danger' });

  private resolveCallback: ((confirmed: boolean) => void) | null = null;

  confirm(options: ModalOptions): Promise<boolean> {
    this.state.set({ open: true, type: 'danger', ...options });
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
    });
  }

  resolve(confirmed: boolean) {
    this.state.update((s) => ({ ...s, open: false }));
    this.resolveCallback?.(confirmed);
    this.resolveCallback = null;
  }
}
