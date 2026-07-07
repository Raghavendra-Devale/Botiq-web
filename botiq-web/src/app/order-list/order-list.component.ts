import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../order.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.css'
})
export class OrderListComponent implements OnInit, OnDestroy {
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  exportOrders() {
    console.log("export orders as csv or pdf");
  }

  orders: any[] = [];
  filteredOrders: any[] = [];
  notes: any[] = [];
  selectedItems: any[] = [];

  selectedSegment: string = 'All';
  searchQuery: string = '';
  tabId: number = 0;
  tabLabel: string = '';
  isSearchBarVisible = true;
  showCustomTab = true;
  isPopoverOpen = false;
  isModalOpen = false;
  selectedImage: string | null = null;

  loading = false;
  hasMore = true;
  limit = 10;
  offset = 0;
  daysLeft: number | null = 5;
  currentPlan: any = { plan_type: 'Free' };
  nextPlan: any = null;
  mobileNumber: any;

  // Pagination & Sorting properties
  currentPage: number = 1;
  pageSize: number = 5;
  sortColumn: string = 'order_id';
  sortDirection: 'asc' | 'desc' = 'desc';
  selectedOrderIds = new Set<number>();
  paginatedOrders: any[] = [];

  readonly tabLabelMap: Record<number, string> = {
    1: 'Orders Due this Week',
    2: 'Orders Overdue',
    3: 'Orders Marked Urgent',
    4: 'Orders Ready',
    5: 'Delivered this Week',
    6: 'New Orders this Week'
  };

  setTabLabel() {
    this.tabLabel = this.tabLabelMap[this.tabId] || '';
  }

