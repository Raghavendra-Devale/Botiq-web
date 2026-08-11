import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../../order.service';
import { DataService } from '../../data.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-partner-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-dashboard.html',
  styleUrl: './partner-dashboard.css',
})
export class PartnerDashboard implements OnInit {

  private orderService = inject(OrderService);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private router = inject(Router);

  viewJobDetails(order: any) {
    this.router.navigate(['/update-job-orders'], {
      state: { jobOrder: order }
    });
  }

  orders: any[] = [];
  filteredOrders: any[] = [];
  paginatedOrders: any[] = [];
  selectedSegment: string = 'All';
  searchQuery: string = '';

  // Pagination & Sorting properties
  currentPage: number = 1;
  pageSize: number = 10;
  sortColumn: string = 'order_id';
  sortDirection: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.dataService.getBasicData().subscribe({
      next: (basicData: any) => {
        if (basicData) {
          this.authService.setBasicDetails(basicData);
        }
        const partnerId = basicData?.partner_id || basicData?.partnerId || this.authService.getPartnerId();
        this.fetchJobOrder(partnerId);
      },
      error: (err: any) => {
        console.error('Error fetching basic details in partner dashboard:', err);
        const partnerId = this.authService.getPartnerId();
        this.fetchJobOrder(partnerId);
      }
    });
  }

  fetchJobOrder(partnerId?: any){
    const targetPartnerId = partnerId || this.authService.getPartnerId();
    this.orderService.partnerJobOrders(targetPartnerId).subscribe({
      next: (res: any[]) => {
        const jobMap = new Map<number, any>();
        
        if (res && Array.isArray(res)) {
          res.forEach((row: any) => {
            const jobId = row.job_id;
            if (!jobId) return;

            if (!jobMap.has(jobId)) {
              jobMap.set(jobId, {
                ...row,
                documents: []
              });
            }
            
            if (row.details_data && row.details_type) {
              const existingDoc = jobMap.get(jobId).documents.find(
                (d: any) => d.details_id === row.details_id
              );
              if (!existingDoc) {
                jobMap.get(jobId).documents.push({
                  details_id: row.details_id,
                  details_type: row.details_type,
                  details_data: row.details_data
                });
              }
            }
          });
        }
        
        this.orders = Array.from(jobMap.values());
        console.log("this.orders partner aggregated ", this.orders);
        this.applyFilters();
      },
      error: (err: any) => {
        console.error('Error fetching job orders', err);
      }
    });
  }

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSegmentChange(segment: string) {
    this.selectedSegment = segment;
    this.currentPage = 1;
    this.applyFilters();
  }

  onCancelSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  isOverdue(order: any): boolean {
    if (!order.job_due_date || order.job_order_status?.toLowerCase() === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(order.job_due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  getTabCount(tab: string): number {
    if (tab === 'All') {
      return this.orders.length;
    }
    return this.orders.filter(order => order.job_order_status?.toLowerCase() === tab.toLowerCase()).length;
  }

  // Sorting methods
  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortValue(order: any, column: string): any {
    switch (column) {
      case 'order_id':
        return order.order_id || 0;
      case 'job_id':
        return order.job_id || 0;
      case 'job_due_date':
        return order.job_due_date ? new Date(order.job_due_date).getTime() : 0;
      case 'customer_id':
        return order.customer_id || 0;
      case 'job_order_status':
        return (order.job_order_status || '').toLowerCase();
      case 'job_priority':
        return order.job_priority || 0;
      default:
        return '';
    }
  }

  // Pagination methods
  updatePaginatedOrders() {
    const total = this.filteredOrders.length;
    const maxPage = Math.ceil(total / this.pageSize) || 1;
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage = page;
      this.updatePaginatedOrders();
    }
  }

  totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.pageSize) || 1;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const pages = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  getShowingStart(): number {
    if (this.filteredOrders.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getShowingEnd(): number {
    const end = this.currentPage * this.pageSize;
    const total = this.filteredOrders.length;
    return end > total ? total : end;
  }

  applyFilters() {
    let temp = [...this.orders];

    // Segment Filter
    if (this.selectedSegment && this.selectedSegment !== 'All') {
      temp = temp.filter(order =>
        order.job_order_status?.toLowerCase() === this.selectedSegment.toLowerCase()
      );
    }

    // Search Filter
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase();
      temp = temp.filter(order =>
        String(order.order_id).toLowerCase().includes(query) ||
        String(order.job_id).toLowerCase().includes(query) ||
        String(order.customer_id).toLowerCase().includes(query) ||
        order.job_order_status?.toLowerCase().includes(query)
      );
    }

    // Sort
    if (this.sortColumn) {
      temp.sort((a, b) => {
        const valA = this.getSortValue(a, this.sortColumn);
        const valB = this.getSortValue(b, this.sortColumn);
        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredOrders = temp;

    // Update pagination
    this.updatePaginatedOrders();
  }

  getStatusLabel(order: any): string {
    if (this.isOverdue(order)) {
      return 'Overdue';
    }
    return order.job_order_status || '';
  }

  getStatusClass(order: any): string {
    if (this.isOverdue(order)) {
      return 'overdue';
    }
    return (order.job_order_status || '').toLowerCase();
  }
}
