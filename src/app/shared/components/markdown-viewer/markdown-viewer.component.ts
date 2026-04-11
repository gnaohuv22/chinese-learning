import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  SecurityContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

// marked is loaded dynamically from CDN as a UMD bundle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const marked: any;

@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="markdown-body prose prose-sm max-w-none"
      [innerHTML]="renderedHtml()"
    ></div>
  `,
  styles: [`
    :host { display: block; }

    .markdown-body :is(h1, h2, h3, h4, h5, h6) {
      font-weight: 600;
      line-height: 1.4;
      margin-top: 1em;
      margin-bottom: 0.5em;
      color: var(--color-text);
    }
    .markdown-body h1 { font-size: 1.5rem; }
    .markdown-body h2 { font-size: 1.25rem; }
    .markdown-body h3 { font-size: 1.1rem; }
    .markdown-body p { margin-bottom: 0.75em; color: var(--color-text); line-height: 1.7; }
    .markdown-body a { color: #b91c1c; text-decoration: underline; }
    .markdown-body a:hover { color: #991b1b; }
    .markdown-body ul, .markdown-body ol { padding-left: 1.5em; margin-bottom: 0.75em; color: var(--color-text); }
    .markdown-body li { margin-bottom: 0.25em; }
    .markdown-body blockquote {
      border-left: 3px solid #b91c1c;
      padding-left: 1em;
      margin: 0.75em 0;
      color: var(--color-text-muted);
      font-style: italic;
    }
    .markdown-body code {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      padding: 0.1em 0.4em;
      font-size: 0.85em;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      color: #b91c1c;
    }
    .markdown-body pre {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1em;
      overflow-x: auto;
      margin-bottom: 0.75em;
    }
    .markdown-body pre code {
      background: none;
      border: none;
      padding: 0;
      color: var(--color-text);
    }
    .markdown-body img { max-width: 100%; border-radius: 0.5rem; margin: 0.5em 0; }
    .markdown-body table { width: 100%; border-collapse: collapse; margin-bottom: 0.75em; font-size: 0.875rem; }
    .markdown-body th, .markdown-body td {
      border: 1px solid var(--color-border);
      padding: 0.4em 0.75em;
      text-align: left;
      color: var(--color-text);
    }
    .markdown-body th { background: var(--color-bg); font-weight: 600; }
    .markdown-body hr { border: none; border-top: 1px solid var(--color-border); margin: 1em 0; }
    .markdown-body strong { font-weight: 600; color: var(--color-text); }
    .markdown-body em { font-style: italic; }
  `],
})
export class MarkdownViewerComponent implements OnChanges {
  @Input() content = '';

  private sanitizer = inject(DomSanitizer);
  renderedHtml = signal<string>('');

  private markedLoaded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.render();
    }
  }

  private async render(): Promise<void> {
    await this.loadMarked();
    const html = marked.parse(this.content ?? '');
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
