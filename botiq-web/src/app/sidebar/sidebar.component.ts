
import { Component, OnInit, OnDestroy, HostListener, HostBinding } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {

  userName = '';
  initial = '';
  businessName = '';
  orgLogo = '';
  role = '';

  @HostBinding('class.collapsed')
  isCollapsed = true;
  private sub!: Subscription;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
    this.checkScreenSize();
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

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 1024;
      if (isMobile) {
        this.isCollapsed = true;
      }
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  onNavClick() {
    this.isCollapsed = true;
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