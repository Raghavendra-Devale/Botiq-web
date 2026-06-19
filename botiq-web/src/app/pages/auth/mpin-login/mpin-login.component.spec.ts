import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MpinLoginComponent } from './mpin-login.component';

describe('MpinLoginComponent', () => {
  let component: MpinLoginComponent;
  let fixture: ComponentFixture<MpinLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MpinLoginComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MpinLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
