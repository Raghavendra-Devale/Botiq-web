import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateJobOrders } from './update-job-orders';

describe('UpdateJobOrders', () => {
  let component: UpdateJobOrders;
  let fixture: ComponentFixture<UpdateJobOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateJobOrders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateJobOrders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
