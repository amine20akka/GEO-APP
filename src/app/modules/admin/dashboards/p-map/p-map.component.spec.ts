import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PMapComponent } from './p-map.component';

describe('PMapComponent', () => {
  let component: PMapComponent;
  let fixture: ComponentFixture<PMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
