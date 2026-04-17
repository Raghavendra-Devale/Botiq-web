import { HttpClient, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {
  baseUrl = '';

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }
  getPartners(): any {

    return this.http.get<any>(this.baseUrl + "/getPartners")

  }
  deletePartner(id: number): any {
    console.log(("deleting partber " + id));

    return this.http.post<any>(this.baseUrl + "/deletePartner", { id });
  }

  getPartnerById(id: number): any {
    return this.http.get<any>(this.baseUrl + "/getPartnerById/" + id);
  }

  updatePartner(id: number, partner: any): any {
    return this.http.put<any>(this.baseUrl + "/updatePartner/" + id, partner);
  }

  addPartner(partner: any): any {
    return this.http.post<any>(this.baseUrl + "/addPartner", partner);
  }


}
