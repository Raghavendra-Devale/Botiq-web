import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging,getToken,onMessage } from 'firebase/messaging';
import {notificationFirebaseConfig,notificationVapidKey} from '../environments/notification-firebase';
import { NotificationService } from './notification.service';

@Injectable({providedIn: 'root'})
export class NotificationMessagingService {

  private app = initializeApp(notificationFirebaseConfig,'notification-app');

  private messaging = getMessaging(this.app);

  constructor(private apiService: NotificationService) {}

  async initialize() {
    console.log('Push notifications are disabled');
    return;
  }

  async requestPermission(): Promise<string | null> {
    return null;
  }

  listen() {
    // Disabled
  }

  private showToast(title: string, body: string) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('botiq-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'botiq-toast-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = 'linear-gradient(135deg, #1f2937, #111827)';
    toast.style.color = '#fff';
    toast.style.padding = '16px 20px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    toast.style.fontSize = '14px';
    toast.style.minWidth = '280px';
    toast.style.maxWidth = '360px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    const titleEl = document.createElement('strong');
    titleEl.textContent = title;
    titleEl.style.display = 'block';
    titleEl.style.color = '#38bdf8'; // light blue highlight
    titleEl.style.marginBottom = '6px';
    titleEl.style.fontWeight = '600';
    
    const bodyEl = document.createElement('span');
    bodyEl.textContent = body;
    bodyEl.style.color = '#e5e7eb'; // light grey secondary

    toast.appendChild(titleEl);
    toast.appendChild(bodyEl);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        toast.remove();
        if (container && container.childElementCount === 0) {
          container.remove();
        }
      }, 300);
    }, 4500);
  }
}