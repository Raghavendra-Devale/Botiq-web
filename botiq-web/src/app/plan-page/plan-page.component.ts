import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-page.component.html',
  styleUrl: './plan-page.component.css'
})
export class PlanPageComponent {
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
  ) {

  }

  async ngOnInit() {
    await this.getPlanMaster();
    this.currentPlan = this.planMaster[0];
    console.log("next plan ", this.currentPlan);

    // this.getCurrentPlan();
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

}
