import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  baseUrl: string;
  constructor(
    private http: HttpClient
  ) {
    this.baseUrl = environment.apiUrl;
  }

  getFullDashboard() {
    return this.http.post<any>(this.baseUrl + "/getDashboardData", {}).toPromise();
  }

}

