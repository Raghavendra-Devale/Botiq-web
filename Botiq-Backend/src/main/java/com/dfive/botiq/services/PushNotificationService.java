package com.dfive.botiq.services;

import com.dfive.botiq.entities.NotificationDevice;
import com.dfive.botiq.repositories.NotificationDeviceRepository;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;

@Service
public class PushNotificationService {

    @Autowired
    private NotificationDeviceRepository notificationDeviceRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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

    public void sendToUser(Long userId, String title, String body) {
        List<NotificationDevice> devices = notificationDeviceRepository.findByUserIdAndActiveTrue(userId);
        FirebaseApp notificationApp = FirebaseApp.getInstance("NOTIFICATION_APP");

        for (NotificationDevice device : devices) {
            try {
                Message message = Message.builder()
                        .setToken(device.getFcmToken())
                        .setNotification(
                                Notification.builder()
                                        .setTitle(title)
                                        .setBody(body)
                                        .build()
                        )
                        .build();

                FirebaseMessaging.getInstance(notificationApp).send(message);
            } catch (FirebaseMessagingException e) {
                // If token is invalid or unregistered, set active = false
                if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED || 
                    e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                    device.setActive(false);
                    device.setUpdatedAt(new Timestamp(System.currentTimeMillis()));
                    notificationDeviceRepository.save(device);
                }
            } catch (Exception e) {
                System.err.println("Failed to send notification to device " + device.getId() + ": " + e.getMessage());
            }
        }
    }

    public void sendToOrg(Long orgId, String title, String body, Long excludeUserId) {
        // Find active device tokens of all users in the organization
        String sql = "SELECT nd.* FROM notification_device nd " +
                     "JOIN org_user ou ON nd.user_id = ou.user_id " +
                     "WHERE ou.org_id = ? AND nd.active = true";
        if (excludeUserId != null) {
            sql += " AND nd.user_id != " + excludeUserId;
        }

        System.out.println("sendToOrg called for orgId: " + orgId + ", title: " + title + ", excludeUserId: " + excludeUserId);
        try {
            List<NotificationDevice> devices = jdbcTemplate.query(
                sql,
                new BeanPropertyRowMapper<>(NotificationDevice.class),
                orgId
            );
            System.out.println("Found " + devices.size() + " registered active devices for orgId: " + orgId);

            FirebaseApp notificationApp = FirebaseApp.getInstance("NOTIFICATION_APP");
            for (NotificationDevice device : devices) {
                try {
                    Message message = Message.builder()
                            .setToken(device.getFcmToken())
                            .setNotification(
                                    Notification.builder()
                                            .setTitle(title)
                                            .setBody(body)
                                            .build()
                            )
                            .build();

                    FirebaseMessaging.getInstance(notificationApp).send(message);
                } catch (FirebaseMessagingException e) {
                    if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED || 
                        e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                        device.setActive(false);
                        device.setUpdatedAt(new Timestamp(System.currentTimeMillis()));
                        notificationDeviceRepository.save(device);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to send notification to device " + device.getId() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to query or send notification to org " + orgId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}