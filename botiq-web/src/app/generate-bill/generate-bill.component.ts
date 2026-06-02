import { Component } from '@angular/core';
import { OrderestateService } from '../orderestate.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-generate-bill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generate-bill.component.html',
  styleUrl: './generate-bill.component.css'
})
export class GenerateBillComponent {

  orderData: any;
  jobOrders: any[] = [];

  totalAmount: number = 0;

  constructor(private orderState: OrderestateService, private router: Router) { }

  ngOnInit(): void {
    this.orderData = this.orderState.getOrderData();


    console.log("ORDER DATA:", this.orderData);

    this.calculateTotalAmount();
  }




  calculateTotalAmount() {
    this.totalAmount = 0;

    this.orderData?.orderDetails?.forEach((item: any) => {
      this.totalAmount += item.quantity * item.price;
    });
  }

  printBill() {
    window.print();
  }

  downloadInvoice() {
    const element = document.getElementById('print-section');
    const bill = this.orderData.order?.orderId;
    const customerName = this.orderData.customer?.name;
    if (!element) return;

    html2canvas(element, {
      scale: 2,
      useCORS: true
    }).then(canvas => {

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;


      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${customerName}_${bill}.pdf`);
    });
  }

}
