import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ElementRef,
  ViewChild,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

interface ToolbarButton {
  command?: string;
  value?: string;
  icon: string;
  title: string;
  action?: () => void;
}

interface LinkPanel {
  url: string;
  text: string;
}

@Component({
  selector: 'app-wysiwyg-editor',
  standalone: true,
  templateUrl: './wysiwyg-editor.component.html',
  styleUrl: './wysiwyg-editor.component.scss',
})
export class WysiwygEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('editorArea') editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  private platformId = inject(PLATFORM_ID);
  protected themeService = inject(ThemeService);
  isDark = this.themeService.isDark;

  private isBrowser = isPlatformBrowser(this.platformId);
  private internalUpdate = false;
  private savedRange: Range | null = null;

  // Null when closed; populated when the link panel is open
  readonly linkPanel = signal<LinkPanel | null>(null);

  readonly toolbarGroups: ToolbarButton[][] = [
    [
      { command: 'undo', icon: 'fa-solid fa-rotate-left', title: 'Undo' },
      { command: 'redo', icon: 'fa-solid fa-rotate-right', title: 'Redo' },
    ],
    [
      { command: 'bold',          icon: 'fa-solid fa-bold',          title: 'Bold' },
      { command: 'italic',        icon: 'fa-solid fa-italic',        title: 'Italic' },
      { command: 'underline',     icon: 'fa-solid fa-underline',     title: 'Underline' },
      { command: 'strikeThrough', icon: 'fa-solid fa-strikethrough', title: 'Strikethrough' },
    ],
    [
      { icon: 'fa-solid fa-heading',    title: 'Heading 1', action: () => this.insertHeading('H1') },
      { icon: 'fa-solid fa-h',          title: 'Heading 2', action: () => this.insertHeading('H2') },
      { icon: 'fa-solid fa-text-height', title: 'Heading 3', action: () => this.insertHeading('H3') },
    ],
    [
      { command: 'insertOrderedList',   icon: 'fa-solid fa-list-ol',      title: 'Ordered list' },
      { command: 'insertUnorderedList', icon: 'fa-solid fa-list-ul',      title: 'Unordered list' },
      { command: 'formatBlock', value: 'blockquote', icon: 'fa-solid fa-quote-left', title: 'Blockquote' },
    ],
    [
      { icon: 'fa-solid fa-link',  title: 'Insert link',  action: () => this.openLinkPanel() },
      { icon: 'fa-solid fa-image', title: 'Insert image', action: () => this.triggerImagePicker() },
      { icon: 'fa-solid fa-code',  title: 'Inline code',  action: () => this.insertInlineCode() },
      { command: 'removeFormat', icon: 'fa-solid fa-text-slash', title: 'Clear formatting' },
    ],
  ];

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    this.setEditorContent(this.value);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['value'] &&
      !changes['value'].firstChange &&
      this.isBrowser &&
      this.editorRef?.nativeElement &&
      !this.internalUpdate
    ) {
      this.setEditorContent(this.value);
    }
  }

  ngOnDestroy() {}

  private setEditorContent(html: string) {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    if (el.innerHTML !== html) {
      el.innerHTML = html ?? '';
    }
  }

  onInput() {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    this.internalUpdate = true;
    this.valueChange.emit(el.innerHTML);
    this.internalUpdate = false;
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  }

  onToolbarMousedown(event: MouseEvent, btn: ToolbarButton) {
    // Prevent editor from losing focus when clicking toolbar
    event.preventDefault();

    if (btn.action) {
      btn.action();
    } else if (btn.command) {
      document.execCommand(btn.command, false, btn.value ?? '');
      this.onInput();
    }
  }

  // ─── Link panel ────────────────────────────────────────────────────────────

  private openLinkPanel() {
    const sel = window.getSelection();
    this.savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    this.linkPanel.set({ url: 'https://', text: sel?.toString() ?? '' });
  }

  updateLinkField(field: keyof LinkPanel, value: string) {
    const panel = this.linkPanel();
    if (panel) this.linkPanel.set({ ...panel, [field]: value });
  }

  confirmLink() {
    const panel = this.linkPanel();
    if (!panel) return;

    const url = panel.url.trim();
    if (!url || url === 'https://') {
      this.linkPanel.set(null);
      this.savedRange = null;
      return;
    }

    const text = panel.text.trim() || url;

    this.editorRef.nativeElement.focus();
    if (this.savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.savedRange);
    }

    document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener">${text}</a>`);
    this.onInput();
    this.linkPanel.set(null);
    this.savedRange = null;
  }

  cancelLink() {
    this.linkPanel.set(null);
    this.savedRange = null;
  }

  // ─── Image file picker ─────────────────────────────────────────────────────

  private triggerImagePicker() {
    this.fileInputRef?.nativeElement.click();
  }

  onImageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.editorRef.nativeElement.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${dataUrl}" alt="${file.name}" style="max-width:100%;border-radius:6px;" />`,
      );
      this.onInput();
    };
    reader.readAsDataURL(file);
    input.value = ''; // allow re-selecting the same file
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private insertHeading(tag: 'H1' | 'H2' | 'H3') {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let block = range.commonAncestorContainer as Element;
    if (block.nodeType === Node.TEXT_NODE) {
      block = block.parentElement as Element;
    }

    const editor = this.editorRef.nativeElement;
    while (block && block !== editor && block.parentElement !== editor) {
      block = block.parentElement as Element;
    }

    if (block && block !== editor && ['H1','H2','H3','P','DIV','BLOCKQUOTE','LI'].includes(block.tagName)) {
      // Toggle: if already the requested heading, convert back to paragraph
      document.execCommand('formatBlock', false, block.tagName === tag ? 'p' : tag.toLowerCase());
    } else {
      document.execCommand('formatBlock', false, tag.toLowerCase());
    }
    this.onInput();
  }

  private insertInlineCode() {
    const sel = window.getSelection();
    const selectedText = sel?.toString() ?? '';
    document.execCommand('insertHTML', false, `<code>${selectedText || 'code'}</code>`);
    this.onInput();
  }
}
