import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServerImportComponent } from './server-import.component';

describe('ServerImportComponent', () => {
  let component: ServerImportComponent;
  let fixture: ComponentFixture<ServerImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerImportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ServerImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
