import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  mobileMenuOpen = signal(false);
  theme = inject(ThemeService);
}
