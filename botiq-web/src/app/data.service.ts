import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  baseUrl = '';

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  checkUserExists(payload: { phoneNumber: string, deviceId: any }): Observable<any> {
    console.log(payload)
    return this.http.post<any>(`${this.baseUrl}/organization/check-user`, payload);
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

}

