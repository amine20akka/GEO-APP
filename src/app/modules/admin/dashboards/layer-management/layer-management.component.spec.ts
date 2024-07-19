import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerManagementComponent } from './layer-management.component';

describe('LayerManagementComponent', () => {
  let component: LayerManagementComponent;
  let fixture: ComponentFixture<LayerManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayerManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LayerManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
