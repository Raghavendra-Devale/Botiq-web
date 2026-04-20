import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../order.service';
import { ActivatedRoute, Router } from '@angular/router';
import { retry } from 'rxjs';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.css'
})
export class OrderListComponent {
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
    this.route.queryParams.subscribe(params => {
      this.tabId = params['tabId'] ? +params['tabId'] : 0;

      const comingFromDashboard = this.tabId > 0;
      this.selectedSegment = comingFromDashboard ? 'Custom' : 'All';
      this.showCustomTab = comingFromDashboard;
      this.setTabLabel();
      this.fetchOrders(true);

    });
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
      this.filteredOrders = [];
      this.selectedItems = [];
      this.offset = 0;
    }

    this.orderService.getAllOrders().subscribe({
      next: (res: any) => {
        this.orders = res;
        this.selectedItems = res[0].order_details;
        console.log(this.selectedItems);
        // this.filterOrders(); // filtering based on status
        this.applyFilters(); // filtering based on status and search

      },
      error: (err: any) => {
        console.log(err);
      }
    });
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
        this.orders.splice(index, 1); // remove from UI
        this.filterOrders();
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
    console.log('Search:', this.searchQuery);
    // this.fetchOrders(true); should not fetch data everytime use local data
    // this.filterOrders(); // filtering based on status
    this.applyFilters(); // filtering based on status and search
  }

  onSegmentChange(segment: string) {
    this.selectedSegment = segment;
    // this.filterOrders(); // filtering based on status
    this.applyFilters(); // filtering based on status and search
  }

  onCancelSearch() {
    this.searchQuery = '';
    console.log('Search cleared');
    this.filterOrders();
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



  applyFilters() {
    let temp = [...this.orders];

    // 🔹 Filter by segment (status)
    if (this.selectedSegment && this.selectedSegment !== 'All') {
      temp = temp.filter(order =>
        order.order_status?.toLowerCase() === this.selectedSegment.toLowerCase()
      );
    }

    // 🔹 Filter by search
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase();

      temp = temp.filter(order =>
        order.customer_name?.toLowerCase().includes(query) ||
        order.order_details?.toLowerCase().includes(query)
      );
    }

    console.log("Selected:", this.selectedSegment);
    console.log("Filtered:", temp.length);

    this.filteredOrders = temp;
  }

  filterOrders() {
    let result = [...this.orders];

    if (this.tabId > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (this.tabId) {
        case 1: // Due this week
          result = result.filter(order => {
            const due = new Date(order.due_date);
            due.setHours(0, 0, 0, 0); const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            return (
              due < today && order.order_status !== 'Delivered'
            );
          });
          break;

        case 2: // Overdue
          result = result.filter(order => {
            return new Date(order.due_date) < today;
          });
          break;

        case 3: // Urgent
          result = result.filter(order => order.order_priority === 1);
          break;

        case 4: // Ready
          result = result.filter(order => order.order_status === 'Ready');
          break;

        case 5: // Delivered this week
          result = result.filter(order => {
            if (!order.delivered_date) return false;
            const delivered = new Date(order.delivered_date);
            const diff = (today.getTime() - delivered.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 7;
          });
          break;

        case 6: // New orders this week
          result = result.filter(order => {
            const created = new Date(order.order_date);
            const diff = (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 7;
          });
          break;
      }
    }

    if (this.selectedSegment !== 'All' && this.selectedSegment !== 'Custom') {
      result = result.filter(order =>
        order.order_status === this.selectedSegment
      );
    }


    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();

      result = result.filter(order =>
        order.customer_name?.toLowerCase().includes(query) ||
        order.contact_number?.includes(query)
      );
    }

    // this.orders = result.map(order => this.transformOrder(order));
    this.filteredOrders = result.map(order => this.transformOrder(order));
    this.filteredOrders = [...this.orders];
    console.log(" filtered data  ", this.filteredOrders[0]);
    console.log("api data ", this.orders);



  }


  transformOrder(order: any) {
    console.log('BEFORE:', order);

    const transformed = {
      ...order,
      order_details:
        typeof order.order_details === 'string'
          ? JSON.parse(order.order_details)
          : order.order_details
    };

    console.log('AFTER:', transformed);

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

}