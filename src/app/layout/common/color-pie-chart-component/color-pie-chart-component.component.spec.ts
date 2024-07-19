import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorPieChartComponentComponent } from './color-pie-chart-component.component';

describe('ColorPieChartComponentComponent', () => {
  let component: ColorPieChartComponentComponent;
  let fixture: ComponentFixture<ColorPieChartComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorPieChartComponentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ColorPieChartComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
