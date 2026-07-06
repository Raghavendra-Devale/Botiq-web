import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  baseUrl = '';

  constructor(private http: HttpClient, private authService: AuthService) {
    this.baseUrl = environment.apiUrl;
  }

  checkUserExists(payload: { phoneNumber: string, deviceId: any }): Observable<any> {
    console.log(payload)
    return this.http.post<any>(`${this.baseUrl.replace('/web', '')}/organization/check-user`, payload);
  }

  getBasicData() {
    return this.http.get<any>(this.baseUrl + "/getBasicDetails");
  }

  saveProfile(payload: any) {
    return this.http.post<any>(this.baseUrl + "/saveProfile", payload);
  }

  getPlanMaster() {
    return this.http.post<any>("http://localhost:8080/public/getPlanMaster", {});
  }

  getCurrentPlan(orgId: any) {
    return this.http.post<any>("http://localhost:8080/getCurrentPlan", { orgId });
  }

  createPaymentOrder(planTypeId: number, upgrade: string): Observable<any> {
    const token = this.authService.getFirebaseToken() || '';
    return this.http.post<any>(`${this.baseUrl.replace('/web', '')}/payment/createOrder`, {
      plan_type_id: planTypeId,
      upgrade: upgrade
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  }

  verifyPayment(payload: { razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }): Observable<any> {
    const token = this.authService.getFirebaseToken() || '';
    return this.http.post<any>(`${this.baseUrl.replace('/web', '')}/payment/verify`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  }

  requestCallback(payload: any): Observable<any> {
    const token = this.authService.getFirebaseToken() || '';
    return this.http.post<any>(`${this.baseUrl.replace('/web', '')}/organization/callbackrequests`, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  }

  addUser(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + "/addUser", payload);
  }

  editUser(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl + "/editUser", payload);
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(this.baseUrl + "/getUsers");
  }

}

