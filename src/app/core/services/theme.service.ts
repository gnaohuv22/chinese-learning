import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    this.applyTheme(dark);
  }

  toggle() {
    this.applyTheme(!this.isDark());
  }

  private applyTheme(dark: boolean) {
    this.isDark.set(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }
}
