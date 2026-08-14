import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { OrderService } from '../services/order.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderestateService } from '../services/orderestate.service';
import { NotificationService } from '../services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { DrawingBoardDialogComponent } from '../shared/drawing-board-dialog/drawing-board-dialog.component';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PartnerService } from '../services/partner.service';

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
  selector: 'new-orders',
  imports: [FormsModule, CommonModule, RouterModule, MatSidenavModule, DragDropModule, MatMenuModule],
  templateUrl: './add-new-orders.html',
  styleUrl: './add-new-orders.css'
})
export class AddNewOrders implements OnInit, OnDestroy {

  // Swipe drawer gesture support (Angular CDK & Touch API)
  touchStartX = 0;
  touchStartY = 0;
  touchEndX = 0;
  touchEndY = 0;

  onTouchStart(event: TouchEvent) {
    if (event.changedTouches && event.changedTouches.length > 0) {
      this.touchStartX = event.changedTouches[0].clientX;
      this.touchStartY = event.changedTouches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (event.changedTouches && event.changedTouches.length > 0) {
      this.touchEndX = event.changedTouches[0].clientX;
      this.touchEndY = event.changedTouches[0].clientY;
      this.handleSwipeGesture();
    }
  }

  handleSwipeGesture() {
    const swipeDistanceX = this.touchEndX - this.touchStartX;
    const swipeDistanceY = Math.abs(this.touchEndY - this.touchStartY);

    // Ignore gesture if primarily vertical scrolling
    if (swipeDistanceY > Math.abs(swipeDistanceX)) {
      return;
    }

    // Swipe left on attachments line to open right drawer
    if (swipeDistanceX < -25 && !this.isRightPanelOpen) {
      this.isRightPanelOpen = true;
      this.cdr.detectChanges();
    }
    // Swipe right on open drawer panel to close right drawer
    else if (swipeDistanceX > 30 && this.isRightPanelOpen) {
      this.isRightPanelOpen = false;
      this.cdr.detectChanges();
    }
  }

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

  isPartnersAvailable: boolean = false;

  // ─── Right Tab Strip (desktop) & Bottom Sheet (tablet ≤1024px) ───────────
  activeRightTab: 'measurements' | 'patterns' | 'materials' | 'draw' | 'voice' = 'measurements';
  isRightPanelOpen = false;
  isBottomSheetOpen = false;

  /** Legacy – kept for any leftover template references */
  isAttachmentsCollapsed = false;

  openRightTab(tab: 'measurements' | 'patterns' | 'materials' | 'draw' | 'voice') {
    if (this.activeRightTab === tab && this.isRightPanelOpen) {
      this.isRightPanelOpen = false;
    } else {
      this.activeRightTab = tab;
      this.isRightPanelOpen = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        const container = document.querySelector('.all-attachments-scroll-body') as HTMLElement;
        const target = document.getElementById(`category-block-${tab}`);
        if (container && target) {
          const targetTop = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
          container.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      }, 120);
    }
  }

  closeRightPanel() {
    this.isRightPanelOpen = false;
  }

  toggleRightPanel() {
    this.isRightPanelOpen = !this.isRightPanelOpen;
  }

  isMobileAttachmentExpanded = false;

  toggleBottomSheet() {
    this.isBottomSheetOpen = !this.isBottomSheetOpen;
  }

  selectMobileAttachmentTab(tab: 'measurements' | 'patterns' | 'materials' | 'draw' | 'voice') {
    if (this.activeRightTab === tab && this.isMobileAttachmentExpanded) {
      this.isMobileAttachmentExpanded = false;
    } else {
      this.activeRightTab = tab;
      this.isMobileAttachmentExpanded = true;
    }
  }

  toggleMobileAttachmentExpanded() {
    this.isMobileAttachmentExpanded = !this.isMobileAttachmentExpanded;
  }

  openBottomTab(tab: 'measurements' | 'patterns' | 'materials' | 'draw' | 'voice') {
    this.selectMobileAttachmentTab(tab);
  }

  toggleAttachmentsCollapse() {
    this.isAttachmentsCollapsed = !this.isAttachmentsCollapsed;
  }

  handwrittenNotes: ImageData[] = [];

