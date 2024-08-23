import { TestBed } from '@angular/core/testing';

import { AttributeTableService } from './attribute-table.service';

describe('AttributeTableService', () => {
  let service: AttributeTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttributeTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
