import { TestBed } from '@angular/core/testing';

import { PlatformAuthService } from './platform-auth-service';

describe('PlatformAuthService', () => {
  let service: PlatformAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlatformAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
