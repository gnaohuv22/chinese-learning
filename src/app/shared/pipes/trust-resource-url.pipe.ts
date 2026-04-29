import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/** Bypasses Angular DomSanitizer for trusted iframe src URLs (e.g. Google Drive embeds). */
@Pipe({
  name: 'trustResourceUrl',
  standalone: true,
})
export class TrustResourceUrlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
