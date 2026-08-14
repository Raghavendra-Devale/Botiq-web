import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PartnerService } from './partner.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  baseUrl = "";

  constructor(private http: HttpClient, private partnerService: PartnerService) {
    this.baseUrl = environment.apiUrl;
  }

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
    return this.http.post<any>(this.baseUrl + "/getOrderById", { order_id: id });
  }
  getPartners() {
    return this.partnerService.getPartners();
  }

  saveOrder(payload: any) {
    return this.http.post<any>(this.baseUrl + "/saveOrder", payload);
  }

  getCategories() {
    return this.http.get<any>(this.baseUrl + "/getMasterByType?type=WORK_CATEGORY");
  }

  getStatusList() {
    return this.http.get<any>(this.baseUrl + "/getMasterByType?type=ORDER_STATUS");
  }

  getAllOrders() {
    return this.http.post<any>(this.baseUrl + "/getAllOrders", {});
  }

  getPaginatedOrders(payload: any) {
    return this.http.post<any>(this.baseUrl + "/getPaginatedOrders", payload);
  }

  downloadReport() {
    return this.http.get(this.baseUrl + '/exportOrders', {
      responseType: 'blob'
    });
  }

  addOrUpdatePartner(partner: any) {
    return this.http.post<any>(this.baseUrl + "/savePartner", partner);
  }

  deleteOrder(payload: any) {
    return this.http.post<any>(this.baseUrl + "/deleteOrder", payload);
  }

  partnerJobOrders(partnerId?: any) {
    const payload = partnerId ? { partner_id: partnerId } : {};
    return this.http.post<any>(this.baseUrl + "/partnerJobOrders", payload);
  }

  saveOrUpdateJobOrder(payload: any) {
    return this.http.post<any>(this.baseUrl + "/saveOrUpdateJobOrder", payload);
  }

}
