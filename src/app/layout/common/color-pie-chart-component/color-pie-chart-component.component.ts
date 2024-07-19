import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-color-pie-chart',
  standalone: true,
  imports: [NgClass, NgStyle],
  template: `
    <div class="color-pie-chart">
      @for (color of colors; track color) {
        <div
          class="color-slice"
          [style.background-color]="color"
          [class.selected]="color === selectedColor"
          (click)="selectColor(color)"
        ></div>
      }
    </div>
  `,
  styles: [`
    .color-pie-chart {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
    .color-slice {
      width: 40px;
      height: 40px;
      margin: 5px;
      border-radius: 50%;
      cursor: pointer;
    }
    .color-slice.selected {
      border: 2px solid black;
    }
  `]
})
export class ColorPieChartComponentComponent {
  @Input() selectedColor: string = '';
  @Output() colorChange = new EventEmitter<string>();

  colors: string[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'brown'];

  selectColor(color: string) {
    this.selectedColor = color;
    this.colorChange.emit(color);
  }
}