import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OrderestateService {

  private orderData: any;

  setOrderData(data: any) {
    this.orderData = data;
  }

  getOrderData() {
    return this.orderData;
  }
}
