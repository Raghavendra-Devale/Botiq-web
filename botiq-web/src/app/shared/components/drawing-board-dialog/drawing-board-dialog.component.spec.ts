import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawingBoardDialogComponent } from './drawing-board-dialog.component';

describe('DrawingBoardDialogComponent', () => {
  let component: DrawingBoardDialogComponent;
  let fixture: ComponentFixture<DrawingBoardDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawingBoardDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DrawingBoardDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
