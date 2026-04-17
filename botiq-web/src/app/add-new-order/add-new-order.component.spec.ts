import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewOrderComponent } from './add-new-order.component';

describe('AddNewOrderComponent', () => {
  let component: AddNewOrderComponent;
  let fixture: ComponentFixture<AddNewOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddNewOrderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddNewOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
