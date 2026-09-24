import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EdcRawCacheWarmupService } from '@eclipse-edc/dashboard-core';
import { AppMenuConfigService } from '../services/app-menu-config.service';
import { ManualTokenService } from '../services/manual-token.service';

@Component({
  selector: 'app-manual-token-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './manual-token-login.component.html',
})
export class ManualTokenLoginComponent {
  private readonly manualTokenService = inject(ManualTokenService);
  private readonly appMenuConfigService = inject(AppMenuConfigService);
  private readonly rawCacheWarmup = inject(EdcRawCacheWarmupService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  tokenValue = '';
  message = '';

  clearToken(): void {
    this.manualTokenService.clearToken();
    this.tokenValue = '';
    this.message = '';
  }

  async continueWithToken(): Promise<void> {
    const trimmedToken = this.tokenValue.trim();
    if (!trimmedToken) {
      this.message = 'Please provide a token.';
      return;
    }

    this.manualTokenService.setToken(trimmedToken);
    console.debug('[manual-token-login] Token set, scheduling raw cache warmup');
    this.rawCacheWarmup.scheduleAfterAuth(trimmedToken);
    await this.appMenuConfigService.applyFilteredMenuToDashboard();
    this.message = '';
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
    console.debug('[manual-token-login] Navigating after token login', { returnUrl });
    await this.router.navigateByUrl(returnUrl);
  }
}
