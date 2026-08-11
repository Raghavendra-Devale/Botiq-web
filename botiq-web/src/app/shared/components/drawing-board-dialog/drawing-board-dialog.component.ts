
import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, Inject, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import SignaturePad from 'signature_pad';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../auth/auth.service';
import { DataService } from '../../../data.service';

export interface DrawingBoardDialogData {
  strokes?: any[];
  image?: string;
  readOnly?: boolean;
  isStylusEnabled?: boolean;
}

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

  isStylusEnabled = true;

  // Custom tool states
  selectedColor = '#000000';
  isEraser = false;

  penColors = [
    '#000000', // Black
    '#ef4444', // Red
    '#2563eb', // Blue
    '#16a34a', // Green
    '#f59e0b', // Orange
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
  ];

  strokeWidths = [
    { value: 2, label: 'Thin' },
    { value: 4, label: 'Medium' },
    { value: 8, label: 'Thick' }
  ];
  selectedWidth = 4;

  hasExistingData = false;

  private resizeListener = this.onResize.bind(this);

  constructor(
      private dialogRef: MatDialogRef<DrawingBoardDialogComponent>,
      @Optional() @Inject(MAT_DIALOG_DATA) public data: DrawingBoardDialogData,
      private authService: AuthService,
      private dataService: DataService
  ) {}

  ngAfterViewInit(): void {
      this.checkStylusEnabled();

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

      if (!this.isStylusEnabled) {
          this.signaturePad.off();
      }

      // Load existing strokes if provided
      if (this.data && this.data.strokes && this.data.strokes.length > 0) {
          this.signaturePad.fromData(this.data.strokes);
          this.hasExistingData = true;
      } else if (this.data && this.data.image) {
          let imageUrl = this.data.image;
          if (!imageUrl.startsWith('data:image')) {
              imageUrl = 'data:image/png;base64,' + imageUrl;
          }
          this.signaturePad.fromDataURL(imageUrl, {
              ratio: ratio,
              width: canvas.width,
              height: canvas.height
          });
          this.hasExistingData = true;
      }

      // Handle window resize dynamically to preserve canvas size
      window.addEventListener('resize', this.resizeListener);
  }

  checkStylusEnabled(): void {
      if (this.data && this.data.isStylusEnabled !== undefined) {
          this.isStylusEnabled = !!this.data.isStylusEnabled;
          return;
      }
      if (this.data && this.data.readOnly !== undefined) {
          this.isStylusEnabled = !this.data.readOnly;
          return;
      }

      const details = this.authService.getBasicDetails();
      if (details) {
          this.extractStylusFromDetails(details);
      } else {
          this.dataService.getBasicData().subscribe({
              next: (res: any) => {
                  if (res) {
                      this.authService.setBasicDetails(res);
                      this.extractStylusFromDetails(res);
                      if (this.signaturePad) {
                          if (this.isStylusEnabled) {
                              this.signaturePad.on();
                          } else {
                              this.signaturePad.off();
                          }
                      }
                  }
              },
              error: (err: any) => {
                  console.error('Error fetching basic details for stylus status:', err);
              }
          });
      }
  }

  private extractStylusFromDetails(details: any): void {
      let settings: any = {};
      try {
          if (typeof details.optional_settings === 'string') {
              settings = JSON.parse(details.optional_settings);
          } else if (typeof details.optional_settings === 'object' && details.optional_settings !== null) {
              settings = details.optional_settings;
          }
      } catch {
          settings = {};
      }
      this.isStylusEnabled = !!settings.stylusEnabled;
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
      if (data && data.length > 0) {
          this.signaturePad.fromData(data);
      } else if (this.data && this.data.image) {
          let imageUrl = this.data.image;
          if (!imageUrl.startsWith('data:image')) {
              imageUrl = 'data:image/png;base64,' + imageUrl;
          }
          this.signaturePad.fromDataURL(imageUrl, {
              ratio: ratio,
              width: canvas.width,
              height: canvas.height
          });
      }
  }

  isCanvasEmpty(): boolean {
      if (this.hasExistingData) {
          return false;
      }
      return this.signaturePad ? this.signaturePad.isEmpty() : true;
  }

  changeWidth(width: number) {
      if (!this.isStylusEnabled) return;
      this.selectedWidth = width;
      this.updatePenWidth();
  }

  updatePenWidth() {
      if (!this.signaturePad) return;
      if (this.isEraser) {
          this.signaturePad.minWidth = 10;
          this.signaturePad.maxWidth = 20;
      } else {
          this.signaturePad.minWidth = Math.max(1, this.selectedWidth - 1);
          this.signaturePad.maxWidth = this.selectedWidth + 1;
      }
  }

  selectPen() {
      if (!this.isStylusEnabled) return;
      this.isEraser = false;
      this.signaturePad.penColor = this.selectedColor;
      this.updatePenWidth();
  }

  changeColor(color: string) {
      if (!this.isStylusEnabled) return;
      this.selectedColor = color;
      if (!this.isEraser) {
          this.signaturePad.penColor = color;
      }
  }

  selectEraser() {
      if (!this.isStylusEnabled) return;
      this.isEraser = true;
      this.signaturePad.penColor = '#ffffff';
      this.updatePenWidth();
  }

  clear() {
      if (!this.isStylusEnabled) return;
      this.signaturePad.clear();
      this.hasExistingData = false;
  }

  save() {
      if (!this.isStylusEnabled || this.isCanvasEmpty()) {
          this.dialogRef.close();
          return;
      }
      const image = this.signaturePad.toDataURL("image/png");
      const strokes = this.signaturePad.toData();
      this.dialogRef.close({ image, strokes });
  }

  cancel() {
      this.dialogRef.close();
  }

  undo() {
      if (!this.isStylusEnabled) return;
      const data = this.signaturePad.toData();
      if (data && data.length > 0) {
          data.pop();
          this.signaturePad.fromData(data);
      }
  }

}