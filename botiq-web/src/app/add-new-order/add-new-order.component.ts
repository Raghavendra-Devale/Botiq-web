import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, signal, computed } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { OrderService } from '../order.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderestateService } from '../orderestate.service';
import { NotificationService } from '../notification.service';
import { MatDialog } from '@angular/material/dialog';
import { DrawingBoardDialogComponent } from '../shared/components/drawing-board-dialog/drawing-board-dialog.component';

interface ImageData {
  base64: string;
  blobUrl: string;
  strokes?: any[];
  temp_id?: number;
  details_id?: number;
  detailsId?: number;
  deleted?: boolean;
}

interface OrderModel {
  customerId: number | null;
  mobile: string;
  name: string;
  place: string;
  dueDate: string | null;
  orderStatus: string | 'pending';
  // orderAmount: number;
  advanceAmount: number;
  // dueAmount: number;
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
    imports: [FormsModule, CommonModule, RouterModule],
    templateUrl: './add-new-order.component.html',
    styleUrl: './add-new-order.component.css'
})
export class AddNewOrderComponent implements OnInit, OnDestroy {

  // Native Mobile Camera trigger references
  @ViewChild('measurementsCamera') measurementsCamera!: ElementRef<HTMLInputElement>;
  @ViewChild('patternsCamera') patternsCamera!: ElementRef<HTMLInputElement>;
  @ViewChild('materialsCamera') materialsCamera!: ElementRef<HTMLInputElement>;

  // WebRTC Device Camera properties
  @ViewChild('cameraVideo') cameraVideo!: ElementRef<HTMLVideoElement>;
  showCameraModal = false;
  cameraType: 'measurements' | 'patterns' | 'materials' | null = null;
  videoStream: MediaStream | null = null;
  capturedImage: string | null = null;
  cameraError: string | null = null;
  videoDevices: MediaDeviceInfo[] = [];
  selectedDeviceId: string | null = null;
  showDeliveredDate = false;
  isOrderLoaded = false;
  isCategoryLoaded = false;
  pending: any;
  jobOrders: any[] = [];
  audioDetailsId: any;
  hasAudio = false;

  handwrittenNotes: ImageData[] = [];

  audio: HTMLAudioElement | null = null;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  audioProgress = 0;


  updateOrder<K extends keyof OrderModel>(
  key: K,
  value: OrderModel[K]
) {
  this.newOrder.update(order => ({
    ...order,
    [key]: value
  }));
}

  calculateRowTotal(item: any): number {
    return (Number(item.price) || 0) * (Number(item.quantity) || 1);
  }

  subtotal = computed(() => {

  return this.orderDetails().reduce((total, item) => {

    return total + this.calculateRowTotal(item);

  }, 0);

});

orderAmount = computed(() => this.subtotal());

dueAmount = computed(() =>
  this.orderAmount() - (this.newOrder().advanceAmount || 0)
);


  // updateItemTotal(item: any) {
  //   // this.updateOrder('orderAmount', this.subtotal());
  // }

  addOrderItem() {
    this.orderDetails.update(items => [...items, {
      itemName: '',
      quantity: 1,
      price: 0
    }]);
    // this.updateAddJobState();
  }

  removeOrderItem(index: number) {
    this.orderDetails.update(items => items.filter((_, i) => i !== index));
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }

