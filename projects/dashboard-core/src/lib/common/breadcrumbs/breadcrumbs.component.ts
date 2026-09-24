import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'lib-breadcrumbs',
  standalone: true,
  templateUrl: './breadcrumbs.component.html',
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);

  @Input({ required: true }) items: BreadcrumbItem[] = [];

  onItemSelected(item: BreadcrumbItem) {
    if (item.route) {
      this.router.navigate([item.route]);
    }
  }
}
