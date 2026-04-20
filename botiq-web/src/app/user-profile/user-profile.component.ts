import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../data.service';


interface User {
  businessName: string;
  ownerName: string;
  address: string;
  phoneNumber: string;
  email: string;
  businessLogo: string;
}

interface OptionalSettings {
  partnerEnabled?: boolean;
  stylusEnabled?: boolean;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent {
  onFileSelected(event: any, type: string) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result;

      if (type === 'logo') {
        this.user.businessLogo = base64;
      }
    };
    reader.readAsDataURL(file);
  }


  loading = true;
  loaderMessage = "Loading user profile...";
  isStylusEnabled = false;
  isOrgSectionOpen = false;

  settings: OptionalSettings = {};
  initialData: any = {};

  user: User = {
    businessName: "",
    ownerName: "",
    address: "",
    phoneNumber: "",
    email: "",
    businessLogo: ""
  }

  workCategories: string[] = [];
  jobCategories: string[] = [];

  newWorkCategory = '';
  newJobCategory = '';

  constructor(private router: Router,
    private dataService: DataService
  ) {
  }

  ngOnInit() {
    this.fillData();
  }



  addWorkCategory() {

    if (!this.newWorkCategory.trim()) return;

    const value = this.newWorkCategory.trim();

    if (!value) {
      alert("enter valid category");
      return;
    }

    const normalizedValue = value.toLocaleLowerCase();

    const exists = this.workCategories.some(cat => cat.toLocaleLowerCase() === normalizedValue);

    if (exists) {
      alert("Category already exists");
      return;
    }

    const formattedValue = this.formatCategory(value);

    this.workCategories.push(formattedValue);
    this.newWorkCategory = '';

    console.log("Work:", this.workCategories);
  }

  formatCategory(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  removeWorkCategory(index: number) {
    const removedCategory = this.workCategories[index];
    console.log("Removing:", removedCategory);

    this.workCategories.splice(index, 1);
    console.log("Updated Work Categories:", this.workCategories);

  }



  addJobCategory() {

    const value = this.newJobCategory.trim();

    if (!value) {
      alert("Enter valid category");
      return;
    }

    const normalizedValue = value.toLowerCase();

    const exists = this.jobCategories.some(
      cat => cat.toLowerCase() === normalizedValue
    );

    if (exists) {
      alert("Category already exists");
      return;
    }

    const formattedValue = this.formatCategory(value);

    this.jobCategories.push(formattedValue);
    this.newJobCategory = '';
  }

  removeJobCategory(index: number) {
    const removedCategory = this.jobCategories[index];

    console.log("Removing Job Category:", removedCategory);

    this.jobCategories.splice(index, 1);

    console.log("Updated Job Categories:", this.jobCategories);
  }

  onStylusToggle() {
    const payload = {
      ...this.user,
      optional_settings: {
        stylusEnabled: this.isStylusEnabled
      }
    };

    console.log("Saving:", payload);

    // TODO: call API
  }

  // saveProfile() {
  //   console.log(this.user);
  // }

  // onSaveCategories() {
  //   const payload = {
  //     workCategories: this.workCategories,
  //     jobCategories: this.jobCategories
  //   };

  //   console.log("Saving payload:", payload);

  //   // TODO:
  //   // call API OR SQLite later

  //   alert("Categories saved (for now frontend only)");
  // }


  async onSaveAll() {

    if (!this.user.businessName) {
      alert("Business name required");
      return;
    }

    if (!this.workCategories.length) {
      alert("Add at least one work category");
      return;
    }

    const payload = {
      org_name: this.user.businessName,
      owner_name: this.user.ownerName,
      org_address: this.user.address,
      mobile_number: this.user.phoneNumber,
      email_id: this.user.email,
      org_logo: this.user.businessLogo,

      work_categories: this.workCategories.join(','),
      partner_categories: this.jobCategories.join(','),

      optional_settings: JSON.stringify({
        stylusEnabled: this.isStylusEnabled
      })
    };

    console.log("FINAL SAVE PAYLOAD:", payload);

    this.loading = true;
    this.loaderMessage = "Saving...";

    await this.dataService.saveProfile(payload).subscribe({
      next: (res: any) => {
        console.log("Save success:", res);

        try {
          this.loaderMessage = "Refreshing...";
          this.fillData();
        } catch (err) {
          console.error("Post-save error:", err);
        }
      },
      error: (err: any) => {
        console.error("Save failed:", err);
        alert("Save failed");
      },

    });
  }


  fillData() {
    this.loading = true;

    this.dataService.getBasicData().subscribe({
      next: (res: any) => {
        console.log(res);

        let settings = {};
        try {
          settings = res.optional_settings
            ? JSON.parse(res.optional_settings)
            : {};
        } catch {
          settings = {};
        }

        this.user = {
          businessName: res.org_name || '',
          ownerName: res.owner_name || '',
          address: res.org_address || '',
          phoneNumber: res.mobile_number || '',
          email: res.email_id || '',
          businessLogo: res.org_logo || '',
        };

        try {
          let wCats = res.workCategories || res.work_categories;
          if (Array.isArray(wCats)) {
            this.workCategories = wCats.map((c: any) => c.key_name || c.keyName || c.name || (typeof c === 'string' ? c : '')).filter(c => c);
          } else if (wCats) {
            this.workCategories = wCats.toString().split(',').map((c: string) => c.trim()).filter((c: string) => c);
          } else {
            this.workCategories = [];
          }

          let pCats = res.partnerCategories || res.partner_categories;
          if (Array.isArray(pCats)) {
            this.jobCategories = pCats.map((c: any) => c.partner_category || c.partnerCategory || c.name || (typeof c === 'string' ? c : '')).filter(c => c);
          } else if (pCats) {
            this.jobCategories = pCats.toString().split(',').map((c: string) => c.trim()).filter((c: string) => c);
          } else {
            this.jobCategories = [];
          }
        } catch (catErr) {
          console.error("Error parsing categories:", catErr);
          this.workCategories = [];
          this.jobCategories = [];
        }

        this.isStylusEnabled = (settings as any).stylusEnabled || false;

        console.log("Work:", this.workCategories);
        console.log("Job:", this.jobCategories);
        this.loading = false;
        this.initialData = {
          user: { ...this.user },
          workCategories: [...this.workCategories],
          jobCategories: [...this.jobCategories],
          isStylusEnabled: this.isStylusEnabled
        };

      },
      error: (err: any) => {
        console.log("Error fetching profile:", err);
        this.loading = false;
      }
    });


  }


  hasChanges(): boolean {
    return (
      JSON.stringify(this.user) !== JSON.stringify(this.initialData.user) ||
      JSON.stringify(this.workCategories) !== JSON.stringify(this.initialData.workCategories) ||
      JSON.stringify(this.jobCategories) !== JSON.stringify(this.initialData.jobCategories) ||
      this.isStylusEnabled !== this.initialData.isStylusEnabled
    );
  }

}
