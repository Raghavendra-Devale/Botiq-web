import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css'
})
export class VerifyOtpComponent implements OnInit {

  otpDigits: string[] = ['', '', '', '', '', ''];
  registerData: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.registerData = navigation?.extras.state?.['registerData'];
  }

  ngOnInit() {
    if (!this.authService.hasConfirmationResult()) {
      this.router.navigate(['/login']);
    }
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  onInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!/^\d$/.test(value)) {
      this.otpDigits[index] = '';
      return;
    }

    if (index < 5 && value) {
      const next = input.nextElementSibling as HTMLInputElement;
      if (next) {
        setTimeout(() => next.focus(), 10);
      }
    }
  }

  handleBackspace(index: number, event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prev = input.previousElementSibling as HTMLInputElement;
      if (prev) prev.focus();
    }
  }

  async verifyOtp() {

  const code = this.otpDigits.join('');

  if (code.length !== 6) {
    alert('Enter valid OTP');
    return;
  }

  try {

    const result =
      await this.authService.verifyOTP(code);

    const token =
      await result.user.getIdToken();

    await this.authService
      .createSession(token)
      .toPromise();

    this.authService
      .getDeviceStatus()
      .subscribe({

        next: (response: any) => {

          console.log('DEVICE STATUS', response);

          if (response.knownDevice) {

            console.log(
              'Known Device -> Dashboard'
            );

            this.router.navigate([
              '/setup-mpin'
            ]);

          } else {

            console.log(
              'New Device -> Setup MPIN'
            );

            this.router.navigate([
              '/setup-mpin'
            ]);
          }
        },

        error: (err) => {

          console.error(
            'Device status failed',
            err
          );

          this.router.navigate([
            '/setup-mpin'
          ]);
        }
      });

  } catch (error) {

    console.error(error);

    alert('Invalid OTP');
  }
}
}