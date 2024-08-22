import { TestBed } from '@angular/core/testing';

import { ViewHistoryService } from './view-history.service';

describe('ViewHistoryService', () => {
  let service: ViewHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