  updateCartItemQuantity(index: number, quantity: any) {
    const qty = Number(quantity) || 1;
    this.orderDetails.update(items => {
      const updated = [...items];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantity: qty };
      }
      return updated;
    });
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }

  updateCartItemPrice(index: number, price: any) {
    const prc = Number(price) || 0;
    this.orderDetails.update(items => {
      const updated = [...items];
      if (updated[index]) {
        updated[index] = { ...updated[index], price: prc };
      }
      return updated;
    });
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }


  measurementImages: ImageData[] = [];
  patternImages: ImageData[] = [];
  materialImages: ImageData[] = [];

  mediaRecorder!: MediaRecorder;
  audioChunks: Blob[] = [];

  isRecording = false;

  audioBlob: Blob | null = null;
  audioUrl: string | null = null;
  audioBase64 = '';
  isAudioLoading = false;

  recordingSeconds = 0;
  private timer: any;



  workCategories = signal<any[]>([]);
  statusList: any[] = [];


  orderDetails = signal<any[]>([]);

  isEditMode = false;
  isAddJobEnabled = computed(()=> this.orderDetails().length > 0);

  // POS Custom Properties
  searchTerm = signal('');
  customItemName: string = '';
  customItemPrice: number | null = null;

 filteredCategories = computed(() => {

    const term = this.searchTerm().trim().toLowerCase();

    const categories = this.workCategories();

    if (!term) {
        return categories;
    }

    return categories.filter(cat =>
        (cat.displayName || '').toLowerCase().includes(term) ||
        (cat.itemName || '').toLowerCase().includes(term)
    );

});

  selectCategoryFromPos(category: any) {
    const itemNameLower = category.itemName.trim().toLowerCase();
    const exists = this.orderDetails().find(
      item => item.itemName.trim().toLowerCase() === itemNameLower
    );

    if (!exists) {
      this.orderDetails.update(items => [...items, {
        itemName: category.itemName,
        quantity: category.quantity || 1,
        price: category.price || 0
      }]);
      
      this.workCategories.update(cats => cats.map(c => {
        if (c.itemName.trim().toLowerCase() === itemNameLower) {
          return { ...c, selected: true };
        }
        return c;
      }));
    } else {
      const newQty = exists.quantity + 1;
      this.orderDetails.update(items => items.map(item => {
        if (item.itemName.trim().toLowerCase() === itemNameLower) {
          return { ...item, quantity: newQty };
        }
        return item;
      }));
      
      this.workCategories.update(cats => cats.map(c => {
        if (c.itemName.trim().toLowerCase() === itemNameLower) {
          return { ...c, selected: true, quantity: newQty };
        }
        return c;
      }));
    }
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }

  incrementCartItem(item: any) {
    const itemNameLower = item.itemName.trim().toLowerCase();
    const newQty = item.quantity + 1;
    
    this.orderDetails.update(items => items.map(i => {
      if (i.itemName.trim().toLowerCase() === itemNameLower) {
        return { ...i, quantity: newQty };
      }
      return i;
    }));
    
    this.workCategories.update(cats => cats.map(c => {
      if (c.itemName.trim().toLowerCase() === itemNameLower) {
        return { ...c, quantity: newQty };
      }
      return c;
    }));
    
    // this.updateOrder('orderAmount', this.subtotal());
  }

  decrementCartItem(item: any) {
    const itemNameLower = item.itemName.trim().toLowerCase();
    if (item.quantity > 1) {
      const newQty = item.quantity - 1;
      
      this.orderDetails.update(items => items.map(i => {
        if (i.itemName.trim().toLowerCase() === itemNameLower) {
          return { ...i, quantity: newQty };
        }
        return i;
      }));
      
      this.workCategories.update(cats => cats.map(c => {
        if (c.itemName.trim().toLowerCase() === itemNameLower) {
          return { ...c, quantity: newQty };
        }
        return c;
      }));
    } else {
      this.removeCartItem(item);
    }
    // this.updateOrder('orderAmount', this.subtotal());
  }

  removeCartItem(item: any) {
    const itemNameLower = item.itemName.trim().toLowerCase();
    this.orderDetails.update(items => items.filter(i => i.itemName.trim().toLowerCase() !== itemNameLower));
    
    this.workCategories.update(cats => cats.map(c => {
      if (c.itemName.trim().toLowerCase() === itemNameLower) {
        return { ...c, selected: false, quantity: 1 };
      }
      return c;
    }));
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }

  addCustomItem() {
    if (!this.customItemName.trim()) return;
    const name = this.customItemName.trim();
    const price = this.customItemPrice || 0;
    const nameLower = name.toLowerCase();
    
    const exists = this.orderDetails().find(
      item => item.itemName.trim().toLowerCase() === nameLower
    );
    
    if (exists) {
      const newQty = exists.quantity + 1;
      this.orderDetails.update(items => items.map(i => {
        if (i.itemName.trim().toLowerCase() === nameLower) {
          return { ...i, quantity: newQty };
        }
        return i;
      }));
      
      this.workCategories.update(cats => cats.map(c => {
        if (c.itemName.trim().toLowerCase() === nameLower) {
          return { ...c, selected: true, price: price, quantity: newQty };
        }
        return c;
      }));
    } else {
      this.orderDetails.update(items => [...items, {
        itemName: nameLower,
        quantity: 1,
        price: price
      }]);
      
      this.workCategories.update(cats => cats.map(c => {
        if (c.itemName.trim().toLowerCase() === nameLower) {
          return { ...c, selected: true, price: price, quantity: 1 };
        }
        return c;
      }));
    }
    
    this.customItemName = '';
    this.customItemPrice = null;
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }

  getCartQuantity(itemName: string): number {
    if (!this.orderDetails) return 0;
    const found = this.orderDetails().find(
      item => item.itemName.trim().toLowerCase() === itemName.trim().toLowerCase()
    );
    return found ? found.quantity : 0;
  }

  getCategoryIcon(name: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('shirt')) return 'fa-shirt';
    if (lower.includes('pant') || lower.includes('trouser') || lower.includes('salwar')) return 'fa-scissors';
    if (lower.includes('suit') || lower.includes('coat') || lower.includes('blazer')) return 'fa-user-tie';
    if (lower.includes('blouse') || lower.includes('top')) return 'fa-venus';
    if (lower.includes('dress') || lower.includes('lehenga') || lower.includes('saree') || lower.includes('frock') || lower.includes('kurta')) return 'fa-person-dress';
    if (lower.includes('alter') || lower.includes('repair') || lower.includes('stitch') || lower.includes('fitting')) return 'fa-crop-simple';
    return 'fa-needle';
  }


  newOrder = signal<OrderModel>( {
    customerId: null,
    mobile: '',
    name: '',
    place: '',
    dueDate: null,
    orderStatus: 'pending',
    // orderAmount: 0,
    advanceAmount: 0,
    // dueAmount: 0,
    hasJobOrder: false,
    orderPriority: 0,
    jobOrderDetails: '',
    urgent: false,
    paymentStatus: 0,
    orderDate: new Date().toISOString(),
    deliveredDate: new Date().toISOString()
  });
  orderId: any;



  constructor(
    private orderService: OrderService,
    private router: Router,
    private orderState: OrderestateService,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef

  ) { }

  ngOnInit() {
    this.loadMasterData();

    // Check if we are restoring state from tab2 (JobOrderComponent) back-navigation
    const stateData = history.state?.['orderData'];
    if (stateData) {
      console.log("Restoring saved order data from router state:", stateData);
      this.orderId = stateData.order?.orderId || stateData.order?.order_id;
      if (this.orderId) {
        this.isEditMode = true;
      }
      this.fillForm(stateData);
    } else {
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
  }

  loadMasterData() {
    this.orderService.getCategories().subscribe(res => {
      this.workCategories.set(res.map((item: any) => ({
        itemName: item.key_name?.trim().toLowerCase(),
        displayName: item.key_name,
        quantity: 1,
        price: 0,
        selected: false
      })));

      this.isCategoryLoaded = true;
      this.trySync();
    });
    this.orderService.getStatusList().subscribe(res => {
      this.statusList = res;
      console.log("status list", this.statusList);

    });
  }

  addHandwrittenNote() {

    const dialogRef = this.dialog.open(DrawingBoardDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        height: '700px',
        disableClose: true
    });

    dialogRef.afterClosed().subscribe(async result => {

        if (!result) {
            return;
        }

        let base64 = result.image;
        if (base64.startsWith('data:image')) {
          try {
            console.log(`Original note size: ${this.calculateBase64SizeInKB(base64).toFixed(2)} KB`);
            base64 = await this.compressImage(base64, 0.4, 600);
            console.log(`Compressed note size: ${this.calculateBase64SizeInKB(base64).toFixed(2)} KB`);
          } catch (err) {
            console.error('Failed to compress handwritten note, using original', err);
          }
        }

        const imageData: ImageData = {
          base64,
          blobUrl: this.convertBase64ToBlobUrl(base64),
          strokes: result.strokes,
          temp_id: Date.now()
        };
        this.handwrittenNotes.push(imageData);

        console.log(this.handwrittenNotes);

    });

}

  editHandwrittenNote(note: ImageData, index: number) {
    const dialogRef = this.dialog.open(DrawingBoardDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        height: '700px',
        disableClose: true,
        data: {
          strokes: note.strokes || [],
          image: note.base64
        }
    });

    dialogRef.afterClosed().subscribe(async result => {
        if (!result) {
            return;
        }

        let base64 = result.image;
        if (base64.startsWith('data:image')) {
          try {
            console.log(`Original note size: ${this.calculateBase64SizeInKB(base64).toFixed(2)} KB`);
            base64 = await this.compressImage(base64, 0.4, 600);
            console.log(`Compressed note size: ${this.calculateBase64SizeInKB(base64).toFixed(2)} KB`);
          } catch (err) {
            console.error('Failed to compress handwritten note, using original', err);
          }
        }

        this.handwrittenNotes[index] = {
          ...this.handwrittenNotes[index],
          base64: base64,
          blobUrl: this.convertBase64ToBlobUrl(base64),
          strokes: result.strokes
        };

        console.log("Updated handwritten note at index", index, this.handwrittenNotes[index]);
    });
  }


  loadOrder(orderId: number) {
    this.orderService.getOrderById(orderId).subscribe({
      next: (order: any) => {
        console.log("load order", order);
        this.fillForm(order);
      },
      error: (err: any) => console.log("error loading order ", err)
    });
  }

  fillForm(res: any) {
    this.orderId = res.order.order_id !== undefined ? res.order.order_id : res.order.orderId;

    const updatedOrder: OrderModel = {
      ...this.newOrder(),
      customerId: res.customer.customerId !== undefined ? res.customer.customerId : (res.customer.customer_id !== undefined ? res.customer.customer_id : null),
      name: res.customer.name || res.customer.customerName || '',
      mobile: res.customer.mobile || res.customer.contactNumber || '',
      place: res.customer.place || res.customer.customerAddress || '',
      orderStatus: res.order.order_status !== undefined ? res.order.order_status : (res.order.orderStatus || 'pending'),
      dueDate: (res.order.due_date !== undefined ? res.order.due_date : res.order.dueDate)?.split('T')[0] || null,
      // orderAmount: res.order.order_amount !== undefined ? res.order.order_amount : (res.order.orderAmount || 0),
      advanceAmount: res.order.advance_amount !== undefined ? res.order.advance_amount : (res.order.advanceAmount || 0),
      // dueAmount: res.order.due_amount !== undefined ? res.order.due_amount : (res.order.dueAmount || 0),
      urgent: (res.order.order_priority !== undefined ? res.order.order_priority : res.order.orderPriority) === 1,
      hasJobOrder: !!(res.order.has_job_order !== undefined ? res.order.has_job_order : res.order.hasJobOrder)
    };
    this.newOrder.set(updatedOrder);

    // Support root-level orderDetails (state payload), nested orderDetails (API response), and items array
    let rawDetails = res.orderDetails || res.order?.order_details || res.order?.orderDetails || res.items || [];
    if (typeof rawDetails === 'string' && rawDetails.trim() !== '') {
      try {
        rawDetails = JSON.parse(rawDetails);
      } catch (e) {
        console.error('Failed to parse order_details JSON string:', e);
        rawDetails = [];
      }
    }
    if (!Array.isArray(rawDetails)) {
      rawDetails = [];
    }
    this.orderDetails.set(rawDetails.map((item: any) => {
      const itemId = item.itemId || item.item_id || item.id;
      return {
        itemId: itemId,
        item_id: itemId,
        itemName: (item.itemName || item.item_name || '')
          .trim()
          .toLowerCase(),
        quantity: item.quantity || 1,
        price: item.price || 0
      };
    }));

    // Map attachments properly, preserving base64, details_id, temp_id, and reusing existing blob URLs
    const mapImage = (item: any) => {
      if (typeof item === 'string') {
        return {
          base64: item,
          blobUrl: this.convertBase64ToBlobUrl(item)
        };
      }
      const base64 = item.details_data || item.detailsData || item.base64 || '';
      const blobUrl = item.blobUrl || (base64 ? this.convertBase64ToBlobUrl(base64) : '');
      const detailsId = item.details_id || item.detailsId;
      return {
        base64,
        blobUrl,
        temp_id: item.temp_id || detailsId,
        details_id: detailsId,
        detailsId: detailsId
      };
    };

    const mapHandwrittenNote = (item: any) => {
      if (typeof item === 'string') {
        let base64 = item;
        let strokes: any[] = [];
        if (item.startsWith('{')) {
          try {
            const parsed = JSON.parse(item);
            base64 = parsed.image || '';
            strokes = parsed.strokes || [];
          } catch (e) {
            console.error('Failed to parse legacy JSON handwritten note:', e);
          }
        }
        return {
          base64,
          blobUrl: this.convertBase64ToBlobUrl(base64),
          strokes
        };
      }
      const rawData = item.details_data || item.detailsData || item.base64 || '';
      let base64 = rawData;
      let strokes: any[] = [];
      if (rawData.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawData);
          base64 = parsed.image || '';
          strokes = parsed.strokes || [];
        } catch (e) {
          console.error('Failed to parse JSON handwritten note:', e);
        }
      }
      const blobUrl = item.blobUrl || (base64 ? this.convertBase64ToBlobUrl(base64) : '');
      const detailsId = item.details_id || item.detailsId;
      return {
        base64,
        blobUrl,
        strokes,
        temp_id: item.temp_id || detailsId,
        details_id: detailsId,
        detailsId: detailsId
      };
    };

    this.measurementImages = (res.details?.measurements || []).map(mapImage).filter((img: any) => img.base64);
    this.patternImages = (res.details?.patterns || []).map(mapImage).filter((img: any) => img.base64);
    this.materialImages = (res.details?.materials || []).map(mapImage).filter((img: any) => img.base64);
    this.handwrittenNotes = (res.details?.handwrittenNotes || []).map(mapHandwrittenNote).filter((img: any) => img.base64);

    // Restore audio attachment details
    if (res.details?.audio?.length) {
      const audioObj = res.details.audio[0];
      this.audioDetailsId = audioObj.details_id || audioObj.detailsId;
      this.audioBase64 = audioObj.details_data || audioObj.detailsData || audioObj.base64 || '';
      this.hasAudio = true;
      if (this.audioBase64) {
        this.audioUrl = audioObj.blobUrl || this.convertBase64ToBlobUrl(this.audioBase64);
        this.initAudio();
      }
    } else {
      this.hasAudio = false;
      this.audioUrl = null;
      this.initAudio();
    }

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
    const details = this.orderDetails();
    this.workCategories.update(categories => categories.map(cat => {
      const found = details.find(item =>
        item.itemName?.trim().toLowerCase() === cat.itemName?.trim().toLowerCase()
      );
      if (found) {
        return {
          ...cat,
          selected: true,
          quantity: found.quantity,
          price: found.price || 0
        };
      }
      return cat;
    }));
    console.log("ORDER DETAILS:", this.orderDetails());
    console.log("CATEGORIES:", this.workCategories());
    // this.updateAddJobState();
  }


  onMobileChange(value: string) {
    if (value.length === 10) {
      this.searchByPhoneNumber();
    }
  }

  searchByPhoneNumber() {
    this.orderService.searchCustomerByPhoneNumber(this.newOrder().mobile)
      .subscribe(res => {
        if (res.length > 0) {
          this.newOrder.set({
            ...this.newOrder(),
            customerId: res[0].customer_id,
            name: res[0].name,
            place: res[0].place
          });
        }
      });
    console.log("search ", this.newOrder());
  }

  onFileSelected(event: any, type: string) {
    const files = event.target.files;

    for (let file of files) {
      const reader = new FileReader();

      reader.onload = async () => {
        let base64 = reader.result as string;

        if (base64.startsWith('data:image')) {
          try {
            console.log(`Original image size: ${this.calculateBase64SizeInKB(base64).toFixed(2)} KB`);
            base64 = await this.compressImage(base64, 0.4, 600);
            console.log(`Compressed image size: ${this.calculateBase64SizeInKB(base64).toFixed(2)} KB`);
          } catch (err) {
            console.error('Failed to compress image, using original', err);
          }
        }

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
    return this.orderDetails()
      .map(item => `${item.itemName} (${item.quantity})`)
      .join(', ');
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
    } else if (type === 'handwritten') {
      this.handwrittenNotes.splice(index, 1);
    }
  }

  convertBase64ToBlobUrl(base64: string): string {
    if (!base64) return '';
    try {
      let byteString: string;
      let mimeString = 'image/png'; // default fallback

      if (base64.includes(',')) {
        byteString = atob(base64.split(',')[1]);
        mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
      } else {
        byteString = atob(base64);
      }

      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uintArray = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uintArray[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([uintArray], { type: mimeString });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Error converting base64 to blob url:', e);
      return '';
    }
  }

  toggleCategory(category: any) {
    const itemNameLower = category.itemName.trim().toLowerCase();

    if (category.selected) {
      const exists = this.orderDetails().find(
        item => item.itemName.trim().toLowerCase() === itemNameLower
      );

      if (!exists) {
        this.orderDetails.update(items => [...items, {
          itemName: category.itemName,
          quantity: category.quantity || 1,
          price: category.price || 0
        }]);
      }
    } else {
      this.orderDetails.update(items => items.filter(
        item => item.itemName.trim().toLowerCase() !== itemNameLower
      ));
    }

    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();

    console.log("ORDER DETAILS:", this.orderDetails());
  }



  goToNextPage() {
    console.log("new order ", this.newOrder());
    const orderDate = this.newOrder().orderDate?.split('T')[0];
    const dueDate = this.newOrder().dueDate || null;
    const paymentStatus = Number(this.newOrder().paymentStatus) || 0;
    const hasJobOrder = !!this.newOrder().hasJobOrder;
    const orderPriority = this.newOrder().urgent ? 1 : 0;
    // const dueAmount = this.newOrder().orderAmount - (this.newOrder().advanceAmount || 0);

    this.newOrder.update(order => ({
      ...order,
      orderDate,
      dueDate,
      paymentStatus,
      hasJobOrder,
      orderPriority,
      // dueAmount
    }));

    const payload = {
      customer: {
        customerId: this.newOrder().customerId,
        name: this.newOrder().name,
        mobile: this.newOrder().mobile,
        place: this.newOrder().place
      },

      order: {
        orderId: this.orderId,
        orderStatus: this.newOrder().orderStatus || 'pending',
        paymentStatus: this.newOrder().paymentStatus || 0,
        orderDate: this.newOrder().orderDate,
        dueDate: this.newOrder().dueDate,
        orderAmount: this.orderAmount(),
        advanceAmount: this.newOrder().advanceAmount,
        dueAmount: this.dueAmount(),
        deliveredDate: this.formatDateOnly(this.newOrder().deliveredDate),
        hasJobOrder: this.newOrder().hasJobOrder ? 1 : 0,
        orderPriority: this.newOrder().orderPriority,
      },

      orderDetails: this.orderDetails(),

      details: {
        measurements: this.measurementImages,
        patterns: this.patternImages,
        materials: this.materialImages,
        handwrittenNotes: this.handwrittenNotes.map(note => {
          const base64Value = note.strokes && note.strokes.length > 0
            ? JSON.stringify({ image: note.base64, strokes: note.strokes })
            : note.base64;
          return {
            ...note,
            base64: base64Value
          };
        }),
        audio: this.audioBase64 ? [{
        base64: this.audioBase64
          }
        ] : []
      },

      jobOrders: this.jobOrders
    };
    this.orderState.setOrderData(payload);

    console.log("SAVED TO SERVICE:", payload);

    this.router.navigate(['/add-new-order/tab2']);
  }

  updateQuantity(category: any) {
    const itemNameLower = category.itemName.trim().toLowerCase();
    this.orderDetails.update(items => items.map(i => {
      if (i.itemName.trim().toLowerCase() === itemNameLower) {
        return {
          ...i,
          quantity: category.quantity,
          price: category.price || 0
        };
      }
      return i;
    }));
    // this.updateOrder('orderAmount', this.subtotal());
    // this.updateAddJobState();
  }

  trySync() {
    if (this.isOrderLoaded && this.isCategoryLoaded) {
      this.syncCategoriesWithOrder();
    }
  }



  onSubmit(form: any) {
    if (form.invalid) {
      console.log('Form invalid');
      return;
    }

    

    // const orderAmount = this.subtotal();
    // const dueAmount = orderAmount - (this.newOrder().advanceAmount || 0);
    const orderPriority = this.newOrder().urgent ? 1 : 0;
    const hasJobOrder = !!this.newOrder().hasJobOrder;

    // this.newOrder.update(order => ({
    //   ...order,
    //   dueAmount(),
    //   orderPriority,
    //   hasJobOrder
    // }));
    const payload = {
      customer: {
        customerId: this.newOrder().customerId,
        name: this.newOrder().name,
        mobile: this.newOrder().mobile,
        place: this.newOrder().place
      },

      order: {
        order_id: this.orderId,
        orderStatus: this.newOrder().orderStatus || 'pending',
        paymentStatus: this.newOrder().paymentStatus || 0,
        orderDate: this.newOrder().orderDate,
        dueDate: this.newOrder().dueDate,

        orderAmount: this.orderAmount(),
        advanceAmount: this.newOrder().advanceAmount,
        dueAmount: this.dueAmount(),

        hasJobOrder: this.newOrder().hasJobOrder ? 1 : 0,
        orderPriority: this.newOrder().orderPriority || 0,
        deliveredDate: this.newOrder().orderStatus === 'Delivered'
          ? this.newOrder().deliveredDate
          : null
      },

      orderDetails: this.orderDetails(),


      details: {
        measurements: this.measurementImages,
        patterns: this.patternImages,
        materials: this.materialImages,
        handwrittenNotes: this.handwrittenNotes.map(note => {
          const base64Value = note.strokes && note.strokes.length > 0
            ? JSON.stringify({ image: note.base64, strokes: note.strokes })
            : note.base64;
          return {
            ...note,
            base64: base64Value
          };
        }),
        audio: this.audioBase64? [{base64: this.audioBase64 }]: []
      }
    };

    console.log("FINAL PAYLOAD:", payload);
    console.log("order details ", this.orderDetails());

    if (this.isEditMode) {
      this.orderService.updateOrder(payload).subscribe({
        next: (res: any) => {
          console.log("Order updated:", res);
          // this.notificationService.createNotification({
          //   messageType: 'INFO',
          //   messageText: `Order #${this.orderId} updated successfully.`,
          //   priority: 'LOW'
          // }).subscribe();
          this.router.navigate(['/order-list']);
        },
        error: (err: any) => {
          console.error("Update failed:", err);
        }
      });
    } else {
      this.orderService.saveOrder(payload).subscribe({
        next: (res: any) => {
          console.log("Order saved:", res);
          const newId = res || 'New';
          this.notificationService.createNotification({
            messageType: 'INFO',
            messageText: `New Order #${newId} created successfully!`,
            priority: 'LOW'
          }).subscribe();
          this.router.navigate(['/order-list']);
        },
        error: (err: any) => {
          console.error("Save failed:", err);
        }
      });
    }
  }


  previewImage: string | null = null;
  showAttachmentsModal: boolean = false;

  openPreview(url: string) {
    this.previewImage = url;
  }

  closePreview() {
    this.previewImage = null;
  }

  hasAttachments(): boolean {
    return (this.measurementImages && this.measurementImages.length > 0) ||
           (this.patternImages && this.patternImages.length > 0) ||
           (this.materialImages && this.materialImages.length > 0) ||
           (this.handwrittenNotes && this.handwrittenNotes.length > 0);
  }

  getAttachmentsCount(): number {
    return (this.measurementImages?.length || 0) +
           (this.patternImages?.length || 0) +
           (this.materialImages?.length || 0) +
           (this.handwrittenNotes?.length || 0);
  }

  openAttachmentsModal() {
    this.showAttachmentsModal = true;
  }

  closeAttachmentsModal() {
    this.showAttachmentsModal = false;
  }


  async startRecording() {

  try {

    const stream = await navigator.mediaDevices.getUserMedia({audio: true});

    this.audioChunks = [];

    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.isAudioLoading = true;
      this.cdr.detectChanges();

      this.audioBlob = new Blob(this.audioChunks, {
        type: 'audio/webm'
      });

      this.audioUrl = URL.createObjectURL(this.audioBlob);

      this.initAudio();

      this.convertBlobToBase64(this.audioBlob);

      stream.getTracks().forEach(track => track.stop());
    };

    this.mediaRecorder.start();

    this.isRecording = true;

    this.recordingSeconds = 0;

    this.timer = setInterval(() => {
      this.recordingSeconds++;
      this.cdr.detectChanges();
    }, 1000);

  } catch (err) {
    console.error(err);
    alert("Unable to access microphone.");
  }

}

stopRecording() {

  if (!this.mediaRecorder) {
    return;
  }

  this.mediaRecorder.stop();

  clearInterval(this.timer);

  this.isRecording = false;

}

convertBlobToBase64(blob: Blob) {

  const reader = new FileReader();

  reader.onloadend = () => {

    this.audioBase64 = reader.result as string;

    console.log(this.audioBase64);
    this.isAudioLoading = false;
    this.cdr.detectChanges();

  };

  reader.readAsDataURL(blob);

}

deleteRecording() {

  this.audioBlob = null;

  this.audioUrl = null;

  this.audioBase64 = '';

  this.audioChunks = [];

  this.recordingSeconds = 0;

  this.audioDetailsId = null;

  this.hasAudio = false;

  this.initAudio();
  this.cdr.detectChanges();

}

ngOnDestroy() {
  if (this.audio) {
    this.audio.pause();
    this.audio = null;
  }
  this.stopCameraStream();
}

isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

triggerCamera(type: 'measurements' | 'patterns' | 'materials') {
  if (this.isMobileDevice()) {
    if (type === 'measurements' && this.measurementsCamera) {
      this.measurementsCamera.nativeElement.click();
    } else if (type === 'patterns' && this.patternsCamera) {
      this.patternsCamera.nativeElement.click();
    } else if (type === 'materials' && this.materialsCamera) {
      this.materialsCamera.nativeElement.click();
    }
  } else {
    this.openCamera(type);
  }
}

async openCamera(type: 'measurements' | 'patterns' | 'materials') {
  this.cameraType = type;
  this.showCameraModal = true;
  this.capturedImage = null;
  this.cameraError = null;
  await this.startCamera();
}

async startCamera() {
  this.stopCameraStream();
  try {
    const constraints: MediaStreamConstraints = {
      video: this.selectedDeviceId 
        ? { deviceId: { exact: this.selectedDeviceId } }
        : { facingMode: 'environment' }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoStream = stream;
    
    if (this.cameraVideo && this.cameraVideo.nativeElement) {
      this.cameraVideo.nativeElement.srcObject = stream;
    }

    // Enumerate devices to allow switching cameras
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Select the active device ID if not already selected
    if (!this.selectedDeviceId && this.videoDevices.length > 0) {
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        this.selectedDeviceId = settings.deviceId || null;
      }
    }
  } catch (err: any) {
    console.error('Error accessing camera:', err);
    this.cameraError = 'Could not access camera. Please check permissions.';
  }
}

async switchCamera() {
  if (this.videoDevices.length <= 1) return;
  const currentIndex = this.videoDevices.findIndex(d => d.deviceId === this.selectedDeviceId);
  const nextIndex = (currentIndex + 1) % this.videoDevices.length;
  this.selectedDeviceId = this.videoDevices[nextIndex].deviceId;
  await this.startCamera();
}

capturePhoto() {
  if (!this.cameraVideo || !this.cameraVideo.nativeElement) return;
  const video = this.cameraVideo.nativeElement;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    this.capturedImage = dataUrl;
    this.stopCameraStream();
  }
}

