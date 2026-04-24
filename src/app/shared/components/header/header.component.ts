import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { ThemeService } from '../../../core/services/theme.service';

interface FloatingChar {
  char: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const FLOAT_CHARS = ['汉', '语', '记', '诗', '书', '画', '风', '云', '道', '文', '字', '学'];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  theme = inject(ThemeService);

  floatingChars: FloatingChar[] = Array.from({ length: 10 }, (_, i) => ({
    char: FLOAT_CHARS[i % FLOAT_CHARS.length],
    left: 5 + (i * 9.5) % 90,
    size: 14 + (i * 7) % 18,
    duration: 8 + (i * 3.7) % 10,
    delay: -(i * 2.1) % 12,
    opacity: 0.06 + (i * 0.03) % 0.12,
  }));
}
