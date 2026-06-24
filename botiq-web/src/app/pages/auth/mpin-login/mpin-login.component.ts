import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { NotificationMessagingService } from '../../../notification_essaging.service';

@Component({
  selector: 'app-mpin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mpin-login.component.html',
  styleUrl: './mpin-login.component.css'
})
export class MpinLoginComponent {

  mpin = '';
  remainingAttempts: number | null = null;
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationMessagingService
  ) {}

  login() {

    this.error = '';

    if (this.mpin.length !== 6) {

      this.error =
        'MPIN must be 6 digits';

      return;
    }

    this.loading = true;

    this.authService.loginWithMPin(this.mpin)
      .subscribe({

        next: () => {
 
           this.loading = false;
           this.notificationService.initialize();
 
           this.router.navigate([
             '/dashboard'
           ]);
         },

        error: (err) => {

  this.loading = false;

  this.error =
      err?.error?.message ||
      'Invalid MPIN';

  this.remainingAttempts =
      err?.error?.remainingAttempts;

  if (err?.error?.message === 'Device locked. Login with OTP.') {

      setTimeout(() => {

          this.router.navigate([
              '/login'
          ]);

      }, 2000);
  }
}
      });
  }


  loginWithOtp() {
    this.router.navigate(['/login'],{queryParams: {otp: true}});
  }
}