retakePhoto() {
  this.capturedImage = null;
  this.startCamera();
}

async confirmPhoto() {
  if (!this.capturedImage || !this.cameraType) return;
  let finalBase64 = this.capturedImage;

  try {
    console.log(`Original captured photo size: ${this.calculateBase64SizeInKB(finalBase64).toFixed(2)} KB`);
    finalBase64 = await this.compressImage(finalBase64, 0.4, 600);
    console.log(`Compressed captured photo size: ${this.calculateBase64SizeInKB(finalBase64).toFixed(2)} KB`);
  } catch (err) {
    console.error('Failed to compress captured photo, using original', err);
  }

  const imageData: ImageData = {
    base64: finalBase64,
    blobUrl: this.convertBase64ToBlobUrl(finalBase64),
    temp_id: Date.now()
  };

  this.addImageToType(imageData, this.cameraType);
  this.closeCamera();
}

closeCamera() {
  this.stopCameraStream();
  this.showCameraModal = false;
  this.cameraType = null;
  this.capturedImage = null;
  this.cameraError = null;
}

private stopCameraStream() {
  if (this.videoStream) {
    this.videoStream.getTracks().forEach(track => track.stop());
    this.videoStream = null;
  }
  if (this.cameraVideo && this.cameraVideo.nativeElement) {
    this.cameraVideo.nativeElement.srcObject = null;
  }
}

