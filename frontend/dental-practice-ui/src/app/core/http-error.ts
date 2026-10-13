import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string; title?:string; errors?: string[] | Record<string,string[]> } | string | null;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      if (body.message) return body.message;
      if (Array.isArray(body.errors) && body.errors.length) return body.errors.join(' ');
      if (body.errors && typeof body.errors === 'object') return Object.values(body.errors).flat().join(' ') || fallback;
      if (body.title) return body.title;
    }
  }
  return fallback;
}
