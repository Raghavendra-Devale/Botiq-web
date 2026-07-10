import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-tabs-container',
    templateUrl: './tabs-container.component.html',
    styleUrls: ['./tabs-container.component.scss'],
    imports: [CommonModule, RouterModule]
})
export class TabsContainerComponent {
  isAssignEnabled = false;
  recordingEnabled = false;

  constructor() { }



}