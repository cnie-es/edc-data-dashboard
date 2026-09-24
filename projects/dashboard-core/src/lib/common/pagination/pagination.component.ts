/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lib-pagination',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent<T> implements OnInit, OnChanges, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  @Input() items!: T[] | null;
  @Input() pageItemCount!: number;
  @Output() pageItems = new EventEmitter<T[]>();

  /** When set, the component operates in "server mode": totalPages is derived from
   * totalItems/externalCurrentPage instead of slicing `items`, and forward/backward/jump
   * emit `pageChange` instead of emitting a sliced page. Leaving these unset preserves the
   * original client-side slicing behavior exactly. */
  @Input() totalItems?: number;
  @Input() externalCurrentPage?: number;
  @Output() pageChange = new EventEmitter<number>();

  totalPages = 0;
  currentPage = 0;

  get isServerMode(): boolean {
    return this.totalItems !== undefined;
  }

  ngOnInit() {
    this.calcPages();
    this.translate.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isServerMode) {
      if (changes['externalCurrentPage']) {
        this.currentPage = this.externalCurrentPage ?? 0;
      }
    } else if (changes['items']) {
      const prev = changes['items'].previousValue as T[] | null | undefined;
      const curr = changes['items'].currentValue as T[] | null | undefined;
      const prevLen = prev?.length ?? 0;
      const currLen = curr?.length ?? 0;
      // Keep the current page when only row fields change (e.g. async label enrichment).
      if (prevLen !== currLen) {
        this.currentPage = 0;
      }
    }
    this.calcPages();
  }

  calcPages() {
    if (this.isServerMode) {
      this.totalPages = Math.max(0, Math.ceil((this.totalItems ?? 0) / this.pageItemCount) - 1);
      return;
    }
    if (this.items && this.pageItemCount > 0) {
      this.totalPages = Math.max(0, Math.ceil(this.items.length / this.pageItemCount) - 1);
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
      this.emitCurrentPageItems();
    }
  }

  emitCurrentPageItems() {
    const start = this.currentPage * this.pageItemCount;
    const end = start + this.pageItemCount;
    this.pageItems.emit(this.items!.slice(start, end));
  }

  forward() {
    if (this.isServerMode) {
      this.pageChange.emit(Math.min(this.currentPage + 1, this.totalPages));
      return;
    }
    this.currentPage += 1;
    this.emitCurrentPageItems();
  }

  backward() {
    if (this.isServerMode) {
      this.pageChange.emit(Math.max(this.currentPage - 1, 0));
      return;
    }
    this.currentPage -= 1;
    this.emitCurrentPageItems();
  }

  jump(page: number) {
    if (page < 0 || page > this.totalPages) {
      return;
    }
    if (this.isServerMode) {
      this.pageChange.emit(page);
      return;
    }
    this.currentPage = page;
    this.emitCurrentPageItems();
  }

  pageLabel(pageNumber: number): string {
    return this.translate.instant('pagination.page', { page: pageNumber });
  }
}
