import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink,CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  phoneNumber: string = '';
  userStatus: number | any;


  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  loading = true;

ngOnInit() {

  const forceOtp =
    this.route.snapshot.queryParamMap.get('otp');

  if (forceOtp === 'true') {

    this.loading = false;

    return;
  }

  this.authService.getDeviceStatus()
    .subscribe({
      next: (response: any) => {

        if (response.knownDevice) {

          this.router.navigate([
            '/mpin-login'
          ]);

          return;
        }

        this.loading = false;
      },

      error: () => {

        this.loading = false;
      }
    });
}

  async requestOtp() {
    if (!this.phoneNumber || this.phoneNumber.length !== 10) {
      alert('Enter valid number');
      return;
    }

    try {
      this.authService.setupRecaptcha('recaptcha-container');
      await this.authService.sendOTP('+91' + this.phoneNumber);
      this.router.navigate(['/verify-otp']);
    } catch (err) {
      console.error(err);
      alert('OTP failed');
    }
  }
}