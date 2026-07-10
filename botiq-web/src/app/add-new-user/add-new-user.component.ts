import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../data.service';

@Component({
    selector: 'app-add-new-user',
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
  searchQuery = '';

  get filteredUsers() {
    if (!this.usersList) return [];
    if (!this.searchQuery.trim()) return this.usersList;
    const query = this.searchQuery.toLowerCase().trim();
    return this.usersList.filter((u: any) =>
      (u.firstname && u.firstname.toLowerCase().includes(query)) ||
      (u.mobilenumber && u.mobilenumber.includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.userrole && u.userrole.toLowerCase().includes(query))
    );
  }

  isEditMode = false;
  editingUserId: number | null = null;

  // Custom Modal State
  showModal = false;
  modalType: 'success' | 'error' | 'warning' | 'info' = 'info';
  modalTitle = '';
  modalMessage = '';
  modalIcon = '';
  modalPrimaryText = '';
  modalCancelText = '';
  showModalCancel = false;
  onPrimaryClick: () => void = () => {};

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

  removeUser(u: any) {
    this.showConfirm(
      'Delete User',
      `Are you sure you want to remove ${u.firstname || 'this user'}?`,
      () => {
        const payload: any = {
          userId: u.userid,
          org_id: this.orgId
        };
        console.log("deleting ", payload.userId);

        this.loading = true;
        this.dataService.removeUser(payload).subscribe({
          next: (res: any) => {
            this.loading = false;
            if (res.success) {
              this.showSuccess(`User "${u.firstname}" has been removed successfully!`, () => {
                this.fetchUsers();
              });
            } else {
              this.showPlanFailure(res.message || 'Failed to remove user.');
            }
          },
          error: (err: any) => {
            this.loading = false;
            this.showPlanFailure(err.error?.message || 'An error occurred while removing the user.');
            console.error('API Error removing user:', err);
          }
        });
      }
    );
  }

  onMobileInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.user.mobileNumber = input.value;
  }

  showSuccess(message: string, callback?: () => void) {
    this.showModal = true;
    this.modalType = 'success';
    this.modalTitle = 'Success';
    this.modalMessage = message;
    this.modalIcon = 'fa-circle-check';
    this.modalPrimaryText = 'OK';
    this.showModalCancel = false;
    this.onPrimaryClick = () => {
      this.closeModal();
      if (callback) callback();
    };
  }

  showWarning(message: string) {
    this.showModal = true;
    this.modalType = 'warning';
    this.modalTitle = 'Validation Alert';
    this.modalMessage = message;
    this.modalIcon = 'fa-triangle-exclamation';
    this.modalPrimaryText = 'OK';
    this.showModalCancel = false;
    this.onPrimaryClick = () => {
      this.closeModal();
    };
  }

  showPlanFailure(message: string) {
    this.showModal = true;
    this.modalType = 'error';
    this.modalTitle = 'Action Required';
    this.modalMessage = message;
    this.modalIcon = 'fa-circle-xmark';
    this.modalPrimaryText = 'Upgrade Plan';
    this.modalCancelText = 'Cancel';
    this.showModalCancel = true;
    this.onPrimaryClick = () => {
      this.closeModal();
      this.router.navigate(['/plan-page']);
    };
  }

  showConfirm(title: string, message: string, onConfirm: () => void) {
    this.showModal = true;
    this.modalType = 'warning';
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalIcon = 'fa-triangle-exclamation';
    this.modalPrimaryText = 'Confirm';
    this.modalCancelText = 'Cancel';
    this.showModalCancel = true;
    this.onPrimaryClick = () => {
      this.closeModal();
      onConfirm();
    };
  }

  closeModal() {
    this.showModal = false;
  }

  onSubmit() {
    const firstName = this.user.firstName ? this.user.firstName.trim() : '';
    const mobileNumber = this.user.mobileNumber ? this.user.mobileNumber.trim() : '';
    const email = this.user.email ? this.user.email.trim() : '';

    if (!firstName || !mobileNumber || !email || !this.user.userType) {
      this.showWarning('Please fill out all required fields.');
      return;
    }

    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      this.showWarning('Please enter a valid 10-digit phone number.');
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
            this.showSuccess(`User "${firstName}" has been updated successfully!`, () => {
              this.user = { firstName: '', mobileNumber: '', email: '', userType: '' };
              this.fetchUsers();
              this.showForm = false;
            });
          } else {
            this.showPlanFailure(res.message || 'Failed to update user.');
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.showPlanFailure(err.error?.message || 'An error occurred while updating the user.');
          console.error('API Error updating user:', err);
        }
      });
    } else {
      console.log("Adding new user with payload:", payload);

      this.dataService.addUser(payload).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) {
            this.showSuccess(`User "${firstName}" has been added successfully!`, () => {
              this.user = { firstName: '', mobileNumber: '', email: '', userType: '' };
              this.fetchUsers();
              this.showForm = false;
            });
          } else {
            this.showPlanFailure(res.message || 'Failed to add user.');
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.showPlanFailure(err.error?.message || 'An error occurred while adding the user.');
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


