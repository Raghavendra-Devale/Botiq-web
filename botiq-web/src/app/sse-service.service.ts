import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SseService {

  private eventSource?: EventSource;

  private messageSubject = new Subject<any>();

  messages$ = this.messageSubject.asObservable();

  connect() {

    if (this.eventSource) {
      return;
    }

    this.eventSource = new EventSource(`${environment.apiUrl}/sse/subscribe`,
      {
        withCredentials: true
      }
    );

    this.eventSource.onopen = () => {console.log('SSE Connected');};

    this.eventSource.onmessage = (event) => {

      console.log('SSE Message', event.data);

      const data = JSON.parse(event.data);

      this.messageSubject.next(data);
    };

    this.eventSource.onerror = (error) => {console.error('SSE Error', error);};
  }

  disconnect() {

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }
}