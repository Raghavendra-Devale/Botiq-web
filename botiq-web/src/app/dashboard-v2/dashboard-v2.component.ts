import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from '../dashboard.service';

@Component({
    selector: 'app-dashboard-v2',
    imports: [],
    templateUrl: './dashboard-v2.component.html',
    styleUrl: './dashboard-v2.component.css'
})
export class DashboardV2Component {

  monthlyDueSummary: any = {};
  orderSummary: any = {};
  jobOrderSummary: any = {};
  dueOrderSummary: any = {};

  monthLabels = {
    m1: '',
    m2: '',
    m3: ''
  };

  constructor(
    private router: Router,
    private dashboardService: DashboardService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      const data = await this.dashboardService.getFullDashboard();

      console.log("Dashboard V2 Data:", data);

      this.monthLabels = this.getMonthLabels();

      this.monthlyDueSummary = data?.monthly_due_summary || {};
      this.orderSummary = data?.order_summary || {};
      this.jobOrderSummary = data?.job_order_summary || {};
      this.dueOrderSummary = data?.due_order_summary || {};

    } catch (error) {
      console.error("Dashboard load error:", error);
    }
  }

  addNewOrder() {
    this.router.navigate(['/add-new-order']);
  }

  goToOrderList(segment: string, tabId: number) {
    this.router.navigate(['/order-list'], {
      queryParams: { segment, tabId }
    });
  }

  goToJobOrderList(jobSegment: string, tabId: number) {
    this.router.navigate(['/job-order-list'], {
      queryParams: { jobSegment, tabId }
    });
  }

  getMonthLabels(): { m1: string; m2: string; m3: string } {
    const now = new Date();

    const m1 = now.toLocaleString('default', { month: 'short' });
    const m2 = new Date(now.getFullYear(), now.getMonth() + 1)
      .toLocaleString('default', { month: 'short' });
    const m3 = new Date(now.getFullYear(), now.getMonth() + 2)
      .toLocaleString('default', { month: 'short' });

    return { m1, m2, m3 };
  }

}