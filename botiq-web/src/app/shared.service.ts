import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  private authStateSubject = new BehaviorSubject<boolean | null>(null);
  authState$ = this.authStateSubject.asObservable();

  setLoginStatus(status: boolean): void {
    this.authStateSubject.next(status);
  }

  getLoginStatus(): boolean | null {
    return this.authStateSubject.value;
  }

  private userInfoSubject = new BehaviorSubject<any>(null);
  userInfo$ = this.userInfoSubject.asObservable();

  setUserInfo(data: any) {
    this.userInfoSubject.next(data);
  }

  getUserInfo() {
    return this.userInfoSubject.value;
  }
}