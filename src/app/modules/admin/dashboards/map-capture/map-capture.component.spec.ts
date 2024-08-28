import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapCaptureComponent } from './map-capture.component';

describe('MapCaptureComponent', () => {
  let component: MapCaptureComponent;
  let fixture: ComponentFixture<MapCaptureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapCaptureComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapCaptureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
