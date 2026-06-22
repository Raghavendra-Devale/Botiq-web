package com.dfive.botiq.services;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationService {

    public String sendNotification(
            String token,
            String title,
            String body) throws Exception {

        FirebaseApp notificationApp =
                FirebaseApp.getInstance("NOTIFICATION_APP");

        Message message =
                Message.builder()
                        .setToken(token)
                        .setNotification(
                                Notification.builder()
                                        .setTitle(title)
                                        .setBody(body)
                                        .build()
                        )
                        .build();

        return FirebaseMessaging
                .getInstance(notificationApp)
                .send(message);
    }
}