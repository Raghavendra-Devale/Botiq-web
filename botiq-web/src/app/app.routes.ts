import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddNewOrderComponent } from './add-new-order/add-new-order.component';
import { JobOrderComponent } from './job-order/job-order.component';
import { TabsContainerComponent } from './tabs-container/tabs-container.component';
import { CustomerOrderListComponent } from './customer-order-list/customer-order-list.component';
import { OrderListComponent } from './order-list/order-list.component';
import { authGuard, publicGuard } from './auth/auth.guard';
import { JobOrderListComponent } from './job-order-list/job-order-list.component';
import { PartnersListComponent } from './partners-list/partners-list.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AddPartnerComponent } from './add-partner/add-partner.component';
import { DashboardV2Component } from './dashboard-v2/dashboard-v2.component';
import { PlanPageComponent } from './plan-page/plan-page.component';
import { RegisterComponent } from './register/register.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
        path: 'verify-otp',
        loadComponent: () =>
            import('./verify-otp/verify-otp.component')
                .then(m => m.VerifyOtpComponent),
        canActivate: [publicGuard]
    },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'order-list', component: OrderListComponent, canActivate: [authGuard] },
    { path: 'job-order-list', component: JobOrderListComponent, canActivate: [authGuard] },
    { path: 'partners-list', component: PartnersListComponent, canActivate: [authGuard] },
    { path: 'user-profile', component: UserProfileComponent, canActivate: [authGuard] },
    { path: 'add-partner', component: AddPartnerComponent, canActivate: [authGuard] },
    { path: 'dashboard-v2', component: DashboardV2Component, canActivate: [authGuard] },
    { path: 'partner/:id', component: AddPartnerComponent, canActivate: [authGuard] },
    { path: 'plan-page', component: PlanPageComponent, canActivate: [authGuard] },
    { path: 'register', component: RegisterComponent },
    {
        path: 'add-new-order',
        component: TabsContainerComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'tab1',
                component: AddNewOrderComponent,
            },
            {
                path: 'tab2',
                component: JobOrderComponent,
            },
            {
                path: 'tab3',
                component: CustomerOrderListComponent,
            },
            {
                path: '',
                redirectTo: 'tab1',
                pathMatch: 'full',
            },
        ],
    }
];
