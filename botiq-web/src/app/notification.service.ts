import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../environments/environment';

export interface Notification {
  noteId: number;
  orgId: number;
  userId?: number;
  messageType: string;
  messageText: string;
  priority: string;
  createdAt: string;
  expiresAt?: string;
  acknwoledgedAt?: string; 
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    return of([]);
  }

  acknowledgeNotification(noteId: number): Observable<any> {
    return of(null);
  }

  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return of({} as Notification);
  }

  registerPushToken(token: string): Observable<any> {
    return of(null);
  }
}


