package com.dfive.botiq.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.dfive.botiq.repositories.LoginLogRepository;
import com.dfive.botiq.util.FirebaseUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@RestController
@RequestMapping("/public")
public class SyncController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JavaMailSender mailSender;

    @PostMapping("/syncData")
    public ResponseEntity<?> syncData(
            @RequestBody String jsonPayload,
            HttpServletRequest httpRequest) {

        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            Integer orgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    uid);

            if (orgId == null) {
                return ResponseEntity.status(403).body("User does not belong to any organization.");
            }

            JsonNode payloadNode = objectMapper.readTree(jsonPayload);
            String clientDeviceId = payloadNode.has("device_id") ? payloadNode.get("device_id").asText() : null;

            if (clientDeviceId == null || clientDeviceId.isEmpty()) {
                return ResponseEntity.status(400).body("Missing or invalid device_id.");
            }

            // Fetch the stored device_id from the DB
            String dbDeviceId = jdbcTemplate.queryForObject(
                    "SELECT device_id FROM org_user WHERE firebase_id = ?",
                    String.class,
                    uid);

            if (!clientDeviceId.equals(dbDeviceId)) {
                ObjectNode response = objectMapper.createObjectNode();
                response.put("status", 3);
                response.put("message", "User has changed phone. Cannot continue on this device.");
                return ResponseEntity.status(403).body(response);
            }

            String sql = "SELECT sync_all_tables(CAST(? AS jsonb), ?)::text";

            String jsonResult = jdbcTemplate.queryForObject(
                    sql,
                    String.class,
                    jsonPayload,
                    uid);

            JsonNode result = objectMapper.readTree(jsonResult);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error syncing: " + e.getMessage());
        }
    }

    // @PostMapping("/syncData")
    // public ResponseEntity<?> syncData(
    // @RequestBody String jsonPayload,
    // HttpServletRequest httpRequest)

    // {
    // try {

    // String authorizationHeader = httpRequest.getHeader("Authorization");
    // String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

    // Integer orgId = jdbcTemplate.queryForObject(
    // "SELECT org_id FROM org_user WHERE firebase_id = ?",
    // Integer.class,
    // uid
    // );

    // if (orgId == null) {
    // return ResponseEntity.status(403).body("User does not belong to any
    // organization.");
    // }

    // String sql = "SELECT sync_all_tables(CAST(? AS jsonb), ?)::text";

    // String jsonResult = jdbcTemplate.queryForObject(
    // sql,
    // String.class,
    // jsonPayload,
    // uid
    // );
    // JsonNode result = objectMapper.readTree(jsonResult);
    // return ResponseEntity.ok(result);

    // } catch (Exception e) {
    // e.printStackTrace();
    // return ResponseEntity.status(500).body("Error syncing: " + e.getMessage());
    // }
    // }

    @RequestMapping(value = "/pullFromServer", method = RequestMethod.GET)
    public ResponseEntity<?> pullFromServer(
            @RequestParam("orgId") int orgId,
            HttpServletRequest httpRequest) {

        Map<String, Object> response = new HashMap<>();

        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);
            System.out.println(uid);

            Integer allowedOrgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    uid);

            if (allowedOrgId == null || allowedOrgId != orgId) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed to access this organization");
            }

            // Fetch sync data
            String resultJson = jdbcTemplate.queryForObject(
                    "SELECT fetch_all_data_by_org(?)::text",
                    (rs, rowNum) -> rs.getString(1),
                    orgId);

            return ResponseEntity.ok(resultJson);

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "Error fetching sync data.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/secure")
    public String secureEndpoint() {
        return "secured";
    }

    @PostMapping("/send-mail")
    public String sendTestEmail() {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo("mohangowdajns99@gmail.com"); // replace with your target
            message.setSubject("Test Email from Spring Boot");
            message.setText("This is a test email sent from your Spring Boot app.");
            message.setFrom("raghavendra.kedlaya@dfivetechnologies.com");

            mailSender.send(message);
            return "Email sent successfully!";
        } catch (Exception e) {
            e.printStackTrace();
            return "Email failed: " + e.getMessage();
        }
    }

    // @PostMapping("/getUserStatus")
    // public ResponseEntity<?> getUserStatus(@RequestBody Map<String, Object>
    // payload,
    // HttpServletRequest httpRequest) {
    // Map<String, Object> response = new HashMap<>();

    // try {
    // String authorizationHeader = httpRequest.getHeader("Authorization");
    // String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

    // Integer orgId = jdbcTemplate.queryForObject(
    // "SELECT org_id FROM org_user WHERE firebase_id = ?",
    // Integer.class,
    // uid
    // );

    // if (orgId == null) {
    // return ResponseEntity.status(403).body("Access denied: user is not associated
    // with any organization.");
    // }

    // String ipAddress = FirebaseUtils.getClientIp(httpRequest);
    // String payloadJson = new ObjectMapper().writeValueAsString(payload);

    // String sql = "SELECT get_userstatus(?, ?, ?)::text";
    // String result = jdbcTemplate.queryForObject(sql, String.class, payloadJson,
    // ipAddress, uid);

    // JsonNode jsonResponse = new ObjectMapper().readTree(result);
    // return ResponseEntity.ok(jsonResponse);

    // } catch (IllegalArgumentException ex) {
    // response.put("success", false);
    // response.put("message", ex.getMessage());
    // return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    // } catch (Exception ex) {
    // ex.printStackTrace();
    // response.put("success", false);
    // response.put("message", "Internal server error");
    // return
    // ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    // }
    // }
    @PostMapping("/getUserStatus")
    public ResponseEntity<?> getUserStatus(@RequestBody Map<String, Object> payload,
            HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();
        System.out.println("from getUserStatus" + payload.toString());
        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);
            String ipAddress = FirebaseUtils.getClientIp(httpRequest);
            String payloadJson = new ObjectMapper().writeValueAsString(payload);

            // Fetch org_id and device_id from DB
            Map<String, Object> userRecord = jdbcTemplate.queryForMap(
                    "SELECT org_id, device_id FROM org_user WHERE firebase_id = ?",
                    uid);

            Integer orgId = (Integer) userRecord.get("org_id");
            String existingDeviceId = (String) userRecord.get("device_id");

            if (orgId == null) {
                return ResponseEntity.status(403)
                        .body(Map.of("message", "Access denied: User not linked to any organization."));
            }

            String deviceId = payload.get("device_id") != null ? payload.get("device_id").toString().trim() : null;

            System.out.println("Existing Device ID: " + existingDeviceId);
            System.out.println("Received Device ID: " + deviceId);

            // === DEVICE ID MATCH ===
            if (deviceId != null && !deviceId.isEmpty() && deviceId.equals(existingDeviceId)) {
                System.out.println("Matches");
                String sql = "SELECT get_userstatus(?, ?, ?)::text";
                String result = jdbcTemplate.queryForObject(sql, String.class, payloadJson, ipAddress, uid);
                JsonNode jsonResponse = new ObjectMapper().readTree(result);
                return ResponseEntity.ok(jsonResponse);
            } else {
                System.out.println("Not matches");

                response.put("status", 3);
                response.put("message", "User has changed phone. Cannot continue on this device.");
                return ResponseEntity.ok(response);
            }

            // === DEVICE MISMATCH OR MISSING ===
            // if (deviceId == null || deviceId.isEmpty()) {
            // response.put("status", 5);
            // response.put("message", "Device ID not provided.");
            // } else {
            // response.put("status", 3);
            // response.put("message", "Device mismatch: Cannot continue on this phone.");
            // }

            // return ResponseEntity.status(403).body(response);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid token or request: " + ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Internal server error"));
        }
    }

    @PostMapping("/updateUserStatus")
    public ResponseEntity<?> updateUserStatus(@RequestBody Map<String, Object> payload,
            HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();

        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);
            String ipAddress = FirebaseUtils.getClientIp(httpRequest);
            String payloadJson = new ObjectMapper().writeValueAsString(payload);
            String sql = "SELECT update_userstatus(?, ?, ?)::text";
            String result = jdbcTemplate.queryForObject(sql, String.class, payloadJson, ipAddress, uid);
            JsonNode jsonResponse = new ObjectMapper().readTree(result);
            return ResponseEntity.ok(jsonResponse);

        } catch (IllegalArgumentException ex) {
            response.put("success", false);
            response.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception ex) {
            ex.printStackTrace();
            response.put("success", false);
            response.put("message", "Internal server error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/getPlanMaster")
    public ResponseEntity<?> getPlanMaster(HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();
        System.out.println("reached plan master");
        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String firebaseUid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);
            String clientIp = FirebaseUtils.getClientIp(httpRequest);

            Integer orgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    firebaseUid);

            if (orgId == null) {
                return ResponseEntity.status(403).body("Access denied: user is not associated with any organization.");
            }

            String sql = "SELECT get_plan_master(?, ?)::text";
            String result = jdbcTemplate.queryForObject(sql, String.class, clientIp, firebaseUid);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonResponse = mapper.readTree(result);

            return ResponseEntity.ok(jsonResponse);

        } catch (IllegalArgumentException ex) {
            response.put("success", false);
            response.put("message", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);

        } catch (Exception ex) {
            ex.printStackTrace();
            response.put("success", false);
            response.put("message", "Internal server error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

}
