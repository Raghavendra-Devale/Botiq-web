import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';

declare var Razorpay: any;

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-page.component.html',
  styleUrl: './plan-page.component.css'
})
export class PlanPageComponent implements OnInit {
  currentPlan: any;
  planMaster: any[] = [];
  selectedPlan: any = null;
  orgId: any;
  ownerName: any;
  orgName: any;
  emailId: any;
  mobileNumber: any;
  daysLeft: number = 0;
  nextPlan: any;
  canRenew: boolean = false;
  showUpcoming: boolean = false;

  constructor(private router: Router,
    private dataService: DataService
  ) { }

  async ngOnInit() {
    await this.getPlanMaster();
    
    // Fetch user details for prefilling Razorpay checkout
    this.dataService.getBasicData().subscribe({
      next: (res: any) => {
        this.orgId = res.org_id;
        this.orgName = res.org_name;
        this.ownerName = res.owner_name;
        this.emailId = res.email_id;
        this.mobileNumber = res.mobile_number;
        console.log("Prefill details loaded:", res);
      },
      error: (err) => {
        console.error("Error fetching user details", err);
      }
    });
  }

  getPlanMaster() {
    this.dataService.getPlanMaster().subscribe((res: any) => {
      this.planMaster = res.plan_master.filter((plan: any) =>
        plan.plan_type?.toLowerCase() !== 'free'
      );
      this.currentPlan = res.current_plan;

      console.log("planMaster", this.planMaster);
      console.log("currentPlan", this.currentPlan);
    });
  }

  openIndex: number | null = null;

  toggleAccordion(index: number) {
    this.openIndex = this.openIndex === index ? null : index;
  }

  async getCurrentPlan() {
    await this.dataService.getCurrentPlan(this.orgId).subscribe((res: any) => {
      console.log(res);
      this.currentPlan = res;
    });
    
  }

  isPaidPlan(plan: any): boolean {
    return plan && plan.plan_info && plan.plan_info.plan_cost !== null && plan.plan_info.plan_cost > 0;
  }

  handleCTA() {
    if (!this.selectedPlan) return;

    if (this.isPaidPlan(this.selectedPlan)) {
      this.initiatePayment();
    } else {
      this.requestCallback();
    }
  }

  initiatePayment() {
    if (!this.selectedPlan) return;

    const planTypeId = this.selectedPlan.plan_type_id;
    // Check if upgrade: currentPlan exists and is not free
    const isUpgrade = (this.currentPlan && this.currentPlan.plan_type?.toLowerCase() !== 'free') ? 'YES' : 'NO';

    this.dataService.createPaymentOrder(planTypeId, isUpgrade).subscribe({
      next: (orderData: any) => {
        console.log("Razorpay order created:", orderData);
        this.openRazorpay(orderData);
      },
      error: (err) => {
        console.error("Order creation failed", err);
        alert("Failed to initiate payment. Please try again or contact support.");
      }
    });
  }

  openRazorpay(orderData: any) {
    const options = {
      key: 'rzp_test_fvYk7cIko1ynL6', // Default test key, user will customize later
      // key:'rzp_live_uPqzEKyYdZzm7e',

      amount: orderData.amount, // in paise
      currency: orderData.currency,
      name: 'Botiq',
      description: `Purchase ${orderData.plan_type} Plan`,
      order_id: orderData.order_id,
      handler: (response: any) => {
        console.log("Razorpay response received:", response);
        this.verifyPayment(response);
      },
      prefill: {
        name: this.ownerName || '',
        email: this.emailId || '',
        contact: this.mobileNumber || ''
      },
      theme: {
        color: '#3b82f6'
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  verifyPayment(razorpayResponse: any) {
    const payload = {
      razorpay_order_id: razorpayResponse.razorpay_order_id,
      razorpay_payment_id: razorpayResponse.razorpay_payment_id,
      razorpay_signature: razorpayResponse.razorpay_signature
    };

    this.dataService.verifyPayment(payload).subscribe({
      next: (res: any) => {
        console.log("Payment verification response:", res);
        if (res.success) {
          alert("Payment successful! Your new plan is now active.");
          this.currentPlan = res.plan_info || this.currentPlan;
          this.getPlanMaster();
        } else {
          alert("Payment succeeded, but plan activation failed: " + res.message);
        }
      },
      error: (err) => {
        console.error("Payment verification failed", err);
        alert("Payment verification failed. Please contact support@botiqcloud.com.");
      }
    });
  }

  requestCallback() {
    if (!this.selectedPlan) return;

    const payload = {
      mobileNumber: this.mobileNumber || '',
      email: this.emailId || '',
      requesterName: this.ownerName || '',
      planType: this.selectedPlan.plan_type,
      orgId: this.orgId
    };

    this.dataService.requestCallback(payload).subscribe({
      next: (res: any) => {
        console.log("Callback requested:", res);
        alert(res.message || "Callback request submitted successfully. Our team will contact you soon.");
      },
      error: (err) => {
        console.error("Callback request failed", err);
        alert("Failed to submit callback request. Please try again.");
      }
    });
  }
}
