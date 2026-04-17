import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {


  monthlyDueSummary: any = {};
  orderSummary: any = {};
  jobOrderSummary: any = {};
  dueOrderSummary: any = {};
  monthLabels = {
    m1: 'Jan',
    m2: 'Feb',
    m3: 'Mar'
  };



  orgId: number = 38;

  constructor(
    private router: Router,
    private auth: Auth,
    private dashboardService: DashboardService
  ) { }

  async ngOnInit(): Promise<void> {

    this.loadDashboardData();
  }

  addNewOrder() {
    this.router.navigate(['/add-new-order']);
  }

  async loadDashboardData() {
    const data = await this.dashboardService.getFullDashboard();
    console.log("dashboard data ", data);
    this.monthLabels = this.getMonthLabels();

    this.orderSummary = {
      ...data?.order_summary,
      newthisweek: data?.order_summary?.new_this_week
    };

    this.monthlyDueSummary = {
      ...data?.monthly_due_summary,
      over_due: data?.monthly_due_summary?.over_due
        ?? data?.monthly_due_summary?.overdue
    };
    this.jobOrderSummary = data?.job_order_summary || {};
    this.dueOrderSummary = data?.due_order_summary || {};
    console.log("monthlyDueSummary", this.monthlyDueSummary);

  }


  goToOrderList(segment: string, tabId: number) {
    console.log("going to order list", segment, tabId);

    this.router.navigate(['/order-list'],
      {
        queryParams: { segment, tabId }
      });
  }
  goToJobOrderList(jobSegment: string, tabId: number) {

    console.log("going to job order list", jobSegment, tabId);
    this.router.navigate(['/order-list'],
      {
        queryParams: { jobSegment, tabId }
      });
  }

  getMonthLabels(): { m1: string; m2: string; m3: string } {
    const now = new Date();

    const m1 = now.toLocaleString('default', { month: 'short' }); // Current month
    const m2 = new Date(now.getFullYear(), now.getMonth() + 1).toLocaleString('default', { month: 'long' });
    const m3 = new Date(now.getFullYear(), now.getMonth() + 2).toLocaleString('default', { month: 'long' });

    return { m1, m2, m3 };
  }




}
