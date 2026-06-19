package com.dfive.botiq.controllers;

import com.dfive.botiq.entities.BotiqNotification;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.repositories.BotiqNotificationRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/web/notifications")
public class NotificationController {

    @Autowired
    private BotiqNotificationRepository botiqNotificationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UserPrincipal getUserPrincipal() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        throw new org.springframework.security.authentication.BadCredentialsException(
                "User session is invalid or expired");
    }

    private void checkAndGenerateOrderNotifications(Integer orgId, Integer userId) {
        try {
            // 1. Fetch recent notification messages for this org in the last 30 days
            List<String> existingMessages = jdbcTemplate.queryForList(
                    "SELECT message_text FROM botiq_notification_w WHERE org_id = ? AND created_at > NOW() - INTERVAL '30 days'",
                    String.class,
                    orgId
            );
            Set<String> messageSet = new HashSet<>(existingMessages);

            // 2. Fetch overdue orders: due date is in the past, and status is not Delivered, Ready, or Hold
            List<Map<String, Object>> overdueOrders = jdbcTemplate.queryForList(
                    "SELECT order_id, due_date FROM botiq_order_w WHERE org_id = ? AND order_status NOT IN ('Delivered', 'Hold', 'Ready') AND due_date < CURRENT_DATE",
                    orgId
            );

            for (Map<String, Object> order : overdueOrders) {
                Integer orderId = ((Number) order.get("order_id")).intValue();
                Object dueDateObj = order.get("due_date");
                String dueDateStr = dueDateObj != null ? dueDateObj.toString() : "unknown";
                String text = "Order #" + orderId + " is overdue! Due date was " + dueDateStr;

                if (!messageSet.contains(text)) {
                    jdbcTemplate.update(
                            "INSERT INTO botiq_notification_w (org_id, user_id, message_type, message_text, priority, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                            orgId, userId, "WARNING", text, "HIGH"
                    );
                    messageSet.add(text);
                }
            }

            // 3. Fetch orders due this week: due date is within next 7 days, and status is not Delivered, Ready, or Hold
            List<Map<String, Object>> dueThisWeekOrders = jdbcTemplate.queryForList(
                    "SELECT order_id, due_date FROM botiq_order_w WHERE org_id = ? AND order_status NOT IN ('Delivered', 'Hold', 'Ready') AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days'",
                    orgId
            );

            for (Map<String, Object> order : dueThisWeekOrders) {
                Integer orderId = ((Number) order.get("order_id")).intValue();
                Object dueDateObj = order.get("due_date");
                String dueDateStr = dueDateObj != null ? dueDateObj.toString() : "unknown";
                String text = "Order #" + orderId + " is due this week (on " + dueDateStr + ")";

                if (!messageSet.contains(text)) {
                    jdbcTemplate.update(
                            "INSERT INTO botiq_notification_w (org_id, user_id, message_type, message_text, priority, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                            orgId, userId, "INFO", text, "MEDIUM"
                    );
                    messageSet.add(text);
                }
            }
        } catch (Exception e) {
            System.err.println("Error generating order notifications: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            Integer orgId = principal.getOrgId();
            Integer userId = principal.getUserId() != null ? principal.getUserId().intValue() : null;

            // Generate any new order notifications
            checkAndGenerateOrderNotifications(orgId, userId);

            List<BotiqNotification> notifications = botiqNotificationRepository
                    .findActiveNotificationsByOrgAndUser(orgId, userId);

            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error retrieving notifications: " + e.getMessage());
        }
    }

    @PostMapping("/acknowledge/{noteId}")
    public ResponseEntity<?> acknowledgeNotification(@PathVariable Integer noteId, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            Integer orgId = principal.getOrgId();

            Optional<BotiqNotification> notifOpt = botiqNotificationRepository.findById(noteId);
            if (notifOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Notification not found");
            }

            BotiqNotification notif = notifOpt.get();
            if (!notif.getOrgId().equals(orgId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied to notification");
            }

            notif.setAcknwoledgedAt(new Timestamp(System.currentTimeMillis()));
            botiqNotificationRepository.save(notif);

            return ResponseEntity.ok(Map.of("success", true, "message", "Notification acknowledged"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error acknowledging notification: " + e.getMessage());
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createNotification(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            Integer orgId = principal.getOrgId();

            String messageType = (String) payload.get("messageType");
            String messageText = (String) payload.get("messageText");
            String priority = (String) payload.get("priority");

            Integer targetUserId = null;
            if (payload.get("userId") != null) {
                targetUserId = ((Number) payload.get("userId")).intValue();
            }

            Timestamp expiresAt = null;
            if (payload.get("expiresAt") != null) {
                try {
                    String expiresAtStr = (String) payload.get("expiresAt");
                    expiresAt = Timestamp.from(Instant.parse(expiresAtStr));
                } catch (Exception ex) {
                    // Try parsing as numeric milliseconds
                    try {
                        long millis = ((Number) payload.get("expiresAt")).longValue();
                        expiresAt = new Timestamp(millis);
                    } catch (Exception ignored) {}
                }
            }

            BotiqNotification notification = BotiqNotification.builder()
                    .orgId(orgId)
                    .userId(targetUserId)
                    .messageType(messageType != null ? messageType : "INFO")
                    .messageText(messageText)
                    .priority(priority != null ? priority : "LOW")
                    .expiresAt(expiresAt)
                    .build();

            // Set created_at explicitly since insertable = false is configured on DB default column
            // We can also let the DB assign it via default if we execute SQL, but JPA needs it if we want to return it.
            // Let's set it before save
            notification.setCreatedAt(new Timestamp(System.currentTimeMillis()));

            BotiqNotification saved = botiqNotificationRepository.save(notification);

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error creating notification: " + e.getMessage());
        }
    }
}
