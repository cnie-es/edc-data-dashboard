import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { PaginationComponent } from './pagination.component';
import type { ComponentFixture } from '@angular/core/testing';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent<string>>;
  let component: PaginationComponent<string>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent<string>);
    component = fixture.componentInstance;
  });

  describe('client mode (no totalItems/externalCurrentPage set)', () => {
    const testItems = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);

    it('should slice and emit the current page from the provided items array', () => {
      component.items = testItems;
      component.pageItemCount = 10;
      const emitted: string[][] = [];
      component.pageItems.subscribe(page => emitted.push(page));

      fixture.detectChanges();

      expect(component.isServerMode).toBe(false);
      expect(emitted[emitted.length - 1]).toEqual(testItems.slice(0, 10));
    });

    it('should slice forward/backward without emitting pageChange', () => {
      component.items = testItems;
      component.pageItemCount = 10;
      const pageChangeSpy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(pageChangeSpy);
      const emitted: string[][] = [];
      component.pageItems.subscribe(page => emitted.push(page));
      fixture.detectChanges();

      component.forward();

      expect(emitted[emitted.length - 1]).toEqual(testItems.slice(10, 20));
      expect(pageChangeSpy).not.toHaveBeenCalled();
    });
  });

  describe('server mode (totalItems/externalCurrentPage set)', () => {
    it('should compute totalPages from totalItems instead of items.length', () => {
      component.items = null;
      component.pageItemCount = 10;
      component.totalItems = 42;
      component.externalCurrentPage = 0;

      fixture.detectChanges();

      expect(component.isServerMode).toBe(true);
      expect(component.totalPages).toBe(Math.ceil(42 / 10) - 1);
    });

    it('should emit pageChange instead of slicing on forward/backward/jump', () => {
      component.items = null;
      component.pageItemCount = 10;
      component.totalItems = 42;
      component.externalCurrentPage = 1;
      const pageChangeSpy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(pageChangeSpy);
      const pageItemsSpy = jasmine.createSpy('pageItems');
      component.pageItems.subscribe(pageItemsSpy);

      fixture.detectChanges();
      component.forward();
      component.backward();
      component.jump(3);

      expect(pageChangeSpy).toHaveBeenCalledWith(2);
      expect(pageChangeSpy).toHaveBeenCalledWith(0);
      expect(pageChangeSpy).toHaveBeenCalledWith(3);
      expect(pageItemsSpy).not.toHaveBeenCalled();
    });

    it('should sync currentPage from externalCurrentPage on change', () => {
      component.items = null;
      component.pageItemCount = 10;
      component.totalItems = 42;
      component.externalCurrentPage = 0;
      fixture.detectChanges();

      component.externalCurrentPage = 2;
      component.ngOnChanges({
        externalCurrentPage: {
          previousValue: 0,
          currentValue: 2,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.currentPage).toBe(2);
    });
  });
});
