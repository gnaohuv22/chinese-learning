import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CherryInstance = any;

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.scss',
})
export class MarkdownEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorContainer') containerRef!: ElementRef<HTMLElement>;
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  private themeService = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);

  private cherryInstance: CherryInstance = null;

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange && this.cherryInstance) {
      const current = this.cherryInstance.getValue();
      if (current !== this.value) {
        this.cherryInstance.setValue(this.value ?? '');
      }
    }
  }

  private async initEditor(): Promise<void> {
    try {
      // Provide stub for echarts so Cherry's chart plugin doesn't throw on missing dep
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (!win.echarts) {
        win.echarts = {
          init: () => ({ setOption: () => {}, resize: () => {}, dispose: () => {}, clear: () => {} }),
          getInstanceByDom: () => null,
        };
      }

      // Dynamic import so SSR-safe; loads the installed npm package (v0.10.3)
      const { default: Cherry } = await import('cherry-markdown');

      if (!this.containerRef?.nativeElement) return;

      const isDark = this.themeService.isDark();

      this.cherryInstance = new Cherry({
        el: this.containerRef.nativeElement,
        value: this.value ?? '',
        theme: isDark ? 'dark' : 'light',
        height: '480px',
        editor: {
          height: '440px',
        },
        engine: {
          syntax: {
            table: { enableChart: false },
          },
        },
        toolbars: {
          toolbar: [
            'undo', 'redo', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'sub', 'sup', '|',
            'header', '|',
            { list: ['ol', 'ul', 'checklist'] }, 'quote', '|',
            'table', 'link', 'image', 'code', 'hr', '|',
            'togglePreview', 'switchModel', 'fullScreen',
          ],
          toolbarRight: [],
          bubble: false,
          float: false,
        },
        callback: {
          afterChange: (text: string) => {
            this.valueChange.emit(text);
          },
        },
      });

      // Force height after Cherry renders its DOM (Cherry may set inline styles)
      setTimeout(() => this.forceEditorHeight(), 100);
    } catch (err) {
      console.error('Cherry Markdown failed to initialize:', err);
    }
  }

  private forceEditorHeight() {
    const root = this.containerRef?.nativeElement;
    if (!root) return;
    const cherry = root.querySelector<HTMLElement>('.cherry');
    if (!cherry) return;
    cherry.style.height = '480px';
    const content = cherry.querySelector<HTMLElement>('.cherry-content');
    if (content) content.style.cssText += '; flex: 1; min-height: 0; overflow: hidden;';
    const editor = cherry.querySelector<HTMLElement>('.cherry-editor');
    if (editor) editor.style.cssText += '; flex: 1; height: 100%; min-height: 0;';
    const cm = cherry.querySelector<HTMLElement>('.CodeMirror');
    if (cm) cm.style.cssText += '; height: 100%; min-height: 0;';
    const cmScroll = cherry.querySelector<HTMLElement>('.CodeMirror-scroll');
    if (cmScroll) cmScroll.style.cssText += '; height: 100%; min-height: 0;';
    const preview = cherry.querySelector<HTMLElement>('.cherry-previewer');
    if (preview) preview.style.cssText += '; flex: 1; height: 100%; min-height: 0; overflow-y: auto;';
  }

  ngOnDestroy() {
    this.cherryInstance?.destroy?.();
    this.cherryInstance = null;
  }
}
