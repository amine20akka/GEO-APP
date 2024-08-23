import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayersFilterComponent } from './layers-filter.component';

describe('LayersFilterComponent', () => {
  let component: LayersFilterComponent;
  let fixture: ComponentFixture<LayersFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayersFilterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LayersFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
