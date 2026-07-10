
import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import SignaturePad from 'signature_pad';


import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
    selector: 'app-drawing-board-dialog',
    imports: [MatDialogModule, MatButtonModule, MatIconModule, MatSliderModule],
    templateUrl: './drawing-board-dialog.component.html',
    styleUrl: './drawing-board-dialog.component.css'
})
export class DrawingBoardDialogComponent implements AfterViewInit, OnDestroy {

  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  signaturePad!: SignaturePad;

  // Custom tool states
  selectedColor = '#000000';
  isEraser = false;

  strokeWidths = [
    { value: 2, label: 'Thin' },
    { value: 4, label: 'Medium' },
    { value: 8, label: 'Thick' }
  ];
  selectedWidth = 4;

  private resizeListener = this.onResize.bind(this);

  constructor(
      private dialogRef: MatDialogRef<DrawingBoardDialogComponent>
  ) {}

  ngAfterViewInit(): void {
      const canvas = this.canvas.nativeElement;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      // Make sure the canvas fits the parent container
      canvas.width = canvas.parentElement!.clientWidth * ratio;
      canvas.height = canvas.parentElement!.clientHeight * ratio;
      canvas.getContext('2d')!.scale(ratio, ratio);

      this.signaturePad = new SignaturePad(canvas, {
          minWidth: this.selectedWidth - 1,
          maxWidth: this.selectedWidth + 1,
          penColor: this.selectedColor,
          backgroundColor: '#ffffff'
      });

      // Handle window resize dynamically to preserve canvas size
      window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
      window.removeEventListener('resize', this.resizeListener);
  }

  onResize() {
      if (!this.canvas) return;
      const canvas = this.canvas.nativeElement;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = this.signaturePad.toData();

      canvas.width = canvas.parentElement!.clientWidth * ratio;
      canvas.height = canvas.parentElement!.clientHeight * ratio;
      canvas.getContext('2d')!.scale(ratio, ratio);

      this.signaturePad.clear();
      this.signaturePad.fromData(data);
  }

  isCanvasEmpty(): boolean {
      return this.signaturePad ? this.signaturePad.isEmpty() : true;
  }

  changeWidth(width: number) {
      this.selectedWidth = width;
      this.updatePenWidth();
  }

  updatePenWidth() {
      if (this.isEraser) {
          this.signaturePad.minWidth = 10;
          this.signaturePad.maxWidth = 20;
      } else {
          this.signaturePad.minWidth = Math.max(1, this.selectedWidth - 1);
          this.signaturePad.maxWidth = this.selectedWidth + 1;
      }
  }

  selectPen() {
      this.isEraser = false;
      this.signaturePad.penColor = this.selectedColor;
      this.updatePenWidth();
  }

  selectEraser() {
      this.isEraser = true;
      this.signaturePad.penColor = '#ffffff';
      this.updatePenWidth();
  }

  clear() {
      this.signaturePad.clear();
  }

  save() {
      if (this.signaturePad.isEmpty()) {
          this.dialogRef.close();
          return;
      }
      const image = this.signaturePad.toDataURL("image/png");
      this.dialogRef.close(image);
  }

  cancel() {
      this.dialogRef.close();
  }

  undo() {
      const data = this.signaturePad.toData();
      if (data && data.length > 0) {
          data.pop();
          this.signaturePad.fromData(data);
      }
  }

}