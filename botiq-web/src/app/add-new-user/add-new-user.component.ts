import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../data.service';

@Component({
  selector: 'app-add-new-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-new-user.component.html',
  styleUrl: './add-new-user.component.css'
})
export class AddNewUserComponent implements OnInit {

  user = {
    firstName: '',
    mobileNumber: '',
    email: '',
    userType: ''
  };

  orgId: any = null;
  orgName: any = '';
  loading = false;
  showForm = false;
  usersList: any[] = [];

  isEditMode = false;
  editingUserId: number | null = null;

  constructor(
    public router: Router,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.dataService.getBasicData().subscribe({
      next: (res: any) => {
        this.orgId = res.org_id;
        this.orgName = res.org_name;
        console.log("Loaded organization details for user creation:", res);
      },
      error: (err) => {
        console.error("Error fetching user organization details", err);
      }
    });

    this.fetchUsers();
  }

  fetchUsers() {
    this.dataService.getUsers().subscribe({
      next: (res: any) => {
        this.usersList = res;
        console.log("Fetched users list:", res);
      },
      error: (err) => {
        console.error("Error fetching users list:", err);
      }
    });
  }

  addNewUser() {
    this.user = {
      firstName: '',
      mobileNumber: '',
      email: '',
      userType: ''
    };
    this.isEditMode = false;
    this.editingUserId = null;
    this.showForm = true;
  }

  editUser(u: any) {
    this.isEditMode = true;
    this.editingUserId = u.userid;
    this.user = {
      firstName: u.firstname || '',
      mobileNumber: u.mobilenumber || '',
      email: u.email || '',
      userType: u.userrole === 'ADMIN' ? '2' : '1'
    };
    this.showForm = true;
  }

  onMobileInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.user.mobileNumber = input.value;
  }

  onSubmit() {
    const firstName = this.user.firstName ? this.user.firstName.trim() : '';
    const mobileNumber = this.user.mobileNumber ? this.user.mobileNumber.trim() : '';
    const email = this.user.email ? this.user.email.trim() : '';

    if (!firstName || !mobileNumber || !email || !this.user.userType) {
      alert('Please fill out all required fields.');
      return;
    }

    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    this.loading = true;

    const payload: any = {
      username: firstName,
      phone_number: mobileNumber,
      email: email,
      org_name: this.orgName,
      org_id: this.orgId,
      user_role: this.user.userType === '2' ? 'ADMIN' : 'APP_USER'
    };

    if (this.isEditMode) {
      payload.userId = this.editingUserId;

      console.log("Updating user with payload:", payload);

      this.dataService.editUser(payload).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) {
            alert(`User "${firstName}" has been updated successfully!`);
            this.user = { firstName: '', mobileNumber: '', email: '', userType: '' };
            this.fetchUsers();
            this.showForm = false;
          } else {
            alert(res.message || 'Failed to update user.');
          }
        },
        error: (err: any) => {
          this.loading = false;
          alert(err.error?.message || 'An error occurred while updating the user.');
          console.error('API Error updating user:', err);
        }
      });
    } else {
      console.log("Adding new user with payload:", payload);

      this.dataService.addUser(payload).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) {
            alert(`User "${firstName}" has been added successfully!`);
            this.user = { firstName: '', mobileNumber: '', email: '', userType: '' };
            this.fetchUsers();
            this.showForm = false;
          } else {
            alert(res.message || 'Failed to add user.');
          }
        },
        error: (err: any) => {
          this.loading = false;
          alert(err.error?.message || 'An error occurred while adding the user.');
          console.error('API Error adding user:', err);
        }
      });
    }
  }

  onCancel() {
    if (this.showForm) {
      this.showForm = false;
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}


