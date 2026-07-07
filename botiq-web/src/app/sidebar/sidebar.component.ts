import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {

  userName = '';
  initial = '';
  businessName = '';
  orgLogo = '';
  role = '';
  isCollapsed = false;
  private sub!: Subscription;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.sub = this.authService.basicDetails$.subscribe(details => {
      if (details) {
        this.userName = details.owner_name || '';
        this.businessName = details.org_name || '';
        this.initial = this.businessName ? this.businessName.charAt(0) : '';
        this.role = details.user_role || '';
      } else {
        this.userName = '';
        this.businessName = '';
        this.initial = '';
        this.role = '';
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}