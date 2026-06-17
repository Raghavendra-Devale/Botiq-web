import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { OrderService } from '../order.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderestateService } from '../orderestate.service';

interface ImageData {
  base64: string,
  blobUrl: string,
  temp_id?: number
}

interface OrderModel {
  customerId: number | null;
  mobile: string;
  name: string;
  place: string;
  dueDate: string | null;
  orderStatus: string | 'pending';
  orderAmount: number;
  advanceAmount: number;
  dueAmount: number;
  hasJobOrder: boolean;
  orderPriority: number;
  jobOrderDetails: string;
  urgent: boolean;
  paymentStatus: number;
  orderDate: string;
  deliveredDate: string;
}

@Component({
  selector: 'app-add-new-order',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add-new-order.component.html',
  styleUrl: './add-new-order.component.css'
})
export class AddNewOrderComponent {


  showDeliveredDate = false;
  isOrderLoaded = false;
  isCategoryLoaded = false;
  pending: any;
  jobOrders: any[] = [];

  calculateRowTotal(item: any): number {
    return (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }

  calculateTotal(): number {
    return this.orderDetails.reduce((total, item) => {
      return total + this.calculateRowTotal(item);
    }, 0);
  }

  updateItemTotal(item: any) {
    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();
  }

  addOrderItem() {
    this.orderDetails.push({
      itemName: '',
      quantity: 1,
      price: 0
    });
    this.updateAddJobState();
  }

  removeOrderItem(index: number) {
    this.orderDetails.splice(index, 1);
    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();
  }


  measurementImages: ImageData[] = [];
  patternImages: ImageData[] = [];
  materialImages: ImageData[] = [];


  workCategories: any[] = [];
  statusList: any[] = [];


  orderDetails: any[] = [];

  isEditMode = false;
  isAddJobEnabled = false;


  newOrder: OrderModel = {
    customerId: null,
    mobile: '',
    name: '',
    place: '',
    dueDate: null,
    orderStatus: 'pending',
    orderAmount: 0,
    advanceAmount: 0,
    dueAmount: 0,
    hasJobOrder: false,
    orderPriority: 0,
    jobOrderDetails: '',
    urgent: false,
    paymentStatus: 0,
    orderDate: new Date().toISOString(),
    deliveredDate: new Date().toISOString()
  };
  orderId: any;

  constructor(private orderService: OrderService,
    private router: Router,
    private orderState: OrderestateService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.loadMasterData();

    this.route.queryParams.subscribe(params => {
      this.orderId = +params['id'];

      if (this.orderId) {
        this.isEditMode = true;
        this.loadOrder(this.orderId);
      } else {
        console.log("create new");
      }
    });

  }

  loadMasterData() {
    this.orderService.getCategories().subscribe(res => {
      this.workCategories = res.map((item: any) => ({
        itemName: item.key_name?.trim().toLowerCase(),
        displayName: item.key_name,
        quantity: 1,
        price: 0,
        selected: false
      }));

      this.isCategoryLoaded = true;
      this.trySync();
    });
    this.orderService.getStatusList().subscribe(res => {
      this.statusList = res;
      console.log("status list", this.statusList);

    });
  }


  loadOrder(orderId: number) {
    this.orderService.getOrderById(orderId).subscribe({
      next: (order: any) => {
        console.log("load order ", order);
        this.fillForm(order);
      },
      error: (err: any) => console.log("error loading order ", err)
    });
  }

  fillForm(res: any) {

    this.newOrder.customerId = res.customer.customerId || res.customer.customer_id;
    this.newOrder.name = res.customer.name || res.customer.customerName;
    this.newOrder.mobile = res.customer.mobile || res.customer.contactNumber;
    this.newOrder.place = res.customer.place || res.customer.customerAddress;
    this.orderId = res.order.order_id !== undefined ? res.order.order_id : res.order.orderId;

    this.newOrder.orderStatus = res.order.order_status !== undefined ? res.order.order_status : res.order.orderStatus;
    this.newOrder.dueDate = (res.order.due_date !== undefined ? res.order.due_date : res.order.dueDate)?.split('T')[0];
    this.newOrder.orderAmount = res.order.order_amount !== undefined ? res.order.order_amount : res.order.orderAmount;
    this.newOrder.advanceAmount = res.order.advance_amount !== undefined ? res.order.advance_amount : res.order.advanceAmount;
    this.newOrder.dueAmount = res.order.due_amount !== undefined ? res.order.due_amount : res.order.dueAmount;

    this.newOrder.urgent = (res.order.order_priority !== undefined ? res.order.order_priority : res.order.orderPriority) === 1;

    this.newOrder.hasJobOrder = !!(res.order.has_job_order !== undefined ? res.order.has_job_order : res.order.hasJobOrder);

    this.orderDetails = (res.order.order_details || res.order.orderDetails || []).map((item: any) => ({
      itemName: (item.itemName || item.item_name || '')
        .trim()
        .toLowerCase(),
      quantity: item.quantity || 1,
      price: item.price || 0
    }));

    this.measurementImages = (res.details?.measurements || []).map((item: any) => {
      const base64 = typeof item === 'string' ? item : (item.details_data || item.detailsData || '');
      return {
        base64,
        blobUrl: base64 ? this.convertBase64ToBlobUrl(base64) : ''
      };
    }).filter((img: any) => img.base64);

    this.patternImages = (res.details?.patterns || []).map((item: any) => {
      const base64 = typeof item === 'string' ? item : (item.details_data || item.detailsData || '');
      return {
        base64,
        blobUrl: base64 ? this.convertBase64ToBlobUrl(base64) : ''
      };
    }).filter((img: any) => img.base64);

    this.materialImages = (res.details?.materials || []).map((item: any) => {
      const base64 = typeof item === 'string' ? item : (item.details_data || item.detailsData || '');
      return {
        base64,
        blobUrl: base64 ? this.convertBase64ToBlobUrl(base64) : ''
      };
    }).filter((img: any) => img.base64);

    this.jobOrders = res.jobOrders || [];


    this.isOrderLoaded = true;
    this.trySync();

    console.log('Form filled:', this.newOrder);
  }

  formatDateOnly(date: any): string | null {
    if (!date) return null;

    if (typeof date === 'string' && !date.includes('T')) {
      return date;
    }

    const d = new Date(date);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  syncCategoriesWithOrder() {
    this.workCategories.forEach(cat => {
      const found = this.orderDetails.find(item =>
        item.itemName?.trim().toLowerCase() ===
        cat.itemName?.trim().toLowerCase()
      );

      if (found) {
        cat.selected = true;
        cat.quantity = found.quantity;
        cat.price = found.price || 0;
      }
    });
    console.log("ORDER DETAILS:", this.orderDetails);
    console.log("CATEGORIES:", this.workCategories);
    this.updateAddJobState();
  }


  onMobileChange(value: string) {
    if (value.length === 10) {
      this.searchByPhoneNumber();
    }
  }

  searchByPhoneNumber() {
    this.orderService.searchCustomerByPhoneNumber(this.newOrder.mobile)
      .subscribe(res => {
        if (res.length > 0) {
          this.newOrder = {
            ...this.newOrder,
            customerId: res[0].customer_id,
            name: res[0].name,
            place: res[0].place
          };
        }
      });
    console.log("search ", this.newOrder);
  }

  onFileSelected(event: any, type: string) {
    const files = event.target.files;

    for (let file of files) {
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result as string;

        const imageData: ImageData = {
          base64,
          blobUrl: this.convertBase64ToBlobUrl(base64),
          temp_id: Date.now()
        };

        this.addImageToType(imageData, type);
      };

      reader.readAsDataURL(file);
    }
  }
  showItemsPanel = false;

  toggleItemsPanel() {
    this.showItemsPanel = !this.showItemsPanel;
  }

  getOrderSummary() {
    return this.orderDetails
      .map(item => `${item.itemName} (${item.quantity})`)
      .join(', ');
  }

  updateAddJobState() {
    this.isAddJobEnabled = this.orderDetails && this.orderDetails.length > 0;
  }

  increment(category: any) {
    category.quantity++;
    this.updateQuantity(category);
  }

  decrement(category: any) {
    if (category.quantity > 1) {
      category.quantity--;
      this.updateQuantity(category);
    }
  }


  addImageToType(image: ImageData, type: string) {
    if (type === 'measurements') {
      this.measurementImages.push(image);
    } else if (type === 'patterns') {
      this.patternImages.push(image);
    } else if (type === 'materials') {
      this.materialImages.push(image);
    }
  }

  removeImage(type: string, index: number) {
    if (type === 'measurements') {
      this.measurementImages.splice(index, 1);
    } else if (type === 'patterns') {
      this.patternImages.splice(index, 1);
    } else if (type === 'materials') {
      this.materialImages.splice(index, 1);
    }
  }

  convertBase64ToBlobUrl(base64: string): string {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];

    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uintArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      uintArray[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([uintArray], { type: mimeString });
    return URL.createObjectURL(blob);
  }

  toggleCategory(category: any) {

    if (category.selected) {

      const exists = this.orderDetails.find(
        item => item.itemName === category.itemName
      );

      if (!exists) {
        this.orderDetails.push({
          itemName: category.itemName,
          quantity: category.quantity || 1,
          price: category.price || 0
        });
      }

    } else {
      this.orderDetails = this.orderDetails.filter(
        item => item.itemName !== category.itemName
      );
    }

    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();


    console.log("ORDER DETAILS:", this.orderDetails);
  }



  goToNextPage() {
    console.log("new order ", this.newOrder);
    this.newOrder.orderDate = this.newOrder.orderDate?.split('T')[0];
    this.newOrder.dueDate = this.newOrder.dueDate || null;
    this.newOrder.paymentStatus = Number(this.newOrder.paymentStatus) || 0;
    this.newOrder.hasJobOrder = !!this.newOrder.hasJobOrder;
    this.newOrder.orderPriority = this.newOrder.urgent ? 1 : 0;
    this.newOrder.dueAmount = this.newOrder.orderAmount - (this.newOrder.advanceAmount || 0);

    const payload = {
      customer: {
        customerId: this.newOrder.customerId,
        name: this.newOrder.name,
        mobile: this.newOrder.mobile,
        place: this.newOrder.place
      },

      order: {
        orderId: this.orderId,
        orderStatus: this.newOrder.orderStatus || 'pending',
        paymentStatus: this.newOrder.paymentStatus || 0,
        orderDate: this.newOrder.orderDate,
        dueDate: this.newOrder.dueDate,

        orderAmount: this.newOrder.orderAmount,
        advanceAmount: this.newOrder.advanceAmount,
        dueAmount: this.newOrder.dueAmount,
        deliveredDate: this.formatDateOnly(this.newOrder.deliveredDate),
        hasJobOrder: this.newOrder.hasJobOrder ? 1 : 0,
        orderPriority: this.newOrder.orderPriority,
      },

      orderDetails: this.orderDetails,

      details: {
        measurements: this.measurementImages,
        patterns: this.patternImages,
        materials: this.materialImages
      },

      jobOrders: this.jobOrders
    };
    this.orderState.setOrderData(payload);

    console.log("SAVED TO SERVICE:", payload);

    this.router.navigate(['/add-new-order/tab2']);
  }

  updateQuantity(category: any) {
    const item = this.orderDetails.find(
      i => i.itemName === category.itemName

    );

    if (item) {
      item.quantity = category.quantity;
      item.price = category.price || 0;
      console.log("item", item);

    }
  }

  trySync() {
    if (this.isEditMode && this.isOrderLoaded && this.isCategoryLoaded) {
      this.syncCategoriesWithOrder();
    }
  }



  onSubmit(form: any) {
    if (form.invalid) {
      console.log('Form invalid');
      return;
    }

    this.newOrder.orderAmount = this.calculateTotal();
    this.newOrder.dueAmount = this.newOrder.orderAmount - (this.newOrder.advanceAmount || 0);
    this.newOrder.orderPriority = this.newOrder.urgent ? 1 : 0;
    this.newOrder.hasJobOrder = !!this.newOrder.hasJobOrder;
    const payload = {
      customer: {
        customerId: this.newOrder.customerId,
        name: this.newOrder.name,
        mobile: this.newOrder.mobile,
        place: this.newOrder.place
      },

      order: {
        order_id: this.orderId,
        orderStatus: this.newOrder.orderStatus || 'pending',
        paymentStatus: this.newOrder.paymentStatus || 0,
        orderDate: this.newOrder.orderDate,
        dueDate: this.newOrder.dueDate,

        orderAmount: this.newOrder.orderAmount,
        advanceAmount: this.newOrder.advanceAmount,
        dueAmount: this.newOrder.dueAmount,

        hasJobOrder: this.newOrder.hasJobOrder ? 1 : 0,
        orderPriority: this.newOrder.orderPriority || 0,
        deliveredDate: this.newOrder.orderStatus === 'Delivered'
          ? this.newOrder.deliveredDate
          : null
      },

      orderDetails: this.orderDetails,


      details: {
        measurements: this.measurementImages,
        patterns: this.patternImages,
        materials: this.materialImages
      }
    };

    console.log("FINAL PAYLOAD:", payload);
    console.log("order details ", this.orderDetails);

    if (this.isEditMode) {
      this.orderService.updateOrder(payload).subscribe({
        next: (res: any) => {
          console.log("Order updated:", res);
          this.router.navigate(['/dashboard']);
        },
        error: (err: any) => {
          console.error("Update failed:", err);
        }
      });
    } else {
      this.orderService.saveOrder(payload).subscribe({
        next: (res: any) => {
          console.log("Order saved:", res);
          this.router.navigate(['/dashboard']);
        },
        error: (err: any) => {
          console.error("Save failed:", err);
        }
      });
    }
  }


  previewImage: string | null = null;

  openPreview(url: string) {
    this.previewImage = url;
  }

  closePreview() {
    this.previewImage = null;
  }
}