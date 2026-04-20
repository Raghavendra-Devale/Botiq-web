import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

  userName = '';
  initial = '';
  businessName = '';
  orgLogo = '';

  ngOnInit() {
    this.userName = localStorage.getItem("owner_name") || '';
    this.businessName = localStorage.getItem("businessName") || '';
    // this.orgLogo = localStorage.getItem("org_logo") || '';
    this.initial = this.businessName.charAt(0);
    // console.log("orgLogo :", this.orgLogo);
  }
}