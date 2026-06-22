import { Injectable } from '@angular/core';

import { initializeApp } from 'firebase/app';
import { getMessaging,getToken,onMessage } from 'firebase/messaging';

import {
  notificationFirebaseConfig,
  notificationVapidKey
} from '../src/environments/notification-firebase';

@Injectable({
  providedIn: 'root'
})
export class NotificationMessagingService {

  private app = initializeApp(
    notificationFirebaseConfig,
    'notification-app'
  );

  private messaging = getMessaging(this.app);

  async requestPermission(): Promise<string | null> {

    const permission =
      await Notification.requestPermission();

    if (permission !== 'granted') {
      return null;
    }

    const token = await getToken(
      this.messaging,
      {
        vapidKey: notificationVapidKey,
        serviceWorkerRegistration:
          await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
          )
      }
    );

    return token;
  }

  listen() {

    onMessage(
      this.messaging,
      payload => {

        console.log(
          'Foreground Notification',
          payload
        );

        alert(
          payload.notification?.title +
          '\n' +
          payload.notification?.body
        );
      }
    );
  }
}