import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed bottom-4 left-4 z-[300] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up pointer-events-auto max-w-xs"
          [class]="toastClasses(toast)"
          role="alert"
        >
          <i [class]="toastIcon(toast)"></i>
          <span class="flex-1">{{ toast.message }}</span>
          <button
            (click)="toastService.dismiss(toast.id)"
            class="ml-2 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label="Dismiss"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  toastClasses(toast: Toast): string {
    const base = 'border';
    switch (toast.type) {
      case 'success':
        return `${base} bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700`;
      case 'error':
        return `${base} bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700`;
      case 'info':
        return `${base} bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700`;
    }
  }

  toastIcon(toast: Toast): string {
    switch (toast.type) {
      case 'success':
        return 'fa-solid fa-circle-check text-green-500';
      case 'error':
        return 'fa-solid fa-circle-xmark text-red-500';
      case 'info':
        return 'fa-solid fa-circle-info text-blue-500';
    }
  }
}
