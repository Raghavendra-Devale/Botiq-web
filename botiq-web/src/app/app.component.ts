import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from "./header/header.component";
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { AuthService } from './auth/auth.service';
import { NotificationMessagingService } from '../notification_essaging.service';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
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
    window.location.pathname.includes('/mpin-login')
  );

  constructor(
    private router: Router, 
    private authService: AuthService,
    private notificationService: NotificationMessagingService,
    private notificationApiService: NotificationService
  ) { }

  async ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.isPublicRoute =
    url.includes('/login') ||
    url.includes('/verify-otp') ||
    url.includes('/register') ||
    url.includes('/setup-mpin') ||
    url.includes('/mpin-login');
    });

    const auth = getAuth();
    // Listen to Firebase token changes (login, logout, AND automatic token refreshes)
    // and seamlessly update it within in-memory store.
    onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        this.authService.setFirebaseToken(token);
      } else {
        this.authService.setFirebaseToken(null);
      }
    });

    try {

    const fcmToken =
      await this.notificationService
        .requestPermission();

    console.log('FCM TOKEN');
    console.log(fcmToken);

    if (fcmToken) {
      this.notificationApiService
        .registerPushToken(fcmToken)
        .subscribe({
          next: () => console.log('FCM Token registered successfully'),
          error: (err) => console.error('Error registering FCM token:', err)
        });
    }

    this.notificationService.listen();

  } catch (e) {

    console.error(
      'FCM initialization failed',
      e
    );
  }
    
  }
}
