import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiniMapComponent } from './mini-map.component';

describe('MiniMapComponent', () => {
  let component: MiniMapComponent;
  let fixture: ComponentFixture<MiniMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MiniMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
