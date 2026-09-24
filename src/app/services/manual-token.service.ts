import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ManualTokenService {
  private token: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    const trimmedToken = token.trim();
    this.token = trimmedToken.length > 0 ? trimmedToken : null;
  }

  clearToken(): void {
    this.token = null;
  }
}
