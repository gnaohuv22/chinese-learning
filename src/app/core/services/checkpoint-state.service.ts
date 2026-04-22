import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckpointStateService {
  private getKey(videoId: string): string {
    return `player_progress_${videoId}`;
  }

  getCompleted(videoId: string): Set<string> {
    try {
      const raw = localStorage.getItem(this.getKey(videoId));
      if (!raw) return new Set();
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    } catch {
      return new Set();
    }
  }

  markDone(videoId: string, checkpointId: string): void {
    try {
      const completed = this.getCompleted(videoId);
      completed.add(checkpointId);
      localStorage.setItem(this.getKey(videoId), JSON.stringify([...completed]));
    } catch {
      // silent fail (private mode / SSR)
    }
  }

  reset(videoId: string): void {
    try {
      localStorage.removeItem(this.getKey(videoId));
    } catch {
      // silent fail
    }
  }

  getCompletedCount(videoId: string): number {
    return this.getCompleted(videoId).size;
  }
}
