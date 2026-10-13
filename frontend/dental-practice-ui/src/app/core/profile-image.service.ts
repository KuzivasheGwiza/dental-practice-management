import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProfileImageService {
  private readonly api = inject(ApiService);
  private readonly imageSubject = new BehaviorSubject<string | null>(null);
  readonly imageUrl$ = this.imageSubject.asObservable();

  load(): void {
    this.api.getBlob('/profile/photo').subscribe({
      next: blob => {
        this.revokeCurrent();
        this.imageSubject.next(URL.createObjectURL(blob));
      },
      error: () => this.clear()
    });
  }

  clear(): void {
    this.revokeCurrent();
    this.imageSubject.next(null);
  }

  private revokeCurrent(): void {
    const current = this.imageSubject.value;
    if (current) URL.revokeObjectURL(current);
  }
}
