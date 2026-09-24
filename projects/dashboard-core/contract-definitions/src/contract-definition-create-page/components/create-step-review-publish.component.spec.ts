import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CreateStepReviewPublishComponent } from './create-step-review-publish.component';

describe('CreateStepReviewPublishComponent', () => {
  let component: CreateStepReviewPublishComponent;
  let fixture: ComponentFixture<CreateStepReviewPublishComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStepReviewPublishComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateStepReviewPublishComponent);
    component = fixture.componentInstance;
    component.canPublishOffer = true;
    fixture.detectChanges();
  });

  it('emits publish when publish button is clicked', () => {
    spyOn(component.publish, 'emit');

    const publishButton = fixture.debugElement.query(By.css('[data-cy="create-step4-publish"]'))
      .nativeElement as HTMLButtonElement;
    publishButton.click();

    expect(component.publish.emit).toHaveBeenCalled();
  });
});
