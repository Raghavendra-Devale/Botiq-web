import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
    return this.http.get<Notification[]>(`${this.baseUrl}/notifications`, {
      withCredentials: true
    });
  }

  acknowledgeNotification(noteId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/notifications/acknowledge/${noteId}`, {}, {
      withCredentials: true
    });
  }

  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(`${this.baseUrl}/notifications/create`, notification, {
      withCredentials: true
    });
  }
}
