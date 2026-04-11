import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

const SUPPORTED_LANGS = [
  { code: 'vi', label: 'Tiếng Việt', abbr: 'VI' },
  { code: 'en', label: 'English', abbr: 'EN' },
  { code: 'zh', label: '中文', abbr: 'ZH' },
];

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
})
export class LanguageSwitcherComponent {
  translate = inject(TranslateService);
  dropdownOpen = signal(false);
  langs = SUPPORTED_LANGS;

  currentLang = signal(
    SUPPORTED_LANGS.find(
      (l) =>
        l.code === (localStorage.getItem('lang') ?? this.translate.currentLang)
    ) ?? SUPPORTED_LANGS[0]
  );

  toggleDropdown() {
    this.dropdownOpen.update((v) => !v);
  }

  switchLang(code: string) {
    this.translate.use(code);
    localStorage.setItem('lang', code);
    this.currentLang.set(
      SUPPORTED_LANGS.find((l) => l.code === code) ?? SUPPORTED_LANGS[0]
    );
    this.dropdownOpen.set(false);
  }
}
