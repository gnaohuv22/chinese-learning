import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  SecurityContext,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';

// marked is loaded dynamically from CDN as a UMD bundle (legacy Markdown support)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const marked: any;

/** Returns true when the string is HTML content produced by the WYSIWYG editor. */
function isHtmlContent(content: string): boolean {
  return /^[\s\n]*</.test(content.trim());
}

@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.scss',
})
export class MarkdownViewerComponent implements OnChanges {
  @Input() content = '';

  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  renderedHtml = signal<string>('');

  private markedLoaded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.render();
    }
  }

  private async render(): Promise<void> {
    const raw = this.content ?? '';

    if (isHtmlContent(raw)) {
      // Content from new WYSIWYG editor — sanitize and render directly
      const safe = this.sanitizer.sanitize(SecurityContext.HTML, raw) ?? '';
      this.renderedHtml.set(safe);
      return;
    }

    // Legacy Markdown content — parse with marked (CDN, browser-only)
    if (!isPlatformBrowser(this.platformId)) {
      this.renderedHtml.set(`<p>${raw}</p>`);
      return;
    }

    await this.loadMarked();
    const html = marked.parse(raw);
    const safe = this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
    this.renderedHtml.set(safe);
  }

  private loadMarked(): Promise<void> {
    if (this.markedLoaded || typeof marked !== 'undefined') {
      this.markedLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked@9/marked.min.js';
      script.onload = () => {
        this.markedLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
