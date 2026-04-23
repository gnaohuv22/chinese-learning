import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from './shared/components/header/header.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { ThemeService } from './core/services/theme.service';
import { ConfirmModalComponent } from './shared/components/modal/confirm-modal.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { VideoModalHostComponent } from './shared/components/video-modal-host/video-modal-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, BottomNavComponent, ConfirmModalComponent, ToastComponent, VideoModalHostComponent],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private translate = inject(TranslateService);
  // ThemeService is injected here to ensure it initialises (applies saved theme) on app start
  private _theme = inject(ThemeService);

  ngOnInit() {
    this.translate.addLangs(['vi', 'en', 'zh']);
    this.translate.setDefaultLang('vi');

    const saved = localStorage.getItem('lang');
    const browserLang = this.translate.getBrowserLang();
    const supported = ['vi', 'en', 'zh'];
    const useLang = saved && supported.includes(saved)
      ? saved
      : (supported.includes(browserLang ?? '') ? browserLang! : 'vi');
    this.translate.use(useLang);
  }
}
