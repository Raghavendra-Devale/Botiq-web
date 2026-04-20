import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
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
export class RegisterComponent {

  registerData = {
    orgName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    terms: false
  }

  recaptchaVerifier!: any;


  constructor(private router: Router, private http: HttpClient,
    private orderService: OrderService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.setupRecaptcha('recaptcha-container');
  }

  onSubmit(registerForm: any) {
    this.registerData.orgName = registerForm.controls['orgName'].value;
    this.registerData.ownerName = registerForm.controls['ownerName'].value;
    this.registerData.email = registerForm.controls['email'].value;
    this.registerData.phone = registerForm.controls['phone'].value;
    this.registerData.address = registerForm.controls['address'].value;
    this.registerData.terms = registerForm.controls['terms'].value;

    this.searchByPhoneNumber();
  }

  async sendOtp() {
    try {
      if (!this.registerData.phone || this.registerData.phone.length !== 10) {
        alert('Enter a valid 10-digit number');
        return;
      }
      await this.authService.sendOTP('+91' + this.registerData.phone);
      this.router.navigate(['/verify-otp'], { state: { registerData: this.registerData } });
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP');
    }
  }

searchByPhoneNumber() {
  if (this.registerData.phone.length === 10) {
    this.orderService.checkUserExists(this.registerData.phone).subscribe({
      next: (res: any) => {
        console.log(res);
        if (res.exists) {
          this.router.navigate(['/login']);
        } else {
          this.sendOtp();
        }
      },
      error: (err: any) => console.log(err)
    });
  }
}
}
