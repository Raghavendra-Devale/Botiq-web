import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../data.service';

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
    private route: ActivatedRoute,
    private dataService: DataService
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

  showConfirmModal = false;
  modalTitle = '';
  modalMessage = '';
  onConfirmCallback: () => void = () => {};

  async requestOtp() {
    if (!this.phoneNumber || this.phoneNumber.length !== 10) {
      alert('Enter valid number');
      return;
    }

    this.loading = true;

    this.dataService.checkUserExists({ phoneNumber: this.phoneNumber, deviceId: null }).subscribe({
      next: async (res: any) => {
        console.log('Check User Exists Response:', res);

        if (res.status === 1) {
          alert('User not registered. Please contact administrator.');
          this.loading = false;
          return;
        }

        if (res.status === 6) {
          this.authService.setFirstTimeUser(true);
        } else {
          this.authService.setFirstTimeUser(false);
        }

        // status 3: changed phone, warn/link
        if (res.status === 3) {
          this.loading = false;
          this.modalTitle = 'Link New Device';
          this.modalMessage = 'This phone number is registered on another device. Would you like to link it to this device instead?';
          this.onConfirmCallback = () => this.sendOtpFlow();
          this.showConfirmModal = true;
          return;
        }

        // status 4: on another phone, logout warning
        if (res.status === 4) {
          this.loading = false;
          this.modalTitle = 'Device Conflict';
          this.modalMessage = 'This phone number is currently logged in on another device. Logging in here will log you out from that device. Do you want to proceed?';
          this.onConfirmCallback = () => this.sendOtpFlow();
          this.showConfirmModal = true;
          return;
        }

        // status 2, 5, 6 proceed directly
        this.sendOtpFlow();
      },
      error: (err) => {
        console.error('Check user failed:', err);
        alert('Verification failed. Please try again.');
        this.loading = false;
      }
    });
  }

  async sendOtpFlow() {
    this.loading = true;
    try {
      this.authService.setupRecaptcha('recaptcha-container');
      await this.authService.sendOTP('+91' + this.phoneNumber);
      this.loading = false;
      this.router.navigate(['/verify-otp']);
    } catch (err) {
      console.error(err);
      alert('OTP failed');
      this.loading = false;
    }
  }

  confirmAction() {
    this.showConfirmModal = false;
    this.onConfirmCallback();
  }

  cancelAction() {
    this.showConfirmModal = false;
    this.loading = false;
  }
}