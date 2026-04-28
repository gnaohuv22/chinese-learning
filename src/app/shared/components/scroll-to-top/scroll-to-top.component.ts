import { Component, HostListener, Input, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-to-top.component.html',
  styleUrl: './scroll-to-top.component.scss',
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  /** Pass a CSS selector for a custom scroll container (e.g. snap container). 
   *  Falls back to window scroll if not provided. */
  @Input() containerSelector?: string;

  isVisible = signal(false);
  private scrollThreshold = 200;
  private containerEl: HTMLElement | null = null;
  private boundHandler = this.onContainerScroll.bind(this);

  ngOnInit() {
    if (this.containerSelector) {
      this.containerEl = document.querySelector(this.containerSelector);
      this.containerEl?.addEventListener('scroll', this.boundHandler, { passive: true });
    }
  }

  ngOnDestroy() {
    this.containerEl?.removeEventListener('scroll', this.boundHandler);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.containerEl) return; // handled by container listener
    const yOffset = window.pageYOffset || document.documentElement.scrollTop;
    this.isVisible.set(yOffset > this.scrollThreshold);
  }

  private onContainerScroll() {
    const scrollTop = this.containerEl?.scrollTop ?? 0;
    this.isVisible.set(scrollTop > this.scrollThreshold);
  }

  scrollToTop() {
    if (this.containerEl) {
      this.containerEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
