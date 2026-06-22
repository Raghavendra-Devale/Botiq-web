package com.dfive.botiq.configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.InputStream;

@Configuration
public class NotificationFirebaseConfig {

    @Value("classpath:firebase/botiq-notifications-firebase-adminsdk-fbsvc-6bef9f4efc.json")
    private Resource notificationConfigFile;

    @PostConstruct
    public void initializeNotificationFirebase() {
        try (InputStream serviceAccount =
                     notificationConfigFile.getInputStream()) {

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(
                            GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(
                    options,
                    "NOTIFICATION_APP"
            );

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(
                    "Notification Firebase initialization failed",
                    e);
        }
    }
}