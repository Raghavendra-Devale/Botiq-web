import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../order.service';
import { PartnerService } from '../partner.service';
import { NotificationService } from '../notification.service';

interface Partner {
  partnerId: null;
  name: string;
  email: string;
  address: string;
  phone: string;
  notes: string;
  partnerCategory: any;
  status: boolean;
}

@Component({
  selector: 'app-add-partner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-partner.component.html',
  styleUrls: ['./add-partner.component.css']
})
export class AddPartnerComponent {

  partner: Partner = this.getEmptyPartner();
  selectCategory: any;

  isEditMode = false;
  partnerId: number | null = null;
  loading = false;

  constructor(public router: Router,
    private orderService: OrderService,
    private route: ActivatedRoute,
    private partnerService: PartnerService,
    private notificationService: NotificationService
  ) {

  }
  async ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');

      if (id) {
        this.isEditMode = true;
        this.partnerId = +id;
      }

      this.getMasterDetails(); // call AFTER setting id
    });
  }
  async onSubmit(form: NgForm) {
    if (form.invalid) return;

    const phone = this.partner.phone.trim();

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    this.loading = true;
    this.partner.name = this.capitalize(this.partner.name.trim());

    const payload = {
      partnerId: this.partner.partnerId || null,
      partnerName: this.partner.name,
      partnerContact: this.partner.phone,
      partnerAddress: this.partner.address,

      partnerCategoryId: this.partner.partnerCategory?.key_id,
      partnerCategory: this.partner.partnerCategory?.key_name,
      notes: this.partner.notes,
      enabled: this.partner.status
    };

    this.orderService.addOrUpdatePartner(payload).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('Saved:', res);
        const action = this.isEditMode ? 'updated' : 'added';
        this.notificationService.createNotification({
          messageType: 'INFO',
          messageText: `Partner "${payload.partnerName}" has been ${action} successfully.`,
          priority: 'LOW'
        }).subscribe();
        this.router.navigate(['/partners-list']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error:', err);
      }
    });

    console.log('Final Payload:', payload);


    form.resetForm(this.getEmptyPartner());
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  async getMasterDetails() {
    await this.orderService.getCategories().subscribe(res => {
      this.selectCategory = res;

      if (this.isEditMode && this.partnerId) {
        this.loadPartnerById(this.partnerId);
      }
    });
  }

  private getEmptyPartner(): Partner {
    return {
      name: '',
      email: '',
      address: '',
      phone: '',
      notes: '',
      status: false,
      partnerCategory: null,
      partnerId: null,
    };
  }


  async loadPartnerById(id: number) {
    await this.partnerService.getPartnerById(id).subscribe((res: any) => {

      this.partner = {
        partnerId: res.partnerId !== undefined ? res.partnerId : res.partner_id,
        name: res.partnerName !== undefined ? res.partnerName : res.partner_name,
        email: '',
        address: res.partnerAddress !== undefined ? res.partnerAddress : res.partner_address,
        phone: res.partnerContact !== undefined ? res.partnerContact : res.partner_contact,
        notes: res.notes,
        status: res.enabled,
        partnerCategory: null
      };

      if (this.selectCategory) {
        const catId = res.partnerCategoryId !== undefined ? res.partnerCategoryId : res.partner_category_id;
        this.partner.partnerCategory = this.selectCategory.find(
          (c: any) => c.key_id == catId
        );
      }

    });
  }
}