  ngOnInit() {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.fetchOrders(true);
    });

    this.route.queryParams.subscribe(params => {
      this.tabId = params['tabId'] ? +params['tabId'] : 0;

      const comingFromDashboard = this.tabId > 0;
      this.selectedSegment = comingFromDashboard ? 'Custom' : 'All';
      this.showCustomTab = comingFromDashboard;
      this.setTabLabel();
      this.fetchOrders(true);
    });
  }
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
  constructor(private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute) {
  }

  goBack() {
    console.log('Navigate to dashboard');
  }

  onBuyNowClick() {
    this.router.navigate(['/plan-page']);
  }
  fetchOrders(reset = false) {
    if (reset) {
      this.orders = [];
      this.paginatedOrders = [];
      this.filteredOrders = [];
      this.selectedItems = [];
      this.selectedOrderIds.clear();
      this.offset = 0;
      this.currentPage = 1;
      this.hasMore = true;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;

    // Map filters for the backend
    let status: string | null = null;
    let tabId: number | null = null;

    if (this.selectedSegment === 'Custom') {
      status = 'Custom';
      tabId = this.tabId > 0 ? this.tabId : null;
    } else if (this.selectedSegment && this.selectedSegment !== 'All') {
      status = this.selectedSegment;
    }

    const searchCriteria = this.searchQuery && this.searchQuery.trim() !== '' ? this.searchQuery : null;

    const payload = {
      limit: this.limit,
      offset: this.offset,
      status: status,
      searchCriteria: searchCriteria,
      tabId: tabId
    };

    this.orderService.getPaginatedOrders(payload).subscribe({
      next: (res: any[]) => {
        const fetchedOrders = res || [];
        
        // Transform the orders when fetched
        const transformedOrders = fetchedOrders.map(order => this.transformOrder(order));
        
        // Always replace orders for the page instead of appending
        this.orders = transformedOrders;

        // If we fetched exactly the limit, there might be more
        this.hasMore = fetchedOrders.length === this.limit;

        this.selectedItems = (this.orders.length > 0) ? this.orders[0].order_details : [];
        console.log(this.selectedItems);

        this.applyFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.log(err);
        this.loading = false;
      }
    });
  }

  onPageChange(page: number) {
    if (page < 1) return;
    this.currentPage = page;
    this.offset = (page - 1) * this.limit;
    this.fetchOrders(false);
  }
  editOrder(order: any) {
    this.router.navigate(['/add-new-order'], { queryParams: { id: order.order_id } });
    console.log('Edit order:', order);
  }

  addNewOrder() {
    this.router.navigate(['/add-new-order']);
  }

  removeOrder(order: any, index: number, event: Event) {
    event.stopPropagation();
    console.log('Delete order:', order, index);
    this.orderService.deleteOrder({ id: order.order_id }).subscribe({
      next: () => {
        const mainIndex = this.orders.findIndex(o => o.order_id === order.order_id);
        if (mainIndex !== -1) {
          this.orders.splice(mainIndex, 1);
        }
        this.selectedOrderIds.delete(order.order_id);
        this.applyFilters();
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }
  onSearchInput(event: any) {
    this.searchSubject.next(event.target.value);
  }

  onSegmentChange(segment: string) {
    this.selectedSegment = segment;
    this.fetchOrders(true);
  }

  onCancelSearch() {
    this.searchQuery = '';
    console.log('Search cleared');
    this.fetchOrders(true);
  }
  dismissNote(id: number) {
    console.log('Dismiss note:', id);
  }

  getNoteClass(note: any) {
    return 'note-default';
  }

  makeCall(phone: string, event: Event) {
    event.stopPropagation();
    console.log('Call:', phone);
  }

  openWhatsApp(name: string, number: string, event: Event) {
    event.stopPropagation();
    console.log('WhatsApp:', name, number);
  }

  getImages(order: any) {
    return 'assets/images/noimge.jpg';
  }

  getStatusClass(order: any, status: string) {
    return '';
  }

  getSegmentButtonClass(status: string) {
    return this.selectedSegment === status ? 'active' : '';
  }

  toggleMenu() {
    this.isPopoverOpen = !this.isPopoverOpen;
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
      case 'order_details':
        return (this.formatOrderDetails(order.order_details) || '').toLowerCase();
      case 'order_amount':
        return Number(order.order_amount) || 0;
      case 'order_status':
        return (order.order_status || '').toLowerCase();
      case 'due_date':
        return order.due_date ? new Date(order.due_date).getTime() : 0;
      default:
        return '';
    }
  }


  getShowingStart(): number {
    return this.filteredOrders.length > 0 ? 1 : 0;
  }

  getShowingEnd(): number {
    return this.filteredOrders.length;
  }

  applyFilters() {
    let temp = [...this.orders];

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
    this.paginatedOrders = temp;
  }
  transformOrder(order: any) {
    // console.log('BEFORE:', order);
    let details = order.order_details;
    if (typeof details === 'string' && details.trim() !== '') {
      try {
        details = JSON.parse(details);
      } catch (e) {
        console.error('Failed to parse order_details JSON string:', details, e);
        details = [];
      }
    } else if (!details) {
      details = [];
    }

    const transformed = {
      ...order,
      order_details: details
    };

    // console.log('AFTER:', transformed);
    return transformed;
  }

  formatOrderDetails(details: any): string {
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return parsed.map((item: any) => `${item.itemName} x${item.quantity}`).join(', ');
    } catch {
      return '';
    }
  }

  getTabCount(tab: string): number {
    if (tab === 'All') {
      return this.orders.length;
    }
    return this.orders.filter(order => order.order_status?.toLowerCase() === tab.toLowerCase()).length;
  }

  getCustomTabCount(): number {
    if (!this.tabId) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let temp = [...this.orders];
    switch (this.tabId) {
      case 1:
        temp = temp.filter(order => {
          if (!order.due_date) return false;
          const due = new Date(order.due_date);
          due.setHours(0, 0, 0, 0);
          const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7 && order.order_status !== 'Delivered';
        });
        break;
      case 2:
        temp = temp.filter(order => {
          if (!order.due_date) return false;
          const due = new Date(order.due_date);
          due.setHours(0, 0, 0, 0);
          return due < today && order.order_status !== 'Delivered';
        });
        break;
      case 3:
        temp = temp.filter(order => order.order_priority === 1);
        break;
      case 4:
        temp = temp.filter(order => order.order_status === 'Ready');
        break;
      case 5:
        temp = temp.filter(order => {
          if (!order.delivered_date) return false;
          const delivered = new Date(order.delivered_date);
          const diff = (today.getTime() - delivered.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7;
        });
        break;
      case 6:
        temp = temp.filter(order => {
          if (!order.order_date) return false;
          const created = new Date(order.order_date);
          const diff = (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7;
        });
        break;
    }
    return temp.length;
  }
}