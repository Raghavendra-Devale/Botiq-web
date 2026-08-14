import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { DashboardService } from '../services/dashboard.service';
import { SseService } from '../services/sse.service';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';
import { ReportsService } from '../services/reports.service';

export interface CurrentPlan {
  plan_type: string;
  plan_end_date?: string;
  expiry_date?: string;
}

@Component({
    selector: 'app-dashboard',
    imports: [],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {


  // monthlyDueSummary: any = {};
  monthlyDueSummary = signal<any>({});
  orderSummary = signal<any>({});
  jobOrderSummary = signal<any>({});
  dueOrderSummary = signal<any>({});
  todayDate = signal(this.setTodayDate());
  monthLabels = signal(this.getMonthLabels());

  // Plan Expiry Banner properties
  showExpiryBanner = signal(false);
  bannerFadeOut = signal(false);
  daysLeft = computed(() => {
      const plan = this.currentPlan();
      if(!plan) return null;

      const endDate = plan.plan_end_date || plan.expiry_date;

      if(!endDate) return null;

      const expiry = new Date(endDate);
      const today = new Date();

      expiry.setHours(0,0,0,0);
      today.setHours(0,0,0,0);

      const timeDiff = expiry.getTime() - today.getTime();
      return Math.round(timeDiff / (1000 * 60 * 60 * 24));
      
  });

  currentPlan = signal<CurrentPlan | null>(null);
  private authSub!: Subscription;

  // orgId: number = 38;

  constructor(
    private router: Router,
    private auth: Auth,
    private dashboardService: DashboardService,
    private sseService: SseService,
    private authService: AuthService,
    private reportsService: ReportsService
  ) { }

  async ngOnInit(): Promise<void> {
    
    this.reportsService.getDailyReport(Date.now()).subscribe({
      next: (res: any) => {
        // Reports data loaded
      },
      error: (err) => {
        console.error('Error fetching basic details:', err);
      }
    })
    
    this.setTodayDate();
    this.loadDashboardData();

    this.sseService.connect();

    this.sseService.messages$.subscribe({
      next: (msg) => {
        if (msg && (msg.event === 'CREATE_ORDER' || msg.event === 'UPDATE_ORDER')) {
          this.loadDashboardData();
        }
      }
    });

    this.authSub = this.authService.basicDetails$.subscribe(details => {
      if (details) {
        this.currentPlan.set({
          plan_type: details.plan_type ??
            details.current_plan?.plan_type ??
            'Free',
          plan_end_date: details.plan_end_date,
          expiry_date: details.expiry_date
        });

        const hasShown = sessionStorage.getItem('hasShownExpiryBanner');
        if (!hasShown && this.daysLeft() !== null && this.daysLeft()! <= 30) {
          this.showExpiryBanner.set(true);
          sessionStorage.setItem('hasShownExpiryBanner', 'true');

          setTimeout(() => {
            this.bannerFadeOut.set(true);
            setTimeout(() => {
              this.showExpiryBanner.set(false);
            }, 300);
          }, 3000);
        }
      }
    });
  }

  setTodayDate(): string {
    const today = new Date();
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    const day = today.getDate();
    const month = today.toLocaleDateString('en-US', { month: 'long' });
    const year = today.getFullYear();
    
    return (`${weekday}, ${day} ${month} ${year}`);
  }

  addNewOrder() {
    this.router.navigate(['/add-new-order']);
  }

  partnerDashboard() {
    this.router.navigate(['/partner-dashboard']);
  }

  async loadDashboardData() {
    const data = await this.dashboardService.getFullDashboard();
    this.monthLabels.set(this.getMonthLabels());

    this.orderSummary.set( {
      ...data?.order_summary,
      newthisweek: data?.order_summary?.new_this_week
    });

    this.monthlyDueSummary.set( {
      ...data?.monthly_due_summary,
      over_due: data?.monthly_due_summary?.over_due
        ?? data?.monthly_due_summary?.overdue
    });

    this.jobOrderSummary.set(data?.job_order_summary || {});
    this.dueOrderSummary.set(data?.due_order_summary || {});

  }


  goToOrderList(segment: string, tabId: number) {
    this.router.navigate(['/order-list'],
      {
        queryParams: { segment, tabId }
      });
  }
  goToJobOrderList(jobSegment: string, tabId: number) {
    this.router.navigate(['/job-order-list'],
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

  formatAmount(amount: any): string {
    if (amount === undefined || amount === null) return '0';
    const num = Number(amount);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
  }

  onBuyNowClick() {
    this.router.navigate(['/plan-page']);
  }

  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }
}

