import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-update-job-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './update-job-orders.html',
  styleUrl: './update-job-orders.css',
})
export class UpdateJobOrders implements OnInit {
  private router = inject(Router);
  private orderService = inject(OrderService);

  jobOrder: any = null;
  selectedStatus: string = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  measurements: any[] = [];
  materials: any[] = [];
  patterns: any[] = [];
  handwrittenNotes: any[] = [];

  activePreviewImage: string | null = null;

  openImagePreview(imgUrl: string) {
    this.activePreviewImage = imgUrl;
  }

  closeImagePreview() {
    this.activePreviewImage = null;
  }

  ngOnInit() {
    this.jobOrder = history.state?.jobOrder;

    if (!this.jobOrder) {
      console.warn('No job order data found in state, redirecting to dashboard');
      this.router.navigate(['/partner-dashboard']);
      return;
    }

    this.selectedStatus = this.jobOrder.job_order_status || 'Pending';

    this.measurements = [];
    this.materials = [];
    this.patterns = [];
    this.handwrittenNotes = [];

    if (this.jobOrder.documents && Array.isArray(this.jobOrder.documents)) {
      this.jobOrder.documents.forEach((doc: any) => {
        const type = Number(doc.details_type);
        if (type === 1) this.measurements.push(doc);
        else if (type === 2) this.materials.push(doc);
        else if (type === 3) this.patterns.push(doc);
        else if (type === 5) this.handwrittenNotes.push(doc);
      });
    } else if (this.jobOrder.details_data) {
      const fallbackType = Number(this.jobOrder.details_type || 2);
      const doc = {
        details_id: this.jobOrder.details_id || 0,
        details_type: fallbackType,
        details_data: this.jobOrder.details_data
      };
      if (fallbackType === 1) this.measurements.push(doc);
      else if (fallbackType === 2) this.materials.push(doc);
      else if (fallbackType === 3) this.patterns.push(doc);
      else if (fallbackType === 5) this.handwrittenNotes.push(doc);
    }
  }

  goBack() {
    this.router.navigate(['/partner-dashboard']);
  }

  updateStatus() {
    if (!this.jobOrder) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    let parsedDetails = this.jobOrder.job_order_details;
    if (typeof parsedDetails === 'string' && parsedDetails) {
      try {
        parsedDetails = JSON.parse(parsedDetails);
      } catch (e) {
        console.error('Error parsing job_order_details', e);
      }
    }

    let isoDueDate = null;
    if (this.jobOrder.job_due_date) {
      try {
        isoDueDate = new Date(this.jobOrder.job_due_date).toISOString();
      } catch (e) {
        console.error('Error formatting due date', e);
      }
    }

    const payload = {
      jobId: this.jobOrder.job_id,
      orderId: this.jobOrder.order_id,
      customerId: this.jobOrder.customer_id,
      partnerId: this.jobOrder.partner_id,
      jobOrderDetails: parsedDetails,
      jobDueDate: isoDueDate,
      jobPriority: this.jobOrder.job_priority,
      jobOrderStatus: this.selectedStatus
    };

    this.orderService.saveOrUpdateJobOrder(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage = 'Job status updated successfully!';
        this.jobOrder.job_order_status = this.selectedStatus;
        setTimeout(() => {
          this.router.navigate(['/partner-dashboard']);
        }, 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || err.message || 'Failed to update job status.';
        console.error('Error updating job status:', err);
      }
    });
  }

  isOverdue(order: any): boolean {
    if (!order.job_due_date || order.job_order_status?.toLowerCase() === 'completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(order.job_due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  getStatusLabel(order: any): string {
    if (this.isOverdue(order)) {
      return 'Overdue';
    }
    return order.job_order_status || '';
  }

  getStatusClass(order: any): string {
    if (this.isOverdue(order)) {
      return 'overdue';
    }
    return (order.job_order_status || '').toLowerCase();
  }

  getImageUrl(base64: string): string {
    if (!base64) return '';
    if (base64.startsWith('data:image')) {
      return base64;
    }
    return `data:image/png;base64,${base64}`;
  }
}
