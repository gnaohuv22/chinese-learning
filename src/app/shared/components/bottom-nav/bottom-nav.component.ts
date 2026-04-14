import { Component, signal, HostListener, ElementRef, inject, computed } from '@angular/core';
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
  private elRef = inject(ElementRef);
  readonly router = inject(Router);

  ontapSheetOpen = signal(false);

  /** Track current URL via navigation events */
  private navEnd = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd))
  );

  /** Hide the entire bottom nav when on any /admin route */
  isAdminRoute = computed(() => {
    this.navEnd(); // depend on nav events
    return this.router.url.startsWith('/admin');
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.ontapSheetOpen.set(false);
    }
  }

  toggleOntapSheet(event: MouseEvent) {
    event.stopPropagation();
    this.ontapSheetOpen.update((v) => !v);
  }

  closeSheet() {
    this.ontapSheetOpen.set(false);
  }

  /** Navigate to a route and always close the Ôn tập sheet */
  navigate(path: string | (string | number)[]) {
    this.closeSheet();
    const commands = Array.isArray(path) ? path : [path];
    this.router.navigate(commands);
  }
}
