import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobOrderListComponent } from './job-order-list.component';

describe('JobOrderListComponent', () => {
  let component: JobOrderListComponent;
  let fixture: ComponentFixture<JobOrderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobOrderListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JobOrderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
