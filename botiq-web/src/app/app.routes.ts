import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddNewOrderComponent } from './add-new-order/add-new-order.component';
import { JobOrderComponent } from './job-order/job-order.component';
import { TabsContainerComponent } from './tabs-container/tabs-container.component';
import { OrderListComponent } from './order-list/order-list.component';
import { authGuard, publicGuard, roleGuard } from './auth/auth.guard';
import { JobOrderListComponent } from './job-order-list/job-order-list.component';
import { PartnersListComponent } from './partners-list/partners-list.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AddPartnerComponent } from './add-partner/add-partner.component';
import { DashboardV2Component } from './dashboard-v2/order-list-v2.component';
import { PlanPageComponent } from './plan-page/plan-page.component';
import { RegisterComponent } from './register/register.component';
import { SetupMpinComponent } from './pages/auth/setup-mpin/setup-mpin.component';
import { MpinLoginComponent } from './pages/auth/mpin-login/mpin-login.component';
import { DevicesComponent } from './pages/security/devices/devices.component';
import { AddNewUserComponent } from './add-new-user/add-new-user.component';
import { NewOrders } from './new-orders/new-orders';
import { Reports } from './reports/reports';
import { PartnerDashboard } from './partner/partner-dashboard/partner-dashboard';
import { UpdateJobOrders } from './partner/update-job-orders/update-job-orders';
import { OrderEntryComponent } from './shared/order-entry/order-entry.component';
import { ServerIpComponent } from './pages/auth/server-ip/server-ip.component';

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
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    // { path: 'order-list', component: OrderListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'order-list', component: DashboardV2Component, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'job-order-list', component: JobOrderListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'partners-list', component: PartnersListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'user-profile', component: UserProfileComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'add-partner', component: AddPartnerComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'dashboard-v2', component: DashboardV2Component, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'partner/:id', component: AddPartnerComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'plan-page', component: PlanPageComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'register', component: RegisterComponent },
    { path: 'setup-mpin', component: SetupMpinComponent },
    { path: 'mpin-login', component: MpinLoginComponent },
    { path: 'server-ip', component: ServerIpComponent },
    { path: 'add-new-user', component: AddNewUserComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'devices', component: DevicesComponent, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'reports', component: Reports, canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] } },
    { path: 'partner-dashboard', component: PartnerDashboard, canActivate: [authGuard, roleGuard], data: { roles: ['PARTNER'] } },
    { path: 'update-job-orders', component: UpdateJobOrders, canActivate: [authGuard, roleGuard], data: { roles: ['PARTNER'] } },
    // {
    //     path: 'add-new-order',
    //     component: TabsContainerComponent,
    //     canActivate: [authGuard, roleGuard], data: { roles: ['OWNER'] },
    //     children: [
    //         {
    //             path: 'tab1',
    //             component: AddNewOrderComponent,
    //         },
    //         {
    //             path: 'tab2',
    //             component: JobOrderComponent,
    //         },
    //         {
    //             path: '',
    //             redirectTo: 'tab1',
    //             pathMatch: 'full',
    //         },
    //     ],
    // }
    { path: 'trial', component: OrderEntryComponent },
    {
        path: 'add-new-order',
        component: TabsContainerComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['OWNER'] },
        children: [
            {
                path: 'tab1',
                component: NewOrders,
            },
            {
                path: 'tab2',
                component: JobOrderComponent,
            },
            {
                path: '',
                redirectTo: 'tab1',
                pathMatch: 'full',
            },
        ],
    },
];
