import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  checkUserExists(mobile: string) {
    return this.http.post<any>(this.baseUrl + "/checkUserExists", { mobile });
  }
  searchCustomerByPhoneNumber(mobile: string) {
    return this.http.post<any>(this.baseUrl + "/searchCustomerByPhoneNumber", { mobile });
  }
  getJobOrders() {
    return this.http.get(this.baseUrl + "/getJobOrdes");
  }
  updateOrder(payload: any) {
    return this.http.post<any>(this.baseUrl + "/updateOrder", payload);
  }
  getOrderById(id: number) {
    return this.http.get(this.baseUrl + "/orders/" + id);
  }
  saveFullOrder(payload: any) {
    return this.http.post<any>(this.baseUrl + "/save_order", payload);
  }

  getPartnersById(id: number) {
    return this.http.get<any>(this.baseUrl + "/getPartners" + id);
  }
  getPartners() {
    return this.http.get<any>(this.baseUrl + "/getPartners");
  }
  baseUrl = "";
  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  saveOrder(payload: any) {
    console.log(payload, "payload");
    console.log(this.baseUrl);

    return this.http.post<any>(this.baseUrl + "/save_order", payload);
  }

  getCategories() {
    return this.http.get<any>(this.baseUrl + "/getMasterByType?type=WORK_CATEGORY");
  }

  getStatusList() {
    return this.http.get<any>(this.baseUrl + "/getMasterByType?type=ORDER_STATUS");
  }

  getMasterDetails() {
    return this.http.get(this.baseUrl + "/getMasterByType?type=WORK_CATEGORY").subscribe({
      next: (res: any) => {
        console.log(res);

      },
      error: (err: any) => {
        console.log(err);

      }
    })
  }

  getAllOrders() {
    return this.http.post<any>(this.baseUrl + "/getAllOrders", {});
  }

  addOrUpdatePartner(partner: any) {
    return this.http.post<any>(this.baseUrl + "/savePartner", partner);
  }

  deleteOrder(payload: any) {
    return this.http.post<any>(this.baseUrl + "/deleteOrder", payload);
  }

}
