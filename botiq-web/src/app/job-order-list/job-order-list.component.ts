import { Component } from '@angular/core';
import { OrderService } from '../order.service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-job-order-list',
    imports: [CommonModule, FormsModule],
    templateUrl: './job-order-list.component.html',
    styleUrl: './job-order-list.component.css'
})
export class JobOrderListComponent {
  orders: any[] = [];
  filteredOrders: any[] = [];
  selectedSegment: string = 'All';
  searchQuery: string = '';
  tabId: number = 0;
  showCustomTab = false;
  tabLabel = '';

  // Pagination & Sorting properties
  currentPage: number = 1;
  pageSize: number = 5;
  sortColumn: string = 'order_id';
  sortDirection: 'asc' | 'desc' = 'desc';
  selectedOrderIds = new Set<number>();
  paginatedOrders: any[] = [];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.tabId = params['tabId'] ? +params['tabId'] : 0;
      const comingFromDashboard = this.tabId > 0;
      this.selectedSegment = comingFromDashboard ? 'Custom' : 'All';
      this.showCustomTab = comingFromDashboard;
      if (this.tabId === 1) this.tabLabel = 'Due this Week';
      if (this.tabId === 2) this.tabLabel = 'Overdue';
      if (this.tabId === 3) this.tabLabel = 'Urgent';
      this.fetchJobOrders(true);
    });
  }

  constructor(
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  editOrder(order: any) {
    this.router.navigate(['/add-new-order'], {
      queryParams: { id: order.order_id }
    });
  }

  fetchJobOrders(reset = false) {
    if (reset) {
      this.orders = [];
      this.filteredOrders = [];
      this.selectedOrderIds.clear();
      this.currentPage = 1;
    }
    this.orderService.getJobOrders().subscribe({
      next: (res: any) => {
        this.orders = res || [];
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

  getCustomTabCount(): number {
    if (!this.tabId) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let temp = [...this.orders];
    switch (this.tabId) {
      case 1: // Due this week
        temp = temp.filter(order => {
          if (!order.job_due_date) return false;
          const due = new Date(order.job_due_date);
          due.setHours(0, 0, 0, 0);
          const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7 && order.job_order_status?.toLowerCase() !== 'completed';
        });
        break;
      case 2: // Overdue
        temp = temp.filter(order => {
          if (!order.job_due_date) return false;
          const due = new Date(order.job_due_date);
          due.setHours(0, 0, 0, 0);
          return due < today && order.job_order_status?.toLowerCase() !== 'completed';
        });
        break;
      case 3: // Urgent
        temp = temp.filter(order => order.job_priority === 1 || order.order_priority === 1);
        break;
    }
    return temp.length;
  }

  // Checkbox selection methods
  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.paginatedOrders.forEach(order => this.selectedOrderIds.add(order.order_id));
    } else {
      this.paginatedOrders.forEach(order => this.selectedOrderIds.delete(order.order_id));
    }
  }

  toggleSelectOrder(orderId: number, event: Event) {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedOrderIds.add(orderId);
    } else {
      this.selectedOrderIds.delete(orderId);
    }
  }

  isAllSelected(): boolean {
    if (this.paginatedOrders.length === 0) return false;
    return this.paginatedOrders.every(order => this.selectedOrderIds.has(order.order_id));
  }

  isOrderSelected(orderId: number): boolean {
    return this.selectedOrderIds.has(orderId);
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
      case 'customer_name':
        return (order.customer_name || '').toLowerCase();
      case 'partner_name':
        return (order.partner_name || '').toLowerCase();
      case 'job_due_date':
        return order.job_due_date ? new Date(order.job_due_date).getTime() : 0;
      case 'job_order_status':
        return (order.job_order_status || '').toLowerCase();
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
    if (this.selectedSegment === 'Custom' && this.tabId > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      switch (this.tabId) {
        case 1: // Due this week
          temp = temp.filter(order => {
            if (!order.job_due_date) return false;
            const due = new Date(order.job_due_date);
            due.setHours(0, 0, 0, 0);
            const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 7 && order.job_order_status?.toLowerCase() !== 'completed';
          });
          break;
        case 2: // Overdue
          temp = temp.filter(order => {
            if (!order.job_due_date) return false;
            const due = new Date(order.job_due_date);
            due.setHours(0, 0, 0, 0);
            return due < today && order.job_order_status?.toLowerCase() !== 'completed';
          });
          break;
        case 3: // Urgent
          temp = temp.filter(order => order.job_priority === 1 || order.order_priority === 1);
          break;
      }
    } else if (this.selectedSegment && this.selectedSegment !== 'All') {
      temp = temp.filter(order =>
        order.job_order_status?.toLowerCase() === this.selectedSegment.toLowerCase()
      );
    }

    // Search Filter
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase();
      temp = temp.filter(order =>
        order.customer_name?.toLowerCase().includes(query) ||
        order.partner_name?.toLowerCase().includes(query) ||
        (order.contact_number && order.contact_number.includes(query)) ||
        (order.partner_contact && order.partner_contact.includes(query))
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


