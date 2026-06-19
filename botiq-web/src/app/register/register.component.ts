import { CommonModule } from '@angular/common';
import { Component, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../order.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements AfterViewInit {

  registerData = {
    orgName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    terms: false
  };

  isLoading = false;

  constructor(
    private router: Router,
    private orderService: OrderService,
    private authService: AuthService
  ) { }

  ngAfterViewInit() {
  }

  onSubmit(form: any) {
    this.registerData.phone = this.normalizeIndianPhone(this.registerData.phone);
    this.trimInputs();

    if (form.invalid) {
      alert('Please fill all required fields correctly');
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;

    if (!phoneRegex.test(this.registerData.phone)) {
      alert('Enter a valid Indian mobile number');
      return;
    }

    this.handleRegistrationFlow();
  }
  private normalizeIndianPhone(phone: string): string {
    phone = phone.replace(/\D/g, '');


    if (phone.startsWith('91') && phone.length === 12) {
      phone = phone.substring(2);
    }

    return phone;
  }
  private trimInputs() {
    this.registerData = {
      ...this.registerData,
      orgName: this.registerData.orgName.trim(),
      ownerName: this.registerData.ownerName.trim(),
      email: this.registerData.email.trim(),
      phone: this.registerData.phone.trim(),
      address: this.registerData.address.trim()
    };
  }

  private handleRegistrationFlow() {
    if (this.isLoading) return;

    this.isLoading = true;

    this.orderService.checkUserExists(this.registerData.phone).subscribe({
      next: async (res: any) => {
        if (res.exists) {
          alert('User already exists. Please login.');
          this.router.navigate(['/login']);
        } else {
          await this.sendOtpAndNavigate();
        }
      },
      error: (err) => {
        console.error(err);
        alert('Something went wrong');
        this.isLoading = false;
      }
    });
  }

  private async sendOtpAndNavigate() {
    try {
      this.authService.setupRecaptcha('recaptcha-container');
      await this.authService.sendOTP('+91' + this.registerData.phone);

      this.router.navigate(['/verify-otp'], {
        state: { registerData: this.registerData }
      });

    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to send OTP');
    } finally {
      this.isLoading = false;
    }
  }
}