initAudio() {
  if (this.audio) {
    this.audio.pause();
    this.audio = null;
  }
  this.isPlaying = false;
  this.currentTime = 0;
  this.audioProgress = 0;

  if (this.audioUrl) {
    this.audio = new Audio(this.audioUrl);
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio ? this.audio.currentTime : 0;
      this.audioProgress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
      this.cdr.detectChanges();
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio ? this.audio.duration : 0;
      this.cdr.detectChanges();
    });
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentTime = 0;
      this.audioProgress = 0;
      this.cdr.detectChanges();
    });
  }
}

togglePlay() {
  if (!this.audio) {
    this.initAudio();
  }
  if (this.audio) {
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play().then(() => {
        this.isPlaying = true;
      }).catch(err => {
        console.error("Audio playback failed", err);
      });
    }
  }
}

seekAudio(event: MouseEvent) {
  if (!this.audio || !this.duration) return;
  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const width = rect.width;
  const percentage = clickX / width;
  this.audio.currentTime = percentage * this.duration;
}

formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

calculateBase64SizeInKB(base64String: string): number {
  const stringLength = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = (stringLength * 3) / 4;
  return sizeInBytes / 1024; // Convert bytes to kilobytes (KB)
}

calculateBase64SizeInMB(base64String: string): number {
  const sizeInKB = this.calculateBase64SizeInKB(base64String);
  return sizeInKB / 1024; // Convert kilobytes to megabytes (MB)
}

async compressImage(base64Image: string, quality: number = 0.4,targetWidth: number = 600): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const imgElement = new Image();
    imgElement.src = base64Image;

    imgElement.onload = () => {
      try {
        const originalWidth = imgElement.width;
        const originalHeight = imgElement.height;
        const width = originalWidth > targetWidth ? targetWidth : originalWidth;
        const height = (originalHeight / originalWidth) * width;

        // Create a canvas for resizing and compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context'));
          return;
        }

        ctx.drawImage(imgElement, 0, 0, width, height);

        // Convert the canvas to a compressed base64 string
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      } catch (error) {
        console.error('Error during image compression:', error);
        reject(error);
      }
    };

    imgElement.onerror = () => {
      reject(new Error('Error loading image for compression'));
    };
  });
}

}