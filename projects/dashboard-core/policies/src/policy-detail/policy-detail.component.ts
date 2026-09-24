import { formatDate, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyService } from '../policy.service';
import type { Asset, PolicyDefinition } from '@think-it-labs/edc-connector-client';
import { BreadcrumbsComponent, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import {
  AssetService,
  formatAssetCreatedAtDdMmYyyy,
  readAssetPropertyString,
} from '@eclipse-edc/dashboard-core/assets';
import { TranslateModule } from '@ngx-translate/core';
import { PolicyDetailPanelComponent } from '../policy-detail-panel/policy-detail-panel.component';

registerLocaleData(localeEs);

@Component({
  selector: 'lib-policy-detail',
  standalone: true,
  imports: [BreadcrumbsComponent, TranslateModule, PolicyDetailPanelComponent],
  templateUrl: './policy-detail.component.html',
  styleUrls: ['./policy-detail.component.css'],
})
export class PolicyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly policyService = inject(PolicyService);
  private readonly assetService = inject(AssetService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: '/home' },
    { label: 'Mis políticas', route: '/policies' },
    { label: 'Detalle política' },
  ];

  readonly routePolicyId = signal<string | null>(null);
  readonly initialLoading = signal(true);

  policy = signal<PolicyDefinition | null>(null);

  readonly licenseUrl = signal<string | undefined>(undefined);

  /** From list query `rol`, asset inference, or policy ODRL heuristics — never "Otro" in the UI. */
  readonly policyKind = signal<'Contratación' | 'Publicación'>('Contratación');

  /** Same dd/MM/yyyy as Mis políticas list (`fecha` query), else asset / policy. */
  readonly displayDate = signal<string>('-');

  readonly displayTitle = computed(() => {
    const nameFromQuery = this.route.snapshot.queryParamMap.get('name');
    if (nameFromQuery) return nameFromQuery;
    const p = this.policy();
    const name = p?.['name'];
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
    const atId = p?.['@id'];
    if (typeof atId === 'string' && atId.trim().length > 0) {
      return atId.trim();
    }
    return this.routePolicyId() ?? '';
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.initialLoading.set(false);
      return;
    }
    this.routePolicyId.set(id);

    try {
      const [policies, snapshot] = await Promise.all([
        this.policyService.getAllPolicies().catch(() => [] as PolicyDefinition[]),
        this.assetService.getAssetsCacheSnapshotOrLoad(),
      ]);

      const found = policies.find(p => this.matchesPolicyRouteId(p, id)) ?? null;
      this.policy.set(found);

      const assets = snapshot?.data ?? [];
      this.licenseUrl.set(this.findLicenseUrlForPolicy(assets, id));

      const rol = this.route.snapshot.queryParamMap.get('rol');
      this.policyKind.set(this.resolvePolicyKind(rol, assets, id, found));

      const fecha = this.route.snapshot.queryParamMap.get('fecha')?.trim();
      this.displayDate.set(this.resolveDisplayDate(fecha, assets, id, found));
    } finally {
      this.initialLoading.set(false);
    }
  }

  private resolvePolicyKind(
    rol: string | null,
    assets: readonly Asset[],
    policyId: string,
    policy: PolicyDefinition | null,
  ): 'Contratación' | 'Publicación' {
    if (rol === 'Contratación' || rol === 'Publicación') {
      return rol;
    }
    const inferred = this.inferPolicyKindFromAssets(assets, policyId);
    if (inferred) {
      return inferred;
    }
    if (policy) {
      const t = this.computeType(policy);
      if (t === 'Contratación' || t === 'Publicación') {
        return t;
      }
    }
    return 'Contratación';
  }

  private inferPolicyKindFromAssets(assets: readonly Asset[], policyId: string): 'Contratación' | 'Publicación' | null {
    for (const asset of assets) {
      const rec = asset as Record<string, unknown>;
      const accessId = rec['accessPolicyId'];
      const contractId = rec['contractPolicyId'];
      if (contractId === policyId && accessId !== policyId) {
        return 'Contratación';
      }
      if (accessId === policyId && contractId !== policyId) {
        return 'Publicación';
      }
    }
    return null;
  }

  private resolveDisplayDate(
    fechaQuery: string | undefined,
    assets: readonly Asset[],
    policyId: string,
    policy: PolicyDefinition | null,
  ): string {
    if (fechaQuery && fechaQuery.length > 0) {
      return fechaQuery;
    }
    const asset = this.findFirstAssetForPolicy(assets, policyId);
    if (asset) {
      const fromAsset = formatAssetCreatedAtDdMmYyyy(asset);
      if (fromAsset !== '-') {
        return fromAsset;
      }
    }
    const createdAt = policy?.createdAt;
    if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
      return formatDate(createdAt, 'dd/MM/yyyy', 'es');
    }
    return '-';
  }

  private findFirstAssetForPolicy(assets: readonly Asset[], policyId: string): Asset | undefined {
    for (const asset of assets) {
      const rec = asset as Record<string, unknown>;
      if (rec['accessPolicyId'] === policyId || rec['contractPolicyId'] === policyId) {
        return asset;
      }
    }
    return undefined;
  }

  private findLicenseUrlForPolicy(assets: readonly Asset[], policyId: string): string | undefined {
    for (const asset of assets) {
      const rec = asset as Record<string, unknown>;
      if (rec['accessPolicyId'] === policyId || rec['contractPolicyId'] === policyId) {
        const lic = this.readOfferLicense(asset);
        if (lic) {
          return lic;
        }
      }
    }
    return undefined;
  }

  private readOfferLicense(asset: Asset): string | undefined {
    return readAssetPropertyString(asset, 'offer.license');
  }

  private matchesPolicyRouteId(def: PolicyDefinition, routeId: string): boolean {
    const atId = def['@id'];
    if (typeof atId === 'string') {
      if (atId === routeId) {
        return true;
      }
      const tail = atId.split(/[/\\#]/).pop();
      if (tail === routeId) {
        return true;
      }
    }
    const plain = (def as Record<string, unknown>)['id'];
    return typeof plain === 'string' && plain === routeId;
  }

  private collectStringsDeep(value: unknown, acc: string[] = []): string[] {
    if (value == null) return acc;

    if (typeof value === 'string') {
      acc.push(value.toLowerCase());
      return acc;
    }

    if (Array.isArray(value)) {
      for (const v of value) {
        this.collectStringsDeep(v, acc);
      }
      return acc;
    }

    if (typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        this.collectStringsDeep(v, acc);
      }
    }

    return acc;
  }

  private computeType(p: PolicyDefinition): 'Contratación' | 'Publicación' | 'Otro' {
    const all = this.collectStringsDeep(p.policy);

    const hasUse = all.some(v => /(^|\/)use(\/|$|\?)/.test(v));
    const hasConsume = all.some(v => /(^|\/)consume(\/|$|\?)/.test(v));

    if (hasUse && !hasConsume) return 'Contratación';
    if (hasConsume && !hasUse) return 'Publicación';

    return 'Otro';
  }

  goBack() {
    this.router.navigate(['/policies']);
  }
}
