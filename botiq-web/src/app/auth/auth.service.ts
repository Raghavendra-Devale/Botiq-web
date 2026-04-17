import { Inject, Injectable } from '@angular/core';
import {
  Auth,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private recaptchaVerifier!: RecaptchaVerifier;
  private confirmationResult!: ConfirmationResult;

  constructor(@Inject(Auth) private auth: Auth) { }

  setupRecaptcha(containerId: string) {
    this.recaptchaVerifier = new RecaptchaVerifier(
      this.auth,
      containerId,
      {
        size: 'invisible'
      }
    )
  }

  async sendOTP(phoneNumber: string) {
    if (!this.recaptchaVerifier) {
      throw new Error('Recaptcha not initialized');
    }

    this.confirmationResult = await signInWithPhoneNumber(
      this.auth,
      phoneNumber,
      this.recaptchaVerifier
    )
  }

  async verifyOTP(otp: string) {
    if (!this.confirmationResult) {
      throw new Error('Confirmation result not found');
    }

    return await this.confirmationResult.confirm(otp);
  }

  hasConfirmationResult() {
    return !!this.confirmationResult;
  }

}
