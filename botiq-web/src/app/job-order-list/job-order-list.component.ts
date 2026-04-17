import { Component } from '@angular/core';
import { OrderService } from '../order.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-job-order-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-order-list.component.html',
  styleUrl: './job-order-list.component.css'
})
export class JobOrderListComponent {
  orders: any;

  ngOnInit() {
    this.fetchJobOrders();
  }

  constructor(private orderService: OrderService,
    private router: Router
  ) {

  }

  editOrder(order: any) {
    this.router.navigate(['/add-new-order'], {
      queryParams: { id: order.order_id }
    });
  }


  fetchJobOrders() {
    this.orderService.getJobOrders().subscribe(res => {
      this.orders = res;
      console.log("job orders ", res);
      console.log(" oirders ", this.orders);

    });
  }



}