  audio: HTMLAudioElement | null = null;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  audioProgress = 0;

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
      price: 0,
      notes: '',
      status: 'Pending'
    });
    this.updateAddJobState();
  }

  deletedOrderDetails: any[] = [];
  deletedDetails: {
    measurements: any[];
    patterns: any[];
    materials: any[];
    handwrittenNotes: any[];
    audio: any[];
  } = {
    measurements: [],
    patterns: [],
    materials: [],
    handwrittenNotes: [],
    audio: []
  };

  removeOrderItem(index: number) {
    const removed = this.orderDetails[index];
    if (removed && (removed.itemId || removed.item_id)) {
      this.deletedOrderDetails.push({
        ...removed,
        deleted: true
      });
    }
    this.orderDetails.splice(index, 1);
    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();
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



  workCategories: any[] = [];
  statusList: any[] = [];


  orderDetails: any[] = [];

  isEditMode = false;
  activeItemIndex: number | null = null;
  editingNotesIndex: number | null = null;
  editingRowIndex: number | null = null;
  showAttachmentsModal: boolean = false;

  expandedSections: { [key: string]: boolean } = {
    measurements: false,
    patterns: false,
    materials: false,
    handwritten: false
  };

  toggleSectionExpand(section: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.expandedSections[section] = !this.expandedSections[section];
  }

  // POS Custom Properties
  searchTerm: string = '';
  customItemName: string = '';
  customItemPrice: number | null = null;
  showCustomGarmentBox: boolean = false;

  toggleCustomGarmentBox() {
    this.showCustomGarmentBox = !this.showCustomGarmentBox;
  }

  get filteredCategories() {
    if (!this.searchTerm.trim()) {
      return this.workCategories;
    }
    const term = this.searchTerm.toLowerCase();
    return this.workCategories.filter(cat => 
      (cat.displayName || '').toLowerCase().includes(term) || 
      (cat.itemName || '').toLowerCase().includes(term)
    );
  }

  selectCategoryFromPos(category: any) {
    category.selected = true;
    const existsIndex = this.orderDetails.findIndex(
      item => item.itemName.trim().toLowerCase() === category.itemName.trim().toLowerCase()
    );
    if (existsIndex === -1) {
      this.orderDetails.push({
        itemName: category.itemName,
        quantity: category.quantity || 1,
        price: category.price || 0,
        notes: '',
        status: 'Pending'
      });
      this.activeItemIndex = this.orderDetails.length - 1;
    } else {
      this.activeItemIndex = existsIndex;
    }
    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();
  }

  incrementCartItem(item: any) {
    item.quantity++;
    const cat = this.workCategories.find(c => c.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase());
    if (cat) {
      cat.quantity = item.quantity;
    }
    this.newOrder.orderAmount = this.calculateTotal();
  }

  decrementCartItem(item: any) {
    if (item.quantity > 1) {
      item.quantity--;
      const cat = this.workCategories.find(c => c.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase());
      if (cat) {
        cat.quantity = item.quantity;
      }
    } else {
      this.removeCartItem(item);
    }
    this.newOrder.orderAmount = this.calculateTotal();
  }

  removeCartItem(item: any) {
    if (item && (item.itemId || item.item_id)) {
      this.deletedOrderDetails.push({
        ...item,
        deleted: true
      });
    }
    const isRemovingActive = this.activeItemIndex !== null && this.orderDetails[this.activeItemIndex] === item;
    
    this.orderDetails = this.orderDetails.filter(i => i !== item);
    const cat = this.workCategories.find(c => c.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase());
    if (cat) {
      cat.selected = false;
      cat.quantity = 1;
    }
    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();

    if (this.orderDetails.length > 0) {
      if (isRemovingActive || this.activeItemIndex! >= this.orderDetails.length) {
        this.activeItemIndex = 0;
      }
    } else {
      this.activeItemIndex = null;
    }
  }

  incrementActiveItem() {
    if (this.activeItemIndex !== null && this.orderDetails[this.activeItemIndex]) {
      this.incrementCartItem(this.orderDetails[this.activeItemIndex]);
    }
  }

  decrementActiveItem() {
    if (this.activeItemIndex !== null && this.orderDetails[this.activeItemIndex]) {
      this.decrementCartItem(this.orderDetails[this.activeItemIndex]);
    }
  }

  setActiveItem(index: number) {
    this.activeItemIndex = index;
  }

  toggleNotes(index: number) {
    this.editingNotesIndex = this.editingNotesIndex === index ? null : index;
  }

  toggleEditRow(index: number) {
    if (this.editingRowIndex === index) {
      this.editingRowIndex = null;
    } else {
      this.editingRowIndex = index;
    }
  }

  setItemStatus(item: any, status: string) {
    item.status = status;
  }



  addCustomItem() {
    if (!this.customItemName.trim()) return;
    const name = this.customItemName.trim();
    const price = this.customItemPrice || 0;
    
    const nameLower = name.toLowerCase();
    const existsIndex = this.orderDetails.findIndex(
      item => item.itemName.trim().toLowerCase() === nameLower
    );
    if (existsIndex !== -1) {
      this.orderDetails[existsIndex].quantity++;
      this.activeItemIndex = existsIndex;
    } else {
      this.orderDetails.push({
        itemName: nameLower,
        quantity: 1,
        price: price,
        notes: '',
        status: 'Pending'
      });
      this.activeItemIndex = this.orderDetails.length - 1;
    }
    
    const cat = this.workCategories.find(c => c.itemName.trim().toLowerCase() === nameLower);
    if (cat) {
      cat.selected = true;
      cat.price = price;
      cat.quantity = this.orderDetails[this.activeItemIndex].quantity;
    }
    
    this.customItemName = '';
    this.customItemPrice = null;
    this.showCustomGarmentBox = false;
    this.newOrder.orderAmount = this.calculateTotal();
    this.updateAddJobState();
  }

  getCartQuantity(itemName: string): number {
    if (!this.orderDetails) return 0;
    const found = this.orderDetails.find(
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
    deliveredDate: new Date().toISOString().split('T')[0]
  };
  orderId: any;

  isDeliveredStatus(): boolean {
    return (this.newOrder?.orderStatus || '').toLowerCase() === 'delivered';
  }

  onStatusChange(status: string) {
    if (this.isDeliveredStatus()) {
      if (!this.newOrder.deliveredDate) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        this.newOrder.deliveredDate = `${yyyy}-${mm}-${dd}`;
      }
    }
  }



  constructor(
    private orderService: OrderService,
    private router: Router,
    private orderState: OrderestateService,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private partnerService: PartnerService

  ) { }

  ngOnInit() {
    this.loadMasterData();

    this.partnerService.getPartners().subscribe({
      next: (res: any) => {
        this.isPartnersAvailable = false;
        if (Array.isArray(res) && res.length > 0) {
          for (let i = 0; i < res.length; i++) {
            if (res[i].enabled == 1 || res[i].enabled === true || res[i].enabled === '1' || res[i].enabled === 'true') {
              this.isPartnersAvailable = true;
              break;
            }
          }
        }
      },
      error: (err: any) => {
        console.error("Failed to fetch partners", err);
        this.isPartnersAvailable = false;
      }
    });
    // Check if we are restoring state from tab2 (JobOrderComponent) back-navigation
    const stateData = history.state?.['orderData'];
    if (stateData) {
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
        }
      });
    }
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
            base64 = await this.compressImage(base64, 0.4, 600);
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
            base64 = await this.compressImage(base64, 0.4, 600);
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
    });
  }


  loadOrder(orderId: number) {
    this.orderService.getOrderById(orderId).subscribe({
      next: (order: any) => {
        this.fillForm(order);
      },
      error: (err: any) => console.log("error loading order ", err)
    });
  }

  fillForm(res: any) {
    this.deletedOrderDetails = [];
    this.deletedDetails = {
      measurements: [],
      patterns: [],
      materials: [],
      handwrittenNotes: [],
      audio: []
    };
    this.newOrder.customerId = res.customer.customerId || res.customer.customer_id;
    this.newOrder.name = res.customer.name || res.customer.customerName;
    this.newOrder.mobile = res.customer.mobile || res.customer.contactNumber;
    this.newOrder.place = res.customer.place || res.customer.customerAddress;
    this.orderId = res.order.order_id !== undefined ? res.order.order_id : res.order.orderId;

    this.newOrder.orderStatus = res.order.order_status !== undefined ? res.order.order_status : res.order.orderStatus;
    this.newOrder.dueDate = (res.order.due_date !== undefined ? res.order.due_date : res.order.dueDate)?.split('T')[0];
    const rawDelivered = res.order.delivered_date !== undefined ? res.order.delivered_date : res.order.deliveredDate;
    if (rawDelivered) {
      this.newOrder.deliveredDate = rawDelivered.split('T')[0];
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.newOrder.deliveredDate = `${yyyy}-${mm}-${dd}`;
    }
    this.newOrder.orderAmount = res.order.order_amount !== undefined ? res.order.order_amount : res.order.orderAmount;
    this.newOrder.advanceAmount = res.order.advance_amount !== undefined ? res.order.advance_amount : res.order.advanceAmount;
    this.newOrder.dueAmount = res.order.due_amount !== undefined ? res.order.due_amount : res.order.dueAmount;

    this.newOrder.urgent = (res.order.order_priority !== undefined ? res.order.order_priority : res.order.orderPriority) === 1;

    this.newOrder.hasJobOrder = !!(res.order.has_job_order !== undefined ? res.order.has_job_order : res.order.hasJobOrder);

    // Support root-level orderDetails (state payload), nested orderDetails (API response), and items array (paginated orders)
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
    this.orderDetails = rawDetails.map((item: any) => {
      const itemId = item.itemId || item.item_id || item.id;
      return {
        itemId: itemId,
        item_id: itemId,
        itemName: (item.itemName || item.item_name || '')
          .trim()
          .toLowerCase(),
        quantity: item.quantity || 1,
        price: item.price || 0,
        notes: item.notes || '',
        status: item.status || item.item_status || item.itemStatus || 'Pending'
      };
    });

    if (this.orderDetails.length > 0) {
      this.activeItemIndex = 0;
    } else {
      this.activeItemIndex = null;
    }

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
  }

  onFileSelected(event: any, type: string) {
    const files = event.target.files;

    for (let file of files) {
      const reader = new FileReader();

      reader.onload = async () => {
        let base64 = reader.result as string;

        if (base64.startsWith('data:image')) {
          try {
            base64 = await this.compressImage(base64, 0.4, 600);
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
    return this.orderDetails
      .map(item => `${item.itemName} (${item.quantity})`)
      .join(', ');
  }

  updateAddJobState() {
    // isAddJobEnabled() is a method that evaluates the enabled state dynamically in the view template.
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
    let targetArray: any[] | null = null;
    if (type === 'measurements') targetArray = this.measurementImages;
    else if (type === 'patterns') targetArray = this.patternImages;
    else if (type === 'materials') targetArray = this.materialImages;
    else if (type === 'handwritten') targetArray = this.handwrittenNotes;

    if (targetArray && targetArray[index]) {
      const removed = targetArray[index];
      const detailsId = removed.details_id || removed.detailsId;
      if (detailsId) {
        const key = (type === 'handwritten' ? 'handwrittenNotes' : type) as keyof typeof this.deletedDetails;
        this.deletedDetails[key].push({
          ...removed,
          details_id: detailsId,
          detailsId: detailsId,
          deleted: true
        });
      }
    }

    if (type === 'measurements') {
      this.measurementImages.splice(index, 1);
      if (this.measurementImages.length === 0 && this.activeGalleryType === 'measurements') {
        this.closeGalleryModal();
      }
    } else if (type === 'patterns') {
      this.patternImages.splice(index, 1);
      if (this.patternImages.length === 0 && this.activeGalleryType === 'patterns') {
        this.closeGalleryModal();
      }
    } else if (type === 'materials') {
      this.materialImages.splice(index, 1);
      if (this.materialImages.length === 0 && this.activeGalleryType === 'materials') {
        this.closeGalleryModal();
      }
    } else if (type === 'handwritten') {
      this.handwrittenNotes.splice(index, 1);
      if (this.handwrittenNotes.length === 0 && this.activeGalleryType === 'handwritten') {
        this.closeGalleryModal();
      }
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
  }



  goToNextPage() {
    if (!this.isAddJobEnabled()) {
      return;
    }
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
        deliveredDate: this.isDeliveredStatus()
          ? this.formatDateOnly(this.newOrder.deliveredDate)
          : null,
        hasJobOrder: this.newOrder.hasJobOrder ? 1 : 0,
        orderPriority: this.newOrder.orderPriority,
      },

      orderDetails: [...this.orderDetails, ...this.deletedOrderDetails],

      details: {
        measurements: [...this.measurementImages, ...this.deletedDetails.measurements],
        patterns: [...this.patternImages, ...this.deletedDetails.patterns],
        materials: [...this.materialImages, ...this.deletedDetails.materials],
        handwrittenNotes: [
          ...this.handwrittenNotes.map(note => {
            const base64Value = note.strokes && note.strokes.length > 0
              ? JSON.stringify({ image: note.base64, strokes: note.strokes })
              : note.base64;
            const detailsId = note.details_id || note.detailsId;
            return {
              ...note,
              base64: base64Value,
              details_id: detailsId,
              detailsId: detailsId
            };
          }),
          ...this.deletedDetails.handwrittenNotes
        ],
        audio: (this.audioBase64 ? [{
          base64: this.audioBase64,
          details_id: this.audioDetailsId,
          detailsId: this.audioDetailsId
        }] : []).concat(this.deletedDetails.audio)
      },

      jobOrders: this.jobOrders
    };
    this.orderState.setOrderData(payload);

    this.router.navigate(['/add-new-order/tab2']);
  }

  isAddJobEnabled(): boolean {
    const hasItems = this.orderDetails && this.orderDetails.some((item: any) => (item.quantity || 0) > 0);
    const hasCustomer = !!(this.newOrder?.name || this.newOrder?.mobile);
    return hasItems && hasCustomer && this.isPartnersAvailable;
  }

  updateQuantity(category: any) {
    const item = this.orderDetails.find(
      i => i.itemName === category.itemName

    );

    if (item) {
      item.quantity = category.quantity;
      item.price = category.price || 0;
    }
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
        orderId: this.orderId,
        orderStatus: this.newOrder.orderStatus || 'pending',
        paymentStatus: this.newOrder.paymentStatus || 0,
        orderDate: this.newOrder.orderDate,
        dueDate: this.newOrder.dueDate,

        orderAmount: this.newOrder.orderAmount,
        advanceAmount: this.newOrder.advanceAmount,
        dueAmount: this.newOrder.dueAmount,

        hasJobOrder: this.newOrder.hasJobOrder ? 1 : 0,
        orderPriority: this.newOrder.orderPriority || 0,

        deliveredDate: this.isDeliveredStatus()
          ? this.newOrder.deliveredDate
          : null
      },

      orderDetails: [...this.orderDetails, ...this.deletedOrderDetails],

      details: {
        measurements: [...this.measurementImages, ...this.deletedDetails.measurements],
        patterns: [...this.patternImages, ...this.deletedDetails.patterns],
        materials: [...this.materialImages, ...this.deletedDetails.materials],
        handwrittenNotes: [
          ...this.handwrittenNotes.map(note => {
            const base64Value = note.strokes && note.strokes.length > 0
              ? JSON.stringify({ image: note.base64, strokes: note.strokes })
              : note.base64;
            const detailsId = note.details_id || note.detailsId;
            return {
              ...note,
              base64: base64Value,
              details_id: detailsId,
              detailsId: detailsId
            };
          }),
          ...this.deletedDetails.handwrittenNotes
        ],
        audio: (this.audioBase64 ? [{
          base64: this.audioBase64,
          details_id: this.audioDetailsId,
          detailsId: this.audioDetailsId
        }] : []).concat(this.deletedDetails.audio)
      }
    };

    if (this.isEditMode) {
      this.orderService.updateOrder(payload).subscribe({
        next: (res: any) => {
          this.notificationService.createNotification({
            messageType: 'INFO',
            messageText: `Order #${this.orderId} updated successfully.`,
            priority: 'LOW'
          }).subscribe();
          this.router.navigate(['/order-list']);
        },
        error: (err: any) => {
          console.error("Update failed:", err);
        }
      });
    } else {
      this.orderService.saveOrder(payload).subscribe({
        next: (res: any) => {
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
  activeGalleryType: 'measurements' | 'patterns' | 'materials' | 'handwritten' | null = null;

  openGalleryModal(type: 'measurements' | 'patterns' | 'materials' | 'handwritten') {
    this.activeGalleryType = type;
  }

  closeGalleryModal() {
    this.activeGalleryType = null;
  }

  getGalleryTitle(): string {
    if (this.activeGalleryType === 'measurements') return 'Measurement Images';
    if (this.activeGalleryType === 'patterns') return 'Pattern Images';
    if (this.activeGalleryType === 'materials') return 'Material Images';
    if (this.activeGalleryType === 'handwritten') return 'Handwritten / Drawn Notes';
    return '';
  }

  getGalleryImages(): ImageData[] {
    if (this.activeGalleryType === 'measurements') return this.measurementImages;
    if (this.activeGalleryType === 'patterns') return this.patternImages;
    if (this.activeGalleryType === 'materials') return this.materialImages;
    if (this.activeGalleryType === 'handwritten') return this.handwrittenNotes;
    return [];
  }

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
    this.isAudioLoading = false;
    this.cdr.detectChanges();

  };

  reader.readAsDataURL(blob);

}

deleteRecording() {

  if (this.audioDetailsId) {
    this.deletedDetails.audio.push({
      details_id: this.audioDetailsId,
      detailsId: this.audioDetailsId,
      deleted: true
    });
  }

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
    finalBase64 = await this.compressImage(finalBase64, 0.4, 600);
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