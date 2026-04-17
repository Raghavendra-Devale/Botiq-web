import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../order.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderestateService } from '../orderestate.service';

@Component({
  selector: 'app-job-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    const nav = this.router.getCurrentNavigation();
    this.orderData = nav?.extras?.state?.['orderData'];

    console.log("Received Order Data:", this.orderData);

    this.loadPartners();


    this.combinedImages = [
      ...(this.orderData?.details?.measurements || []),
      ...(this.orderData?.details?.patterns || []),
      ...(this.orderData?.details?.materials || [])
    ];
    this.orderData = this.orderStateService.getOrderData();
    console.log("ORDER DATA FROM SERVICE:", this.orderData);
    console.log("ORDER DETAILS FROM SERVICE:", this.orderData.orderDetails);
    console.log("ORDER DETAILS FROM SERVICE:", this.orderData.details);




    this.addNewJobOrderSection();
  }

  loadPartners() {
    this.orderService.getPartners().subscribe((res: any) => {
      this.partners = res;
    });
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

    this.orderService.saveFullOrder(payload).subscribe(res => {
      console.log("Saved:", res);
      this.router.navigate(['/saveJobOrders']);

    });

    this.router.navigate(['/dashboard-v2']);

  }




}