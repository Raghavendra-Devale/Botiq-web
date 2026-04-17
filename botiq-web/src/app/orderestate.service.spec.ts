import { TestBed } from '@angular/core/testing';

import { OrderestateService } from './orderestate.service';

describe('OrderestateService', () => {
  let service: OrderestateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderestateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
