import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import {
  Auth,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
  signOut
} from '@angular/fire/auth';
import { environment } from '../../environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  

  private recaptchaVerifier!: RecaptchaVerifier;
  private confirmationResult!: ConfirmationResult;

  private currentUser: any = null;
  private sessionChecked = false;
  private firebaseToken: string | null = null;
  private firstTimeUser = false;

  setFirstTimeUser(val: boolean) {
    this.firstTimeUser = val;
  }

  isFirstTimeUser(): boolean {
    return this.firstTimeUser;
  }

  setFirebaseToken(token: string | null) {
    this.firebaseToken = token;
  }

  getFirebaseToken(): string | null {
    return this.firebaseToken;
  }

  constructor(
    @Inject(Auth) private auth: Auth,
    private http: HttpClient
  ) {}

  setupRecaptcha(containerId: string) {
    console.log('--- Firebase Auth Debug ---');
    console.log('Firebase App Name:', this.auth.app?.name);
    console.log('Firebase Project ID:', this.auth.app?.options?.projectId);
    console.log('Firebase API Key:', this.auth.app?.options?.apiKey);
    console.log('---------------------------');

    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch (e) {
        console.warn(e);
      }
    }

    this.recaptchaVerifier = new RecaptchaVerifier(
      this.auth,
      containerId,
      {
        size: 'invisible'
      }
    );
  }

  async verifyRecaptcha(): Promise<string> {
    if (!this.recaptchaVerifier) {
      throw new Error('Recaptcha not initialized');
    }
    return await this.recaptchaVerifier.verify();
  }

  async sendOTP(phoneNumber: string) {

    if (!this.recaptchaVerifier) {
      throw new Error('Recaptcha not initialized');
    }

    this.confirmationResult =
      await signInWithPhoneNumber(
        this.auth,
        phoneNumber,
        this.recaptchaVerifier
      );
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

  createSession(firebaseToken: string) {

    this.sessionChecked = false;
    this.currentUser = null;

    return this.http.post(
      `${environment.apiUrl}/auth/session`,
      {},
      {
        headers: {
          Authorization: `Bearer ${firebaseToken}`
        },
        withCredentials: true
      }
    );
  }

  linkFirebase(firebaseToken: string) {
    return this.http.post(
      `${environment.apiUrl.replace('/web', '')}/organization/link-firebase`,
      {},
      {
        headers: {
          Authorization: `Bearer ${firebaseToken}`
        },
        withCredentials: true
      }
    );
  }

  registerDevice() {
    return this.http.post(
      `${environment.apiUrl}/auth/register-device`,
      {},
      {
        withCredentials: true
      }
    );
  }

  setupMpin(mpin: string) {
    this.sessionChecked = false;
    this.currentUser = null;
    return this.http.post(
      `${environment.apiUrl}/auth/setup-mpin`,
      {
        mpin
      },
      {
        withCredentials: true
      }
    );
  }

  loginWithMPin(mpin: string) {
    this.sessionChecked = false;
    this.currentUser = null;
    return this.http.post(
      `${environment.apiUrl}/auth/mpin-login`,
      {
        mpin
      },
      {
        withCredentials: true
      }
    );
  }

  getDeviceStatus() {
    return this.http.get(
      `${environment.apiUrl}/auth/device-status`,
      {
        withCredentials: true
      }
    );
  }

  getDevices() {
    return this.http.get(
      `${environment.apiUrl}/auth/devices`,
      {
        withCredentials: true
      }
    );
  }

  deleteDevice(id: number) {

  return this.http.delete(
    `${environment.apiUrl}/auth/devices/${id}`,
    {
      withCredentials: true
    }
  );
}

  getCurrentUser() {
    return this.http.get(
      `${environment.apiUrl}/auth/me`,
      {
        withCredentials: true
      }
    );
  }

  isAuthenticated(): Observable<any> {

    if (this.sessionChecked) {

      if (this.currentUser) {
        return of(this.currentUser);
      }

      return throwError(() =>
        new Error('Not authenticated')
      );
    }

    return this.http.get(
      `${environment.apiUrl}/auth/me`,
      {
        withCredentials: true
      }
    ).pipe(
      map(user => {

        this.currentUser = user;
        this.sessionChecked = true;

        return user;
      }),
      catchError(err => {

        this.currentUser = null;
        this.sessionChecked = true;

        return throwError(() => err);
      })
    );
  }

  clearSession() {

    this.currentUser = null;
    this.sessionChecked = false;
  }

  async logout() {

    this.clearSession();

    try {
      await signOut(this.auth);
    } catch (e) {
      console.warn(e);
    }

    return this.http.post(
      `${environment.apiUrl}/auth/logout`,
      {},
      {
        withCredentials: true
      }
    ).toPromise();
  }

  getRole() {
    return localStorage.getItem("role") || '';
  }

  setRole(role: string) {
    localStorage.setItem("role", role);
  }
}