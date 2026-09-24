import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DashboardStateService } from './dashboard-state.service';

interface ParticipantResponse {
  organization?: string;
  participantContextId?: string;
  did?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ParticipantNameService {
  private readonly dashboardStateService = inject(DashboardStateService);
  private readonly http = inject(HttpClient);
  private readonly memoryCache = new Map<string, string>();
  private readonly pendingRequests = new Map<string, Promise<string>>();
  private readonly storagePrefix = 'participant-name:';

  private readonly defaultApiBaseUrl = '/datadashboardApi';
  private apiBaseUrl = this.defaultApiBaseUrl;

  constructor() {
    this.dashboardStateService.currentEdcConfig$.subscribe(config => {
      const baseUrl = config?.dashboardApiBaseUrl?.trim();
      this.apiBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : this.defaultApiBaseUrl;
    });
  }

  public async getName(participantId: string): Promise<string> {
    if (!participantId) {
      return participantId;
    }

    const cleanedId = participantId.trim();
    if (!cleanedId) {
      return participantId;
    }

    const mem = this.memoryCache.get(cleanedId);
    if (mem) {
      return mem;
    }

    const pending = this.pendingRequests.get(cleanedId);
    if (pending) {
      return pending;
    }

    const cachedPromise = this.fetchName(cleanedId);
    this.pendingRequests.set(cleanedId, cachedPromise);
    try {
      const result = await cachedPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cleanedId);
    }
  }

  private async fetchName(cleanedId: string): Promise<string> {
    const stored = this.getStoredName(cleanedId);
    if (stored) {
      this.memoryCache.set(cleanedId, stored);
      return stored;
    }

    try {
      const url = `${this.apiBaseUrl}/tier1/v2/participants/${encodeURIComponent(cleanedId)}`;
      const participant = await firstValueFrom(this.http.get<ParticipantResponse>(url));

      const name = participant?.organization ?? participant?.participantContextId ?? participant?.did;
      const result = name || cleanedId;
      this.memoryCache.set(cleanedId, result);
      this.storeName(cleanedId, result);
      return result;
    } catch {
      return cleanedId;
    }
  }

  private getStoredName(cleanedId: string): string | null {
    try {
      return localStorage.getItem(`${this.storagePrefix}${cleanedId}`);
    } catch {
      return null;
    }
  }

  private storeName(cleanedId: string, value: string): void {
    try {
      localStorage.setItem(`${this.storagePrefix}${cleanedId}`, value);
    } catch {
      // ignore localStorage failures
    }
  }

  public async clearCachedParticipant(participantId: string): Promise<void> {
    const cleanedId = participantId.trim();
    this.memoryCache.delete(cleanedId);
    try {
      localStorage.removeItem(`${this.storagePrefix}${cleanedId}`);
    } catch {
      // ignore
    }
  }
}
