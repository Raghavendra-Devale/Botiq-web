import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-tabs-container',
    standalone:true,
    templateUrl: './tabs-container.component.html',
    styleUrls: ['./tabs-container.component.css'],
    imports: [RouterModule]
})
export class TabsContainerComponent {
  isAssignEnabled = false;
  recordingEnabled = false;

  constructor() { }



}