import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PartnerService } from '../partner.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-partners-list',
    imports: [CommonModule, FormsModule],
    templateUrl: './partners-list.component.html',
    styleUrl: './partners-list.component.css'
})
export class PartnersListComponent {

  searchQuery: string = '';

  get filteredPartners() {
    if (!this.partnersList) return [];
    if (!this.searchQuery.trim()) return this.partnersList;
    const query = this.searchQuery.toLowerCase().trim();
    return this.partnersList.filter((p: any) => 
      (p.partner_name && p.partner_name.toLowerCase().includes(query)) ||
      (p.partner_contact && p.partner_contact.includes(query)) ||
      (p.partner_category && p.partner_category.toLowerCase().includes(query))
    );
  }


  async deletePartner(partner: any) {
    const confirmDelete = confirm(`Delete ${partner.partner_name}?`);

    if (!confirmDelete) return;

    await this.partnerService.deletePartner(partner.partner_id).subscribe({
      next: () => {
        this.fetchPartners();
      },
      error: (err: any) => {
        console.error('Delete error:', err);
      }
    });
  }


  async editPartner(partner: any) {
    await this.router.navigate(['/partner', partner.partner_id]);
  }
  partnersList: any;

  constructor(private router: Router, private partnerService: PartnerService) {

  }
  ngOnInit() {
    this.fetchPartners();
  }

  addPartner() {
    this.router.navigate(['/add-partner']);
  }

  async fetchPartners() {
    await this.partnerService.getPartners().subscribe({
      next: (res: any) => {
        this.partnersList = res;
      },
      error: (err: any) => {
        console.error('Fetch error:', err);
      }
    });
  }
}
