package com.dfive.botiq.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        System.out.println("SSE Subscribe: userId = " + userId);
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(userId, emitter);
        
        emitter.onCompletion(() -> {
            System.out.println("SSE Completed for userId = " + userId);
            emitters.remove(userId);
        });
        emitter.onTimeout(() -> {
            System.out.println("SSE Timeout for userId = " + userId);
            emitters.remove(userId);
        });
        emitter.onError((e) -> {
            System.out.println("SSE Error for userId = " + userId + ": " + e.getMessage());
            emitters.remove(userId);
        });

        // Send a dummy initialization event so client connection establishes immediately
        try {
            emitter.send("{\"status\":\"connected\"}");
            System.out.println("SSE INIT sent successfully to userId = " + userId);
        } catch (Exception e) {
            System.err.println("SSE INIT failed for userId = " + userId + ": " + e.getMessage());
            emitters.remove(userId);
        }

        return emitter;
    }

    public void sendToUser(Long userId, Object payload) {
        SseEmitter emitter = emitters.get(userId);
        System.out.println("SSE sendToUser: userId = " + userId + ", emitter present = " + (emitter != null));
        if (emitter != null) {
            try {
                emitter.send(payload);
                System.out.println("SSE sent successfully to userId = " + userId);
            } catch (Exception e) {
                System.err.println("SSE send failed for userId = " + userId + ": " + e.getMessage());
                emitters.remove(userId);
            }
        }
    }

    public void sendToOrg(Integer orgId, Object payload) {
        if (orgId == null) return;
        System.out.println("SSE sendToOrg: orgId = " + orgId + ", payload = " + payload);
        try {
            List<Number> userIds = jdbcTemplate.queryForList(
                "SELECT user_id FROM org_user WHERE org_id = ? AND deleted = FALSE",
                Number.class,
                orgId
            );
            System.out.println("SSE sendToOrg: Found " + userIds.size() + " users in org " + orgId + ": " + userIds);
            for (Number userIdNum : userIds) {
                if (userIdNum != null) {
                    sendToUser(userIdNum.longValue(), payload);
                }
            }
        } catch (Exception e) {
            System.err.println("Error sending SSE to org " + orgId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
