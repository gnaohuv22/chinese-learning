import { Component, inject, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './bottom-nav.component.html',
})
export class BottomNavComponent {
  readonly router = inject(Router);

  /** Track current URL via navigation events */
  private navEnd = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd))
  );

  /** Hide the entire bottom nav when on any /admin route */
  isAdminRoute = computed(() => {
    this.navEnd(); // depend on nav events
    return this.router.url.startsWith('/admin');
  });

  /** Navigate to a route */
  navigate(path: string | (string | number)[]) {
    const commands = Array.isArray(path) ? path : [path];
    this.router.navigate(commands);
  }
}
