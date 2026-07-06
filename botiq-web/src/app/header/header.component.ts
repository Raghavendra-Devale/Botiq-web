import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataService } from '../data.service';
import { AuthService } from '../auth/auth.service';
import { NotificationService, Notification } from '../notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

  userName = '';
  businessName = '';
  data: any;

  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;
  private pollInterval: any;

  constructor(
    private router: Router,
    private http: HttpClient,
    private dataService: DataService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private elementRef: ElementRef
  ) { }

  ngOnInit() {
    this.fetchData();
    this.loadNotifications();
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  fetchData() {
    this.dataService.getBasicData().subscribe((res: any) => {
      this.data = res;
      localStorage.setItem("owner_name", res.owner_name);
      localStorage.setItem("businessName", res.org_name);
      localStorage.setItem("role", res.user_role || '');
      this.userName = localStorage.getItem("owner_name") || '';
      this.businessName = localStorage.getItem("businessName") || '';
      console.log("data from header :", res);
    });
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: (res: Notification[]) => {
        this.notifications = res || [];
        this.unreadCount = this.notifications.filter(n => !n.acknwoledgedAt).length;
      },
      error: (err) => {
        console.error('Error loading notifications', err);
      }
    });
  }

  startPolling() {
    // Poll for new notifications every 60 seconds
    this.pollInterval = setInterval(() => {
      this.loadNotifications();
    }, 60000);
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  acknowledge(note: Notification, event: MouseEvent) {
    event.stopPropagation();
    this.notificationService.acknowledgeNotification(note.noteId).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Error acknowledging notification', err);
      }
    });
  }

  markAllAsRead() {
    const unread = this.notifications.filter(n => !n.acknwoledgedAt);
    if (unread.length === 0) return;

    let completed = 0;
    unread.forEach(note => {
      this.notificationService.acknowledgeNotification(note.noteId).subscribe({
        next: () => {
          completed++;
          if (completed === unread.length) {
            this.loadNotifications();
          }
        },
        error: (err) => {
          console.error('Error acknowledging notification', err);
          completed++;
          if (completed === unread.length) {
            this.loadNotifications();
          }
        }
      });
    });
  }

  getRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const hours = Math.floor(diffMs / 3600000);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showNotifications) {
      const container = this.elementRef.nativeElement.querySelector('.notification-container');
      if (container && !container.contains(event.target)) {
        this.showNotifications = false;
      }
    }
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }
}