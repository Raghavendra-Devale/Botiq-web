
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { NotificationMessagingService } from '../../../notification_essaging.service';
import { PlatformAuthService } from '../../../platform-auth-service';


@Component({
    selector: 'app-mpin-login',
    imports: [FormsModule],
    templateUrl: './mpin-login.component.html',
    styleUrl: './mpin-login.component.css'
})
export class MpinLoginComponent implements OnInit {

  mpin = '';
  remainingAttempts: number | null = null;
  loading = false;
  error = '';
  hasStoredMpin = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationMessagingService,
    private platformAuthService: PlatformAuthService
  ) {}

  async ngOnInit() {
    try {
      this.hasStoredMpin = await this.platformAuthService.hasStoredMpin();
      console.log("[MpinLoginComponent] hasStoredMpin check:", this.hasStoredMpin);
      if (this.hasStoredMpin) {
        const alreadyAttempted = sessionStorage.getItem('auto_login_attempted') === 'true';
        if (!alreadyAttempted) {
          await this.triggerBiometricLogin();
        }
      }
    } catch (e) {
      console.error("[MpinLoginComponent] Error checking stored MPIN status:", e);
    }
  }

  async triggerBiometricLogin() {
    sessionStorage.setItem('auto_login_attempted', 'true');
    this.loading = true;
    this.error = '';
    try {
      console.log("[MpinLoginComponent] Triggering biometric login");
      const res = await this.platformAuthService.loginWithStoredMpin();
      this.loading = false;
      console.log("[MpinLoginComponent] Stored MPIN login result:", res);
      
      if (res && res.message === 'MPIN login successful') {
        this.authService.clearSession();
        this.notificationService.initialize();
        await this.router.navigate(['/dashboard']);
      } else {
        console.warn("[MpinLoginComponent] Stored MPIN login failed:", res);
        this.error = res?.message || 'Login failed';
      }
    } catch (e: any) {
      console.error("[MpinLoginComponent] Biometric login failed or cancelled:", e);
      this.loading = false;
      const errMsg = e?.message || '';
      // Only set error message if it wasn't user cancellation
      if (
        !errMsg.includes('cancelled') && 
        !errMsg.includes('Cancel') && 
        !errMsg.includes('cancel')
      ) {
        this.error = errMsg || 'Biometric authentication failed';
      }
    }
  }

  login() {
    this.error = '';

    if (this.mpin.length !== 6) {
      this.error = 'MPIN must be 6 digits';
      return;
    }

    this.loading = true;

    this.platformAuthService.loginWithMpin(this.mpin)
      .then(() => {
        this.loading = false;
        this.notificationService.initialize();
        this.router.navigate(['/dashboard']);
      })
      .catch((err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Invalid MPIN';
        this.remainingAttempts = err?.error?.remainingAttempts;

        if (err?.error?.message === 'Device locked. Login with OTP.') {
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
      });
  }


  loginWithOtp() {
    this.router.navigate(['/login'],{queryParams: {otp: true}});
  }
}