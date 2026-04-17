import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  phoneNumber: string = '';
  userStatus: number | any;


  constructor(private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.setupRecaptcha('recaptcha-container');
  }

  async requestOtp() {
    if (!this.phoneNumber || this.phoneNumber.length !== 10) {
      alert('Enter valid number');
      return;
    }

    try {
      await this.authService.sendOTP('+91' + this.phoneNumber);
      this.router.navigate(['/verify-otp']);
    } catch (err) {
      console.error(err);
      alert('OTP failed');
    }
  }
}