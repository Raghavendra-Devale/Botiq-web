import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './sidebar/sidebar.component';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { AuthService } from './auth/auth.service';
import { NotificationMessagingService } from './notification_essaging.service';
import { DataService } from './data.service';
import { ServerIpService } from './services/server-ip.service';
import { Auth } from '@angular/fire/auth';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
    selector: 'app-root',
    imports: [CommonModule, RouterOutlet, SidebarComponent, MatSidenavModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'botiq-web';
  isPublicRoute = typeof window !== 'undefined' && (
    window.location.pathname.includes('/login') ||
    window.location.pathname.includes('/verify-otp') ||
    window.location.pathname.includes('/register') ||
    window.location.pathname.includes('/setup-mpin') ||
    window.location.pathname.includes('/mpin-login') ||
    window.location.pathname.includes('/server-ip') ||
    window.location.hash.includes('/login') ||
    window.location.hash.includes('/verify-otp') ||
    window.location.hash.includes('/register') ||
    window.location.hash.includes('/setup-mpin') ||
    window.location.hash.includes('/mpin-login') ||
    window.location.hash.includes('/server-ip')
  );
  isPosRoute = typeof window !== 'undefined' && (
    window.location.pathname.includes('/add-new-order') ||
    window.location.hash.includes('/add-new-order')
  );

  isMobileDevice = false;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private notificationService: NotificationMessagingService,
    private dataService: DataService,
    private serverIpService: ServerIpService
  ) { }

  async ngOnInit() {
    this.checkMobileDevice();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      const wasPublic = this.isPublicRoute;
      this.isPublicRoute =
        url.includes('/login') ||
        url.includes('/verify-otp') ||
        url.includes('/register') ||
        url.includes('/setup-mpin') ||
        url.includes('/mpin-login') ||
        url.includes('/server-ip');

      this.isPosRoute = url.includes('/add-new-order');

      if (wasPublic && !this.isPublicRoute) {
        this.fetchBasicDetails();
      }
    });

    if (this.serverIpService.isAndroidPlatform()) {
      if (!this.serverIpService.hasServerIp()) {
        if (!window.location.pathname.includes('/server-ip')) {
          this.router.navigate(['/server-ip']);
        }
      } else {
        this.serverIpService.applyStoredIp();
      }
    }

    const auth = inject(Auth);
    // Listen to Firebase token changes (login, logout, AND automatic token refreshes)
    // and seamlessly update it within in-memory store.
    onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        this.authService.setFirebaseToken(token);
        if (!this.isPublicRoute) {
          this.notificationService.initialize();
          this.fetchBasicDetails();
        }
      } else {
        this.authService.setFirebaseToken(null);
      }
    });
  }

  fetchBasicDetails() {
    this.dataService.getBasicData().subscribe({
      next: (res: any) => {
        this.authService.setBasicDetails(res);
      },
      error: (err) => {
        console.error('Error fetching basic details:', err);
      }
    });
  }

  private checkMobileDevice() {
    if (typeof window !== 'undefined') {
      this.isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
  }
}

