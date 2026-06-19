import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupMpinComponent } from './setup-mpin.component';

describe('SetupMpinComponent', () => {
  let component: SetupMpinComponent;
  let fixture: ComponentFixture<SetupMpinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupMpinComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetupMpinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
