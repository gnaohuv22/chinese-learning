import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriveService } from '../../../core/services/drive.service';

@Component({
  selector: 'app-media-embed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-embed.component.html',
})
export class MediaEmbedComponent {
  @Input({ required: true }) fileId!: string;
  @Input() mediaType: 'video' | 'audio' | 'image' = 'video';

  constructor(private drive: DriveService) {}

  get embedUrl(): string {
    return this.drive.getEmbedUrl(this.fileId);
  }

  get thumbnailUrl(): string {
    return this.drive.getThumbnailUrl(this.fileId);
  }

  get directUrl(): string {
    return this.drive.getDirectUrl(this.fileId);
  }
}
