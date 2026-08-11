import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../order.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-dashboard-v2',
    imports: [CommonModule, FormsModule],
    templateUrl: './order-list-v2.component.html',
    styleUrl: './order-list-v2.component.css'
})
export class DashboardV2Component implements OnInit, OnDestroy {
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  exportOrders() {
    this.orderService.downloadReport().subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  orders = signal<any[]>([]);

  filteredOrders: any[] = [];
  notes: any[] = [];
  selectedItems: any[] = [];

  selectedSegment: string = 'All';
  searchQuery = signal('');
  tabId: number = 0;
  tabLabel: string = '';
  isSearchBarVisible = true;
  showCustomTab = true;
  isPopoverOpen = false;
  isModalOpen = false;
  selectedImage: string | null = null;

  loading = false;
  hasMore = true;
  limit = 15;
  offset = 0;
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
      this.searchQuery.set(query);
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


  fetchOrders(reset = false) {
    if (reset) {
      this.orders.set([]);
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

    const query = this.searchQuery().trim();
    const searchCriteria = query !== '' ? query : null;

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
        this.orders.set(transformedOrders);

        // If we fetched exactly the limit, there might be more
        this.hasMore = fetchedOrders.length === this.limit;

        this.selectedItems = (this.orders().length > 0) ? this.orders()[0].order_details : [];
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
        const mainIndex = this.orders().findIndex(o => o.order_id === order.order_id);
        if (mainIndex !== -1) {
          this.orders().splice(mainIndex, 1);
        }
        this.selectedOrderIds.delete(order.order_id);
        this.applyFilters();
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSegmentChange(segment: string) {
    this.selectedSegment = segment;
    this.fetchOrders(true);
  }

  onCancelSearch() {
    this.searchQuery.set('');
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

  getMaterialImage(order: any): string | null {
    if (!order) return null;

    const isImage = (val: any): string | null => {
      if (!val || typeof val !== 'string') return null;
      const str = val.trim();
      if (str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://') || str.startsWith('assets/') || str.startsWith('blob:') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(str)) {
        return str;
      }
      return str.length > 15 ? str : null;
    };

    // 1. Direct properties
    for (const key of ['material_image', 'material_url', 'first_material_image', 'image', 'image_url', 'photo', 'photo_url', 'details_data', 'material']) {
      const img = isImage(order[key]);
      if (img) return img;
    }

    // 2. Documents array (details_type 2 = material)
    if (Array.isArray(order.documents) && order.documents.length > 0) {
      const matDoc = order.documents.find((doc: any) => Number(doc.details_type) === 2 || doc.type === 'material' || doc.details_type === 'material');
      if (matDoc) {
        const url = isImage(matDoc.details_data || matDoc.url || matDoc.image_url || matDoc.file_path || matDoc.blobUrl);
        if (url) return url;
      }
      for (const doc of order.documents) {
        const url = isImage(doc.details_data || doc.url || doc.image_url || doc.file_path || doc.blobUrl);
        if (url) return url;
      }
    }

    // 3. Materials array
    if (Array.isArray(order.materials) && order.materials.length > 0) {
      for (const mat of order.materials) {
        if (typeof mat === 'string') {
          const url = isImage(mat);
          if (url) return url;
        } else if (mat && typeof mat === 'object') {
          const url = isImage(mat.url || mat.details_data || mat.blobUrl || mat.image || mat.image_url);
          if (url) return url;
        }
      }
    }

    // 4. Attachments / files / images arrays
    for (const arrKey of ['attachments', 'files', 'images', 'photos']) {
      if (Array.isArray(order[arrKey]) && order[arrKey].length > 0) {
        for (const item of order[arrKey]) {
          const url = isImage(typeof item === 'string' ? item : (item.url || item.details_data || item.image || item.file_path));
          if (url) return url;
        }
      }
    }

    // 5. order_details items
    let details = order.order_details;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch (e) { details = []; }
    }
    if (Array.isArray(details) && details.length > 0) {
      for (const item of details) {
        if (!item || typeof item !== 'object') continue;
        for (const key of ['material_image', 'material_url', 'image', 'image_url', 'photo', 'photo_url', 'url']) {
          const url = isImage(item[key]);
          if (url) return url;
        }
        if (Array.isArray(item.materials) && item.materials.length > 0) {
          for (const mat of item.materials) {
            const url = isImage(typeof mat === 'string' ? mat : (mat.url || mat.details_data || mat.blobUrl || mat.image));
            if (url) return url;
          }
        }
      }
    }

    return null;
  }

  openImagePreview(imageUrl: string, event: Event) {
    event.stopPropagation();
    this.selectedImage = imageUrl;
    this.isModalOpen = true;
  }

  closeImagePreview() {
    this.isModalOpen = false;
    this.selectedImage = null;
  }

  isStatusStepActive(orderStatus: string, step: number): boolean {
    if (!orderStatus) return step <= 1;
    const status = orderStatus.toLowerCase();
    const statusLevels: Record<string, number> = {
      'pending': 1,
      'started': 2,
      'processing': 3,
      'ready': 4,
      'delivered': 5
    };
    const currentLevel = statusLevels[status] || 1;
    return step <= currentLevel;
  }

  getImages(order: any) {
    return this.getMaterialImage(order) || 'assets/images/noimge.jpg';
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
    let temp = [...this.orders()];

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

    return transformed;
  }

  formatOrderDetails(details: any, maxItems: number = 2): string {
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (!Array.isArray(parsed) || parsed.length === 0) return '';
      const items = parsed.map((item: any) => `${item.itemName || item.name || 'Item'} x${item.quantity || 1}`);
      if (items.length <= maxItems) {
        return items.join(', ');
      }
      return items.slice(0, maxItems).join(', ') + ', ...';
    } catch {
      return '';
    }
  }

  formatFullOrderDetails(details: any): string {
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (!Array.isArray(parsed) || parsed.length === 0) return '';
      return parsed.map((item: any) => `${item.itemName || item.name || 'Item'} x${item.quantity || 1}`).join(', ');
    } catch {
      return '';
    }
  }

  getTabCount(tab: string): number {
    if (tab === 'All') {
      return this.orders().length;
    }
    return this.orders().filter((order: any) => order.order_status?.toLowerCase() === tab.toLowerCase()).length;
  }

  getCustomTabCount(): number {
    if (!this.tabId) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let temp = [...this.orders()];
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