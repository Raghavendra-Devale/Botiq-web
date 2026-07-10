import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../order.service';

import { FormsModule } from '@angular/forms';
import { OrderestateService } from '../orderestate.service';

@Component({
    selector: 'app-job-order',
    imports: [FormsModule],
    templateUrl: './job-order.component.html',
    styleUrl: './job-order.component.css'
})
export class JobOrderComponent implements OnInit {

  orderData: any;

  partners: any[] = [];
  jobOrders: any[] = [];


  statusList = ['Pending', 'In Progress', 'Completed'];
  jobPriorityOptions = ['Low', 'Medium', 'High'];

  combinedImages: any[] = []; // from previous page

  constructor(private router: Router, private orderService: OrderService, private orderStateService: OrderestateService) { }

  ngOnInit() {

    // ✅ Use ONLY service (single source of truth)
    this.orderData = this.orderStateService.getOrderData();

    if (!this.orderData) {
      console.error("No order data found");
      this.router.navigate(['/add-new-order']);
      return;
    }

    console.log("ORDER DATA:", this.orderData);

    this.loadPartners();

    // ✅ Normalize images for UI usage
    this.combinedImages = [
      ...(this.orderData.details?.measurements || []),
      ...(this.orderData.details?.patterns || []),
      ...(this.orderData.details?.materials || [])
    ].map((img: any) => {
      const base64 = typeof img === 'string' ? img : (img.base64 || img.details_data || img.detailsData || '');
      return {
        base64,
        temp_id: img.temp_id || Date.now() + Math.random()
      };
    }).filter((img: any) => img.base64);

    // ✅ Map backend jobOrders → UI model (supporting both snake_case and camelCase)
    this.jobOrders = (this.orderData.jobOrders || []).map((job: any) => ({
      selectedPartner: null, // will map after partners load
      partnerId: job.partner_id || job.partnerId || null,
      selectedJobDetails: (job.job_order_details || job.jobOrderDetails)?.jobDetails || [],
      dueDate: job.job_due_date || job.jobDueDate || '',
      status: job.job_order_status || job.jobOrderStatus || 'Pending',
      priority: this.reverseMapPriority(job.job_priority !== undefined ? job.job_priority : job.jobPriority),
      selectedImages: [],
      minimized: false
    }));

    // ✅ If no jobs → create one blank
    if (this.jobOrders.length === 0) {
      this.addNewJobOrderSection();
    }
  }

  loadPartners() {
    this.orderService.getPartners().subscribe((res: any) => {
      this.partners = res;

      // ✅ Now map partner into jobOrders (after API loads)
      this.jobOrders.forEach(job => {
        if (job.partnerId) {
          job.selectedPartner = this.partners.find(
            p => (p.partner_id || p.partnerId) === job.partnerId
          ) || null;
        }
      });
    });
  }


  reverseMapPriority(priority: number): string {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Medium';
    }
  }

  addNewJobOrderSection() {
    this.jobOrders.push({
      selectedPartner: null,
      selectedJobDetails: [],
      dueDate: '',
      status: 'Pending',
      priority: 'Medium',
      selectedImages: [],
      minimized: false
    });
  }


  toggleCard(index: number) {
    this.jobOrders[index].minimized = !this.jobOrders[index].minimized;
  }


  deleteJobOrder(index: number) {
    this.jobOrders.splice(index, 1);
  }


  selectPartner(jobIndex: number, partner: any) {
    this.jobOrders[jobIndex].selectedPartner = partner;
  }


  onPriorityChange(priority: string, index: number) {
    this.jobOrders[index].priority = priority;
  }


  toggleImage(img: any, index: number) {
    const job = this.jobOrders[index];

    const exists = job.selectedImages.find((i: any) => i.temp_id === img.temp_id);

    if (exists) {
      job.selectedImages = job.selectedImages.filter((i: any) => i.temp_id !== img.temp_id);
    } else {
      job.selectedImages.push(img);
    }
  }

  isImageSelected(img: any, index: number): boolean {
    return this.jobOrders[index].selectedImages.some((i: any) => i.temp_id === img.temp_id);
  }

  mapPriority(priority: string): number {
    switch (priority) {
      case 'High': return 1;
      case 'Medium': return 2;
      case 'Low': return 3;
      default: return 2;
    }
  }

  saveAllJobOrders() {

    const validJobs = this.jobOrders.filter(job =>
      job.selectedPartner &&
      job.dueDate &&
      job.status
    );

    const payload = {
      ...this.orderData,

      jobOrders: validJobs.map(job => ({
        partnerId: job.selectedPartner.partner_id,
        dueDate: job.dueDate,
        status: job.status,
        priority: this.mapPriority(job.priority),

        jobOrderDetails: {
          jobDetails: job.selectedJobDetails || [],
          images: (job.selectedImages || []).map((img: any) => img.base64)
        }
      }))
    };

    console.log("FINAL PAYLOAD:", payload);

    this.orderService.saveFullOrder(payload).subscribe({
      next: (res) => {
        console.log("Saved:", res);
        this.router.navigate(['/dashboard-v2']);
      },
      error: (err) => {
        console.error("Save failed:", err);
      }
    });
  }

  backToOrderList() {

    const queryParams: any = {};
    const orderId = this.orderData.order?.orderId || this.orderData.order?.order_id;
    if (orderId) {
      queryParams.id = orderId;
    }
    this.router.navigate(['/add-new-order/tab1'], { 
      state: { orderData: this.orderData },
      queryParams: queryParams
    });
  }
}
