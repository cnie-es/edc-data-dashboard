import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-step-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-form.component.html',
  styleUrls: ['./step-form.component.css'],
})
export class StepFormComponent {
  @Input() current = 1;
  @Input() stepLabels: string[] = [];
  @Output() stepChange = new EventEmitter<number>();

  get steps(): number {
    return this.stepLabels.length;
  }

  next() {
    if (this.current < this.steps) this.stepChange.emit(++this.current);
  }

  prev() {
    if (this.current > 1) this.stepChange.emit(--this.current);
  }

  goTo(step: number) {
    if (step >= 1 && step <= this.steps) {
      this.current = step;
      this.stepChange.emit(step);
    }
  }
}
