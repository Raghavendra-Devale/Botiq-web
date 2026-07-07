package com.dfive.botiq.controllers;

import com.dfive.botiq.entities.BotiqCustomer;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.util.FirebaseUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.razorpay.Customer;
import io.grpc.InternalGlobalInterceptors;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.cache.annotation.Cacheable;

import java.net.http.HttpClient;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import java.time.LocalDate;
import java.sql.Date;

@RestController
@RequestMapping("/web")
public class WebController {
    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    OrgUserRepository orgUserRepository;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private com.dfive.botiq.services.PushNotificationService pushNotificationService;

    @Autowired
    private com.dfive.botiq.services.SseService sseService;

    ObjectMapper mapper = new ObjectMapper();

    private UserPrincipal getUserPrincipal() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        throw new org.springframework.security.authentication.BadCredentialsException(
                "User session is invalid or expired");
    }

    private void evictPartnersCache(Integer orgId) {
        System.out.println("evictPartnersCache");
        if (orgId != null && cacheManager != null) {
            org.springframework.cache.Cache cache = cacheManager.getCache("partners");
            if (cache != null) {
                cache.evict(orgId);
                System.out.println("Evicted partners cache for orgId: " + orgId);
            }
        }
    }

    private void evictGetSettingsData(Integer orgId) {
        System.out.println("Evicting settings data for orgId: " + orgId);
        if (orgId != null && cacheManager != null) {
            org.springframework.cache.Cache cache = cacheManager.getCache("settings");
            if (cache != null) {
                cache.evict(orgId);
                System.out.println("Evicted settings cache for orgId: " + orgId);
            }
        }
    }

    private void evictGetMasterData() {
        System.out.println("Evicting master data");
        if (cacheManager != null) {

            org.springframework.cache.Cache cache = cacheManager.getCache("masterData");

            if (cache != null) {

                cache.clear();

                System.out.println(
                        "Evicted all masterData cache entries");
            }
        }
    }

    private Long getUserIdFromFirebaseUid(String firebaseUid) {
        if (firebaseUid == null)
            return null;
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM org_user WHERE firebase_id = ? LIMIT 1",
                    Long.class,
                    firebaseUid);
        } catch (Exception e) {
            return null;
        }
    }

    private void notifyOrderStatusUpdate(Integer orgId, Integer orderId, String status, String actionType,
            Long excludeUserId) {
        if (orgId == null || orderId == null)
            return;
        try {
            String title = "Order Status Alert";
            String body = "";
            if ("CREATED".equals(actionType)) {
                title = "New Order Created";
                body = "A new Order #" + orderId + " has been created.";
            } else if ("COMPLETED".equals(actionType)) {
                title = "Order Completed";
                body = "Order #" + orderId + " has been completed.";
            } else {
                title = "Order Updated";
                body = "Order #" + orderId + " status updated to: " + (status != null ? status : "Updated") + ".";
            }
            pushNotificationService.sendToOrg(orgId.longValue(), title, body, excludeUserId);
        } catch (Exception e) {
            System.err.println("Error notifying order status update: " + e.getMessage());
        }
    }

    private void notifyJobAssignment(Integer orgId, Object partnerIdObj, Object jobIdObj) {
        if (partnerIdObj == null || jobIdObj == null) {
            return;
        }
        try {
            Long partnerId = ((Number) partnerIdObj).longValue();
            Long jobId = ((Number) jobIdObj).longValue();
            if (partnerId <= 0)
                return;

            List<Map<String, Object>> partners = jdbcTemplate.queryForList(
                    "SELECT partner_name, partner_contact FROM botiq_partner_w WHERE partner_id = ? AND org_id = ?",
                    partnerId, orgId);
            if (partners.isEmpty())
                return;

            String contact = (String) partners.get(0).get("partner_contact");
            if (contact == null || contact.trim().isEmpty())
                return;

            String normalizedContact = contact.replaceAll("[^0-9]", "");
            if (normalizedContact.length() > 10) {
                normalizedContact = normalizedContact.substring(normalizedContact.length() - 10);
            }

            String userSql = "SELECT user_id FROM org_user WHERE org_id = ? AND (email_id = ? OR mobile_number LIKE ?)";
            List<Integer> userIds = jdbcTemplate.queryForList(
                    userSql,
                    Integer.class,
                    orgId,
                    contact.trim(),
                    "%" + normalizedContact);

            if (!userIds.isEmpty()) {
                pushNotificationService.sendToUser(
                        userIds.get(0).longValue(),
                        "New Job Assignment",
                        "You have been assigned to Job #" + jobId);
            }
        } catch (Exception e) {
            System.err.println("Error notifying job assignment: " + e.getMessage());
        }
    }

    @PostMapping("/saveOrderDetails")
    public ResponseEntity<?> saveOrderDetails(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        try {

            Integer orderId = ((Number) payload.get("orderId")).intValue();

            Integer detailsType = ((Number) payload.get("detailsType")).intValue();

            String detailsData = (String) payload.get("detailsData");

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer detailsId = jdbcTemplate.queryForObject(
                    """
                            INSERT INTO botiq_order_docs_w
                            (
                                order_id,
                                org_id,
                                details_type,
                                details_data,
                                updated_date
                            )
                            VALUES
                            (
                                ?, ?, ?, ?, NOW()
                            )
                            RETURNING details_id
                            """,
                    Integer.class,
                    orderId,
                    orgId,
                    detailsType,
                    detailsData);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "detailsId", detailsId));

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Error saving order details");
        }
    }

    @PostMapping("/saveOrUpdateJobOrder")
    public ResponseEntity<?> saveOrUpdateJobOrder(
            @RequestBody Map<String, Object> jobOrder,
            HttpServletRequest request) {

        try {

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            LocalDate jobDueDate = null;

            if (jobOrder.get("jobDueDate") != null) {

                String dueDateStr = jobOrder.get("jobDueDate").toString();

                jobDueDate = Instant.parse(dueDateStr)
                        .atZone(ZoneId.systemDefault())
                        .toLocalDate();
            }

            Date sqlDueDate = jobDueDate != null
                    ? Date.valueOf(jobDueDate)
                    : null;

            Integer jobId = null;

            if (jobOrder.get("jobId") != null) {
                jobId = ((Number) jobOrder.get("jobId"))
                        .intValue();
            }

            // UPDATE
            if (jobId != null && jobId > 0) {

                String updateSql = """
                        UPDATE botiq_job_order_w
                        SET
                            order_id = ?,
                            customer_id = ?,
                            partner_id = ?,
                            job_order_details = ?,
                            job_due_date = ?,
                            job_priority = ?,
                            job_order_status = ?,
                            updated_date = NOW(),
                            updated_by = ?
                        WHERE job_id = ?
                          AND org_id = ?
                        """;

                int rows = jdbcTemplate.update(
                        updateSql,
                        jobOrder.get("orderId"),
                        jobOrder.get("customerId"),
                        jobOrder.get("partnerId"),
                        jobOrder.get("jobOrderDetails"),
                        sqlDueDate,
                        jobOrder.get("jobPriority"),
                        jobOrder.get("jobOrderStatus"),
                        uid,
                        jobId,
                        orgId);

                if (rows > 0) {
                    notifyJobAssignment(orgId, jobOrder.get("partnerId"), jobId);
                    return ResponseEntity.ok(
                            Map.of(
                                    "status", "updated",
                                    "jobId", jobId));
                }

                return ResponseEntity.badRequest()
                        .body("Job Order not found");
            }

            // INSERT
            String insertSql = """
                    INSERT INTO botiq_job_order_w
                    (
                        org_id,
                        order_id,
                        customer_id,
                        partner_id,
                        job_order_details,
                        job_due_date,
                        job_priority,
                        job_order_status,
                        created_date,
                        updated_date,
                        updated_by
                    )
                    VALUES
                    (
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        NOW(),
                        NOW(),
                        ?
                    )
                    RETURNING job_id
                    """;

            Integer newJobId = jdbcTemplate.queryForObject(
                    insertSql,
                    Integer.class,
                    orgId,
                    jobOrder.get("orderId"),
                    jobOrder.get("customerId"),
                    jobOrder.get("partnerId"),
                    jobOrder.get("jobOrderDetails"),
                    sqlDueDate,
                    jobOrder.get("jobPriority"),
                    jobOrder.get("jobOrderStatus"),
                    uid);

            notifyJobAssignment(orgId, jobOrder.get("partnerId"), newJobId);
            return ResponseEntity.ok(
                    Map.of(
                            "status", "inserted",
                            "jobId", newJobId));

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Error saving job order");
        }
    }

    @PostMapping("/deleteJobDoc")
    public ResponseEntity<?> deleteJobDoc(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        try {

            Integer jobDocId = payload.get("jobDocId") != null
                    ? ((Number) payload.get("jobDocId")).intValue()
                    : null;

            Integer jobId = payload.get("jobId") != null
                    ? ((Number) payload.get("jobId")).intValue()
                    : null;

            if (jobDocId == null || jobId == null) {
                return ResponseEntity.badRequest()
                        .body("jobDocId and jobId are required");
            }

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            int rows = jdbcTemplate.update("""
                    DELETE FROM botiq_job_docs_w jd
                    USING botiq_job_order_w jo
                    WHERE jd.job_doc_id = ?
                      AND jd.job_id = ?
                      AND jd.job_id = jo.job_id
                      AND jo.org_id = ?
                    """,
                    jobDocId,
                    jobId,
                    orgId);

            if (rows == 0) {
                return ResponseEntity.status(404)
                        .body("Job document not found");
            }

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Job document deleted successfully",
                            "jobDocId", jobDocId));

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Error deleting job document");
        }
    }

    @PostMapping("/getCategoriesByPartnerId")
    public ResponseEntity<?> getCategoriesByPartnerId(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        try {

            Integer partnerId = payload.get("partnerId") != null
                    ? ((Number) payload.get("partnerId")).intValue()
                    : null;

            if (partnerId == null) {
                return ResponseEntity.badRequest()
                        .body("Partner ID is required");
            }

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            String sql = """
                    SELECT partner_category_id,
                           partner_category
                    FROM botiq_partner_w
                    WHERE partner_id = ?
                      AND org_id = ?
                    """;

            List<Map<String, Object>> result = jdbcTemplate.queryForList(sql, partnerId, orgId);

            if (result.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            String categoryIds = (String) result.get(0).get("partner_category_id");

            String categoryNames = (String) result.get(0).get("partner_category");

            if (categoryIds == null || categoryIds.isBlank()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            String[] ids = categoryIds.split(",");
            String[] names = categoryNames != null
                    ? categoryNames.split(",")
                    : new String[0];

            List<Map<String, Object>> categories = new ArrayList<>();

            for (int i = 0; i < ids.length; i++) {

                Map<String, Object> category = new HashMap<>();

                category.put("id", ids[i].trim());

                category.put(
                        "name",
                        i < names.length
                                ? names[i].trim()
                                : "Unknown");

                categories.add(category);
            }

            return ResponseEntity.ok(categories);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Error fetching categories");
        }
    }

    @PostMapping("/getPaginatedOrders")
    public ResponseEntity<?> getPaginatedOrders(@RequestBody Map<String, Object> payload, HttpServletRequest request) {

        try {

            Integer limit = ((Number) payload.get("limit")).intValue();
            Integer offset = ((Number) payload.get("offset")).intValue();

            String status = (String) payload.get("status");
            String searchCriteria = (String) payload.get("searchCriteria");

            Integer tabId = payload.get("tabId") != null ? ((Number) payload.get("tabId")).intValue() : null;

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            StringBuilder sql = new StringBuilder("""
                    SELECT
                        o.*,
                        c.customer_name,
                        c.contact_number,
                        c.customer_address,
                        (
                            SELECT od.details_data
                            FROM botiq_order_docs_w od
                            WHERE od.order_id = o.order_id
                              AND od.details_type = 2
                            ORDER BY od.details_id
                            LIMIT 1
                        ) AS details_data
                    FROM botiq_order_w o
                    LEFT JOIN botiq_customer_w c
                        ON o.customer_id = c.customer_id
                    WHERE o.org_id = ?
                    """);

            List<Object> params = new ArrayList<>();
            params.add(orgId);

            // Status filters
            if ("Custom".equals(status) && tabId != null) {

                switch (tabId) {

                    // Due this week
                    case 1:
                        sql.append("""
                                AND o.order_status NOT IN ('Delivered','Hold')
                                AND o.due_date >= date_trunc('week', CURRENT_DATE)::date
                                AND o.due_date < (
                                    date_trunc('week', CURRENT_DATE)
                                    + interval '7 days'
                                )::date
                                """);
                        break;

                    // Overdue
                    case 2:
                        sql.append("""
                                AND o.order_status NOT IN ('Delivered','Hold')
                                AND o.due_date < date_trunc('week', CURRENT_DATE)::date
                                """);
                        break;

                    // Priority
                    case 3:
                        sql.append("""
                                AND o.order_status NOT IN ('Delivered','Hold')
                                AND o.order_priority = 1
                                """);
                        break;

                    // Ready
                    case 4:
                        sql.append("""
                                AND o.order_status = 'Ready'
                                """);
                        break;

                    // Delivered this week
                    case 5:
                        sql.append("""
                                AND o.order_status = 'Delivered'
                                AND o.delivered_date >= date_trunc('week', CURRENT_DATE)::date
                                AND o.delivered_date < (
                                    date_trunc('week', CURRENT_DATE)
                                    + interval '7 days'
                                )::date
                                """);
                        break;

                    // Orders created this week
                    case 6:
                        sql.append("""
                                AND o.order_date >= date_trunc('week', CURRENT_DATE)::date
                                AND o.order_date < (
                                    date_trunc('week', CURRENT_DATE)
                                    + interval '7 days'
                                )::date
                                """);
                        break;
                }

            } else if (status != null
                    && !status.isBlank()
                    && !"Custom".equals(status)) {

                sql.append("""
                        AND o.order_status = ?
                        """);

                params.add(status);
            }

            // Search
            if (searchCriteria != null && !searchCriteria.trim().isEmpty()) {

                String search = "%" + searchCriteria.trim() + "%";

                sql.append("""
                        AND (
                            c.customer_name ILIKE ?
                            OR c.contact_number ILIKE ?
                        )
                        """);

                params.add(search);
                params.add(search);
            }

            sql.append("""
                    ORDER BY o.updated_date DESC
                    LIMIT ?
                    OFFSET ?
                    """);

            params.add(limit);
            params.add(offset);

            List<Map<String, Object>> orders = jdbcTemplate.queryForList(
                    sql.toString(),
                    params.toArray());

            return ResponseEntity.ok(orders);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Error fetching orders");
        }
    }

    @Transactional
    @PostMapping("/deleteCompleteOrder")
    public ResponseEntity<?> deleteCompleteOrder(@RequestBody Map<String, Object> payload, HttpServletRequest request) {

        Integer orderId = payload.get("orderId") != null ? ((Number) payload.get("orderId")).intValue() : null;

        if (orderId == null) {
            return ResponseEntity.badRequest().body("Order ID is required");
        }

        try {

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer exists = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM botiq_order_w
                            WHERE order_id = ?
                              AND org_id = ?
                            """,
                    Integer.class,
                    orderId,
                    orgId);

            if (exists == null || exists == 0) {
                return ResponseEntity.status(404).body("Order not found");
            }

            jdbcTemplate.update("""
                    DELETE FROM botiq_order_docs_w
                    WHERE order_id = ?
                    """, orderId);

            jdbcTemplate.update("""
                    DELETE FROM botiq_job_docs_w jd
                    USING botiq_job_order_w jo
                    WHERE jd.job_id = jo.job_id
                      AND jo.order_id = ?
                      AND jo.org_id = ?
                    """,
                    orderId,
                    orgId);

            jdbcTemplate.update("""
                    DELETE FROM botiq_job_order_w
                    WHERE order_id = ?
                      AND org_id = ?
                    """,
                    orderId,
                    orgId);

            jdbcTemplate.update("""
                    DELETE FROM botiq_order_w
                    WHERE order_id = ?
                      AND org_id = ?
                    """,
                    orderId,
                    orgId);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "orderId", orderId,
                            "message", "Order deleted successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            throw e; // let @Transactional roll back
        }
    }

    @PostMapping("/addOrUpdatePartner")
    public ResponseEntity<?> addOrUpdatePartner(@RequestBody Map<String, Object> partner, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            String insertPartner = """
                    INSERT INTO botiq_partner_w
                    (org_id,
                    partner_name,
                    partner_contact,
                     partner_address,
                     partner_category_id,
                     notes,
                     enabled)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """;

            jdbcTemplate.update(
                    insertPartner,
                    partner.get("orgId"),
                    partner.get("partnerName"),
                    partner.get("partnerContact"),
                    partner.get("partnerAddress"),
                    partner.get("partnerCategoryId"),
                    partner.get("notes"),
                    partner.get("enabled"));

            Object orgIdObj = partner.get("orgId");
            Integer orgId = null;
            if (orgIdObj != null) {
                orgId = ((Number) orgIdObj).intValue();
            }
            evictPartnersCache(orgId);

            Map<String, Object> ssePayload = new HashMap<>();
            ssePayload.put("event", "ADD_PARTNER");
            ssePayload.put("orgId", orgId);
            ssePayload.put("partnerName", partner.get("partnerName"));
            sseService.sendToOrg(orgId, ssePayload);

            return ResponseEntity.ok(Map.of("success", true, "message", "Partner added successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("success", false, "message", "Error adding or updating partner"));
        }
    }

    @PostMapping("/isPartnerUsedInJobOrder")
    public ResponseEntity<?> isPartnerUsedInJobOrder(@RequestBody Integer partnerId, HttpServletRequest request) {
        UserPrincipal principal = getUserPrincipal();
        String uid = principal.getFirebaseUid();

        String partnerUsed = "SELECT COUNT(*) as count FROM botiq_job_order_w WHERE partner_id = ?";

        Integer count = jdbcTemplate.queryForObject(partnerUsed, Integer.class, partnerId);
        boolean isUsed = count > 0;
        System.out.println("partners used map: " + count);

        return ResponseEntity.ok(isUsed);
    }

    @PostMapping("/isSkillLinkedToJobOrders")
    public ResponseEntity<?> isSkillLinkedToJobOrders(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            Integer skillId = ((Number) payload.get("skillId")).intValue();
            Integer partnerId = ((Number) payload.get("partnerId")).intValue();

            String sql = "SELECT COUNT(*) FROM botiq_job_order_w WHERE job_order_details = ? AND partner_id = ?";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, String.valueOf(skillId), partnerId);
            boolean linked = count != null && count > 0;

            return ResponseEntity.ok(Map.of("linked", linked));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error checking skill linkage: " + e.getMessage());
        }
    }

    @PostMapping("/removeSkillFromPartner")
    public ResponseEntity<?> removeSkillFromPartner(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            Integer partnerId = ((Number) payload.get("partnerId")).intValue();
            Integer categoryId = ((Number) payload.get("categoryId")).intValue();
            String categoryIdStr = categoryId.toString();

            String selectSql = "SELECT partner_category_id FROM botiq_partner_w WHERE partner_id = ?";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(selectSql, partnerId);

            if (rows.isEmpty()) {
                return ResponseEntity.status(404).body("Partner not found");
            }

            String current = (String) rows.get(0).get("partner_category_id");
            if (current != null && !current.isEmpty()) {
                String[] ids = current.split(",");
                StringBuilder updated = new StringBuilder();
                for (String id : ids) {
                    if (!id.trim().equals(categoryIdStr)) {
                        if (updated.length() > 0)
                            updated.append(",");
                        updated.append(id.trim());
                    }
                }

                String updateSql = "UPDATE botiq_partner_w SET partner_category_id = ?, updated_date = CURRENT_TIMESTAMP WHERE partner_id = ?";
                jdbcTemplate.update(updateSql, updated.toString(), partnerId);
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error removing skill from partner: " + e.getMessage());
        }
    }

    @PostMapping("/removeSkillFromJobOrders")
    public ResponseEntity<?> removeSkillFromJobOrders(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            Integer skillId = ((Number) payload.get("skillId")).intValue();
            Integer partnerId = ((Number) payload.get("partnerId")).intValue();
            String skillIdStr = skillId.toString();

            String selectSql = "SELECT job_id, job_order_details FROM botiq_job_order_w WHERE partner_id = ? AND job_order_details LIKE ?";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(selectSql, partnerId, "%" + skillIdStr + "%");

            for (Map<String, Object> row : rows) {
                String details = (String) row.get("job_order_details");
                Integer jobId = ((Number) row.get("job_id")).intValue();

                if (details != null) {
                    String[] ids = details.split(",");
                    StringBuilder updated = new StringBuilder();
                    for (String id : ids) {
                        if (!id.trim().equals(skillIdStr)) {
                            if (updated.length() > 0)
                                updated.append(",");
                            updated.append(id.trim());
                        }
                    }

                    String updateSql = "UPDATE botiq_job_order_w SET job_order_details = ?, updated_date = CURRENT_TIMESTAMP WHERE job_id = ?";
                    jdbcTemplate.update(updateSql, updated.toString(), jobId);
                }
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error removing skill from job orders: " + e.getMessage());
        }
    }

    @Cacheable(value = "settings", key = "#settingsId")
    @PostMapping("/getSettingsData/{settingsId}")
    public ResponseEntity<?> getSettingsData(@PathVariable int settingsId, HttpServletRequest request) {
        System.out.println("Database hit for settings ");
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            if (settingsId != orgId) {
                return ResponseEntity.status(404).body("Settings not found");
            }
            String sql = "SELECT * FROM org_settings WHERE org_id = ?";
            List<Map<String, Object>> settings = jdbcTemplate.queryForList(sql, orgId);

            if (settings.isEmpty()) {
                // Create settings on the fly
                String insertSql = "INSERT INTO org_settings (org_id, created_date, updated_date) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                jdbcTemplate.update(insertSql, orgId);
                settings = jdbcTemplate.queryForList(sql, orgId);
            }

            Map<String, Object> dbRow = settings.get(0);
            Map<String, Object> response = new HashMap<>();
            response.put("orgSettId", dbRow.get("org_sett_id"));
            response.put("orgId", dbRow.get("org_id"));

            String wc = (String) dbRow.get("work_categories");
            response.put("workCategories", wc != null && !wc.isEmpty() ? wc.split(",") : new String[0]);

            String wcid = (String) dbRow.get("work_category_ids");
            response.put("workCategoryIds", wcid != null && !wcid.isEmpty() ? wcid.split(",") : new String[0]);

            String pc = (String) dbRow.get("partner_categories");
            response.put("partnerCategories", pc != null && !pc.isEmpty() ? pc.split(",") : new String[0]);

            String pcid = (String) dbRow.get("partner_category_ids");
            response.put("partnerCategoryIds", pcid != null && !pcid.isEmpty() ? pcid.split(",") : new String[0]);

            response.put("orgLogo", dbRow.get("org_logo"));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error getting settings data");
        }
    }

    @PostMapping("/saveMasterCategory")
    public ResponseEntity<?> saveMasterCategory(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            String type = (String) payload.get("type"); // "workCategories" or "partnerCategories"
            String category = (String) payload.get("category");

            String checkSql = "SELECT key_id FROM master_table WHERE key_name = ? AND master_type = ? AND org_id = ?";
            List<Map<String, Object>> existing = jdbcTemplate.queryForList(checkSql, category, type, orgId);

            if (!existing.isEmpty()) {
                Integer keyId = ((Number) existing.get(0).get("key_id")).intValue();
                String updateSql = "UPDATE master_table SET key_name = ?, updated_date = CURRENT_TIMESTAMP WHERE key_id = ? AND master_type = ? AND org_id = ?";
                jdbcTemplate.update(updateSql, category, keyId, type, orgId);
            } else {
                String insertSql = "INSERT INTO master_table (key_id, key_name, master_type, org_id, created_date, updated_date) "
                        +
                        "VALUES ((SELECT COALESCE(MAX(key_id), 0) + 1 FROM master_table WHERE master_type = ? AND org_id = ?), ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                jdbcTemplate.update(insertSql, type, orgId, category, type, orgId);
            }
            evictGetMasterData(); // clearing cache
            evictGetSettingsData(orgId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving master category: " + e.getMessage());
        }
    }

    @Cacheable(value = "masterData", key = "#masterDataId + '_' + #payload['type']", unless = "#result.body == null")
    @PostMapping("/getMasterData/{masterDataId}")
    public ResponseEntity<?> getMasterData(@PathVariable int masterDataId, @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        System.out.println("HITTING DB FOR MASTER DATA");

        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();
            if (orgId != masterDataId) {
                return ResponseEntity.status(404).body("Org ID not found");
            }
            String type = (String) payload.get("type"); // "workCategories" or "partnerCategories"

            String sql = "SELECT key_id, key_name FROM master_table WHERE org_id = ? AND master_type = ? ORDER BY key_id ASC";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, orgId, type);

            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> row : rows) {
                Map<String, Object> item = new HashMap<>();
                item.put("key_id", row.get("key_id"));
                item.put("key_name", row.get("key_name"));
                result.add(item);
            }

            System.out.println("master category data: " + result);

            return ResponseEntity.ok(Map.of("success", result));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error getting master data: " + e.getMessage());
        }
    }

    @PostMapping("/isWorkCategoryUsed")
    public ResponseEntity<?> isWorkCategoryUsed(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();
            String categoryName = (String) payload.get("categoryName");

            String sql = "SELECT 1 FROM botiq_order_w WHERE org_id = ? AND (order_details LIKE ? OR CAST(order_details AS text) LIKE ?) LIMIT 1";
            String pattern = "%\"" + categoryName + "\"%";
            String fallbackPattern = "%" + categoryName + "%";
            List<Map<String, Object>> result = jdbcTemplate.queryForList(sql, orgId, pattern, fallbackPattern);

            System.out.println("work category used: " + result);
            return ResponseEntity.ok(Map.of("used", !result.isEmpty()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error checking category usage: " + e.getMessage());
        }
    }

    @PostMapping("/deleteCategoryFromMaster")
    public ResponseEntity<?> deleteCategoryFromMaster(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer categoryId = ((Number) payload.get("categoryId")).intValue();
            String type = (String) payload.get("type"); // "workCategories" or "partnerCategories"

            String sql = "DELETE FROM master_table WHERE key_id = ? AND master_type = ? AND org_id = ?";
            int rows = jdbcTemplate.update(sql, categoryId, type, orgId);
            // clearing cache
            evictGetMasterData();
            evictGetSettingsData(orgId);
            return ResponseEntity.ok(Map.of("success", rows > 0, "categoryId", categoryId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error deleting category: " + e.getMessage());
        }
    }

    @PostMapping("/isPartnerCategoryUsed")
    public ResponseEntity<?> isPartnerCategoryUsed(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer categoryId = ((Number) payload.get("categoryId")).intValue();
            String categoryIdStr = categoryId.toString();

            String sql = "SELECT 1 FROM botiq_job_order_w WHERE org_id = ? AND ',' || job_order_details || ',' LIKE ? LIMIT 1";
            String pattern = "%," + categoryIdStr + ",%";
            List<Map<String, Object>> result = jdbcTemplate.queryForList(sql, orgId, pattern);
            System.out.println("isPartnerCategoryUsed: " + result);
            return ResponseEntity.ok(Map.of("used", !result.isEmpty()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error checking partner category usage: " + e.getMessage());
        }
    }

    @PostMapping("/updatePartnerCategory")
    public ResponseEntity<?> updatePartnerCategory(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer categoryId = ((Number) payload.get("categoryId")).intValue();
            String categoryName = (String) payload.get("categoryName");
            String categoryIdStr = categoryId.toString();

            String updateQuery = "UPDATE botiq_partner_w " +
                    "SET partner_category_id = LTRIM(RTRIM(REPLACE(',' || partner_category_id || ',', ',' || ? || ',', ','), ','), ','), "
                    +
                    "    partner_category = LTRIM(RTRIM(REPLACE(',' || partner_category || ',', ',' || ? || ',', ','), ','), ','), "
                    +
                    "    updated_date = ? " +
                    "WHERE org_id = ? AND ',' || partner_category_id || ',' LIKE ?";

            String pattern = "%," + categoryIdStr + ",%";
            Timestamp updatedDate = new Timestamp(System.currentTimeMillis());

            int rows = jdbcTemplate.update(updateQuery, categoryIdStr, categoryName, updatedDate, orgId, pattern);

            // clearing cache
            evictGetSettingsData(orgId);
            evictGetMasterData();

            return ResponseEntity.ok(Map.of("success", true, "updatedRows", rows));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error updating partner category: " + e.getMessage());
        }
    }

    @PostMapping("/clearOrgLogo")
    public ResponseEntity<?> clearOrgLogo(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer orgSettId = ((Number) payload.get("orgSettId")).intValue();

            String sql = "UPDATE org_settings SET org_logo = NULL WHERE org_sett_id = ? AND org_id = ?";
            int rows = jdbcTemplate.update(sql, orgSettId, orgId);
            // clearing cache
            evictGetSettingsData(orgId);
            evictGetMasterData();
            return ResponseEntity.ok(Map.of("success", rows > 0));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error clearing org logo: " + e.getMessage());
        }
    }

    @PostMapping("/saveBusinessData")
    public ResponseEntity<?> saveBusinessData(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();

            Integer orgSettId = ((Number) payload.get("orgSettId")).intValue();
            String workCategories = (String) payload.get("workCategories");
            String workCategoryIds = (String) payload.get("workCategoryIds");
            String partnerCategories = (String) payload.get("partnerCategories");
            String partnerCategoryIds = (String) payload.get("partnerCategoryIds");
            String orgLogo = (String) payload.get("orgLogo");

            String sql = "UPDATE org_settings " +
                    "SET work_categories = ?, work_category_ids = ?, partner_categories = ?, " +
                    "    partner_category_ids = ?, org_logo = ?, updated_date = CURRENT_TIMESTAMP " +
                    "WHERE org_sett_id = ? AND org_id = ?";

            jdbcTemplate.update(sql, workCategories, workCategoryIds, partnerCategories, partnerCategoryIds, orgLogo,
                    orgSettId, orgId);
            // clearing cache
            evictGetSettingsData(orgId);
            evictGetMasterData();
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving business data: " + e.getMessage());
        }
    }

    @PostMapping("/updateUserEmailVerified")
    public ResponseEntity<?> updateUserEmailVerified(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            String mobileNumber = (String) payload.get("mobileNumber");
            Boolean verified = (Boolean) payload.get("verified");

            String sql = "UPDATE org_user SET email_verified = ? WHERE mobile_number = ?";
            int rows = jdbcTemplate.update(sql, verified, mobileNumber);

            return ResponseEntity.ok(Map.of("success", rows > 0));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error updating email verification status: " + e.getMessage());
        }
    }

    @GetMapping("/getAllMasterDataWithUserDetails")
    public ResponseEntity<?> getAllMasterDataWithUserDetails(
            HttpServletRequest request) {

        try {

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            String orgUserQuery = """
                    SELECT
                        o.org_id AS orgId,
                        o.org_name,
                        o.owner_name,
                        o.org_address,
                        o.referral_code AS referralCode,
                        u.*,
                        s.org_logo AS orgLogo
                    FROM organization o
                    INNER JOIN org_user u
                        ON o.org_id = u.org_id
                    LEFT JOIN org_settings s
                        ON o.org_id = s.org_id
                    WHERE
                        o.deleted = FALSE
                        AND u.deleted = FALSE
                        AND u.firebase_id = ?
                    LIMIT 1
                    """;

            List<Map<String, Object>> orgUsers = jdbcTemplate.queryForList(orgUserQuery, uid);

            if (orgUsers.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body("No organization or user found");
            }

            Map<String, Object> userDetails = orgUsers.get(0);

            Integer orgId = ((Number) userDetails.get("orgid")).intValue();

            Object orgLogo = userDetails.get("orglogo");

            String masterQuery = """
                    SELECT
                        master_type,
                        key_id,
                        key_name
                    FROM master_table
                    WHERE
                        org_id = ?
                        AND master_type != 'partner_status'
                    """;

            List<Map<String, Object>> masterRows = jdbcTemplate.queryForList(masterQuery, orgId);

            Map<String, List<Map<String, Object>>> masterData = new HashMap<>();

            for (Map<String, Object> row : masterRows) {

                String masterType = (String) row.get("master_type");

                Map<String, Object> item = new HashMap<>();

                item.put("key_id", row.get("key_id"));
                item.put("key_name", row.get("key_name"));

                masterData
                        .computeIfAbsent(
                                masterType,
                                k -> new ArrayList<>())
                        .add(item);
            }

            String partnerQuery = """
                    SELECT COUNT(*) AS count
                    FROM botiq_partner_w
                    WHERE
                        org_id = ?
                        AND enabled = TRUE
                        AND deleted = FALSE
                    """;

            Integer partnerCount = jdbcTemplate.queryForObject(
                    partnerQuery,
                    Integer.class,
                    orgId);

            boolean partnerStatus = partnerCount != null && partnerCount > 0;

            List<Map<String, Object>> statusList = new ArrayList<>();

            statusList.add(Map.of(
                    "key", 1,
                    "value", "Pending"));

            statusList.add(Map.of(
                    "key", 2,
                    "value", "Started"));

            statusList.add(Map.of(
                    "key", 3,
                    "value", "Ready"));

            statusList.add(Map.of(
                    "key", 4,
                    "value", "Delivered"));

            statusList.add(Map.of(
                    "key", 5,
                    "value", "Hold"));

            Map<String, Object> response = new HashMap<>();

            response.put("userDetails", userDetails);
            response.put("masterData", masterData);
            response.put("partnerStatus", partnerStatus);
            response.put("statusList", statusList);
            response.put("orgLogo", orgLogo);

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            System.out.println(
                    "Issue in get master data");

            e.printStackTrace();

            Map<String, Object> errorResponse = new HashMap<>();

            errorResponse.put("userDetails", null);
            errorResponse.put("masterData", new HashMap<>());
            errorResponse.put("partnerStatus", false);
            errorResponse.put("statusList", new ArrayList<>());
            errorResponse.put("orgLogo", null);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse);
        }
    }

    @PostMapping("/checkUserExists")
    public ResponseEntity<?> checkUserExists(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            String mobile = (String) payload.get("mobile");

            Optional<OrgUser> orgUser = orgUserRepository.findByMobileNumber(mobile);

            if (orgUser.isPresent()) {
                return ResponseEntity.ok(Map.of("exists", true));
            } else {
                return ResponseEntity.ok(Map.of("exists", false));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error searching customer");
        }
    }

    @PostMapping("/saveOrUpdateJobDoc")
    public ResponseEntity<?> saveOrUpdateJobDoc(@RequestBody Map<String, Object> payload, HttpServletRequest request) {

        try {

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();

            // job_doc_id
            Integer jobDocId = null;
            Object jobDocIdObj = payload.get("job_doc_id") != null
                    ? payload.get("job_doc_id")
                    : payload.get("jobDocId");

            if (jobDocIdObj != null) {
                jobDocId = Integer.valueOf(jobDocIdObj.toString());
            }

            // job_id
            Integer jobId = null;
            Object jobIdObj = payload.get("job_id") != null
                    ? payload.get("job_id")
                    : payload.get("jobId");

            if (jobIdObj != null) {
                jobId = Integer.valueOf(jobIdObj.toString());
            }

            // order_id
            Integer orderId = null;
            Object orderIdObj = payload.get("order_id") != null
                    ? payload.get("order_id")
                    : payload.get("orderId");

            if (orderIdObj != null) {
                orderId = Integer.valueOf(orderIdObj.toString());
            }

            // org_id
            Integer orgId = null;
            Object orgIdObj = payload.get("org_id") != null
                    ? payload.get("org_id")
                    : payload.get("orgId");

            if (orgIdObj != null) {
                orgId = Integer.valueOf(orgIdObj.toString());
            }

            // details_id
            Integer detailsId = null;
            Object detailsIdObj = payload.get("details_id") != null
                    ? payload.get("details_id")
                    : payload.get("detailsId");

            if (detailsIdObj != null) {
                detailsId = Integer.valueOf(detailsIdObj.toString());
            }

            // details_type
            Integer detailsType = null;
            Object detailsTypeObj = payload.get("details_type") != null
                    ? payload.get("details_type")
                    : payload.get("detailsType");

            if (detailsTypeObj != null) {
                detailsType = Integer.valueOf(detailsTypeObj.toString());
            }

            // details_data
            String detailsData = null;
            Object detailsDataObj = payload.get("details_data") != null
                    ? payload.get("details_data")
                    : payload.get("detailsData");

            if (detailsDataObj != null) {
                detailsData = detailsDataObj.toString();
            }

            // validation
            if (jobId == null ||
                    orderId == null ||
                    orgId == null ||
                    detailsId == null ||
                    detailsType == null) {

                return ResponseEntity.badRequest()
                        .body("Missing required fields");
            }

            // UPDATE
            if (jobDocId != null && jobDocId > 0) {

                String updateQuery = """
                        UPDATE botiq_job_docs_w
                        SET job_id = ?,
                            order_id = ?,
                            org_id = ?,
                            details_id = ?,
                            details_type = ?,
                            details_data = ?,
                            updated_date = ?
                        WHERE job_doc_id = ?
                        AND org_id = ?
                        """;

                int rowsUpdated = jdbcTemplate.update(
                        updateQuery,
                        jobId,
                        orderId,
                        orgId,
                        detailsId,
                        detailsType,
                        detailsData,
                        new Timestamp(System.currentTimeMillis()),
                        jobDocId,
                        orgId);

                if (rowsUpdated > 0) {
                    return ResponseEntity.ok(
                            Map.of(
                                    "saved", true,
                                    "message", "Job document updated successfully",
                                    "jobDocId", jobDocId));
                }

            } else {

                // INSERT
                String insertQuery = """
                        INSERT INTO botiq_job_docs_w
                        (job_id, order_id, org_id, details_id,
                         details_type, details_data, updated_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """;

                int rowsInserted = jdbcTemplate.update(
                        insertQuery,
                        jobId,
                        orderId,
                        orgId,
                        detailsId,
                        detailsType,
                        detailsData,
                        new Timestamp(System.currentTimeMillis()));

                if (rowsInserted > 0) {

                    Integer newId = jdbcTemplate.queryForObject(
                            "SELECT LASTVAL()",
                            Integer.class);

                    return ResponseEntity.ok(
                            Map.of(
                                    "saved", true,
                                    "message", "Job document saved successfully",
                                    "jobDocId", newId));
                }
            }

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(500)
                    .body("Error saving job document: " + e.getMessage());
        }

        return ResponseEntity.status(500)
                .body("Failed to save job document");
    }

    @PostMapping("/saveOrUpdateImageAudio")
    public ResponseEntity<?> saveOrUpdateImageAudio(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            Long orderId = null;
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj != null) {
                orderId = Long.valueOf(orderIdObj.toString());
            }

            Integer orgId = null;
            Object orgIdObj = payload.get("org_id") != null ? payload.get("org_id") : payload.get("orgId");
            if (orgIdObj != null) {
                orgId = Integer.valueOf(orgIdObj.toString());
            }

            Integer detailsType = null;
            Object detailsTypeObj = payload.get("details_type") != null ? payload.get("details_type")
                    : payload.get("detailsType");
            if (detailsTypeObj != null) {
                detailsType = Integer.valueOf(detailsTypeObj.toString());
            }

            String detailsData = null;
            Object detailsDataObj = payload.get("details_data") != null ? payload.get("details_data")
                    : payload.get("detailsData");
            if (detailsDataObj != null) {
                detailsData = detailsDataObj.toString();
            }

            Long detailsId = null;
            Object detailsIdObj = payload.get("details_id") != null ? payload.get("details_id")
                    : payload.get("detailsId");
            if (detailsIdObj != null) {
                detailsId = Long.valueOf(detailsIdObj.toString());
            }

            if (orderId == null || orgId == null || detailsType == null || detailsData == null) {
                return ResponseEntity.badRequest()
                        .body("Missing required parameters (order_id, org_id, details_type, details_data)");
            }

            if (detailsId != null && detailsId > 0) {
                String updateQuery = "UPDATE botiq_order_docs_w " +
                        "SET order_id = ?, org_id = ?, details_type = ?, details_data = ? " +
                        "WHERE details_id = ?";
                int rowsUpdated = jdbcTemplate.update(
                        updateQuery,
                        orderId,
                        orgId,
                        detailsType,
                        detailsData,
                        detailsId);
                if (rowsUpdated > 0) {
                    return ResponseEntity.ok(
                            Map.of("saved", true, "message", "Document updated successfully", "detailsId", detailsId));
                }
            } else {
                String insertQuery = "INSERT INTO botiq_order_docs_w " +
                        "(order_id, org_id, details_type, details_data) " +
                        "VALUES (?, ?, ?, ?)";
                int rowsUpdated = jdbcTemplate.update(
                        insertQuery,
                        orderId,
                        orgId,
                        detailsType,
                        detailsData);
                if (rowsUpdated > 0) {
                    Integer newId = jdbcTemplate.queryForObject("SELECT LASTVAL()", Integer.class);
                    return ResponseEntity
                            .ok(Map.of("saved", true, "message", "Document saved successfully", "detailsId", newId));
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving document: " + e.getMessage());
        }

        return ResponseEntity.status(500).body("Failed to save document");
    }

    @PostMapping("saveOrUpdateOrder")
    public ResponseEntity<?> saveOrUpdateOrder(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            System.out.println("save or update order => " + payload);

            Integer orgId = null;
            Object orgIdObj = payload.get("org_id") != null ? payload.get("org_id") : payload.get("orgId");
            if (orgIdObj != null) {
                orgId = ((Number) orgIdObj).intValue();
            }

            Integer orderId = null;
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj != null) {
                orderId = ((Number) orderIdObj).intValue();
            }

            if (orgId == null) {
                return ResponseEntity.badRequest().body("org_id is required");
            }

            Object customerIdObj = payload.get("customer_id") != null ? payload.get("customer_id")
                    : payload.get("customerId");
            Integer customerId = customerIdObj != null ? ((Number) customerIdObj).intValue() : null;

            Object orderDetailsObj = payload.get("order_details") != null ? payload.get("order_details")
                    : payload.get("orderDetails");
            String orderDetails = null;
            if (orderDetailsObj != null) {
                if (orderDetailsObj instanceof String) {
                    orderDetails = (String) orderDetailsObj;
                } else {
                    orderDetails = mapper.writeValueAsString(orderDetailsObj);
                }
            }

            Object orderStatusObj = payload.get("order_status") != null ? payload.get("order_status")
                    : payload.get("orderStatus");
            String orderStatus = orderStatusObj != null ? orderStatusObj.toString() : null;

            Object paymentStatusObj = payload.get("payment_status") != null ? payload.get("payment_status")
                    : payload.get("paymentStatus");
            Integer paymentStatus = paymentStatusObj != null ? ((Number) paymentStatusObj).intValue() : null;

            Object orderAmountObj = payload.get("order_amount") != null ? payload.get("order_amount")
                    : payload.get("orderAmount");
            Integer orderAmount = orderAmountObj != null ? ((Number) orderAmountObj).intValue() : null;

            Object advanceAmountObj = payload.get("advance_amount") != null ? payload.get("advance_amount")
                    : payload.get("advanceAmount");
            Integer advanceAmount = advanceAmountObj != null ? ((Number) advanceAmountObj).intValue() : null;

            Object dueAmountObj = payload.get("due_amount") != null ? payload.get("due_amount")
                    : payload.get("dueAmount");
            Integer dueAmount = dueAmountObj != null ? ((Number) dueAmountObj).intValue() : null;

            Object orderDateObj = payload.get("order_date") != null ? payload.get("order_date")
                    : payload.get("orderDate");
            String orderDate = orderDateObj != null ? orderDateObj.toString() : null;

            Object dueDateObj = payload.get("due_date") != null ? payload.get("due_date") : payload.get("dueDate");
            String dueDate = dueDateObj != null ? dueDateObj.toString() : null;

            Object hasJobOrderObj = payload.get("has_job_order") != null ? payload.get("has_job_order")
                    : payload.get("hasJobOrder");
            Boolean hasJobOrder = null;
            if (hasJobOrderObj != null) {
                if (hasJobOrderObj instanceof Boolean) {
                    hasJobOrder = (Boolean) hasJobOrderObj;
                } else {
                    String str = hasJobOrderObj.toString();
                    hasJobOrder = Boolean.valueOf(str) || "1".equals(str) || "true".equalsIgnoreCase(str);
                }
            }

            Object orderPriorityObj = payload.get("order_priority") != null ? payload.get("order_priority")
                    : payload.get("orderPriority");
            Integer orderPriority = orderPriorityObj != null ? ((Number) orderPriorityObj).intValue() : null;

            Object deliveredDateObj = payload.get("delivered_date") != null ? payload.get("delivered_date")
                    : payload.get("deliveredDate");
            String deliveredDate = deliveredDateObj != null ? deliveredDateObj.toString() : null;

            if (orderId != null && orderId > 0) {
                // UPDATE branch
                String updateQuery = "UPDATE botiq_order_w " +
                        "SET org_id = ?, customer_id = ?, order_details = ?, order_status = ?, payment_status = ?, " +
                        "order_amount = ?, advance_amount = ?, due_amount = ?, order_date = CAST(? AS date), due_date = CAST(? AS date), has_job_order = ?, "
                        +
                        "order_priority = ?, delivered_date = CAST(? AS date), updated_date = ?, updated_by = ? " +
                        "WHERE order_id = ? AND org_id = ?";

                int updatedRows = jdbcTemplate.update(
                        updateQuery,
                        orgId,
                        customerId,
                        orderDetails,
                        orderStatus,
                        paymentStatus,
                        orderAmount,
                        advanceAmount,
                        dueAmount,
                        orderDate,
                        dueDate,
                        hasJobOrder,
                        orderPriority,
                        deliveredDate,
                        new Timestamp(System.currentTimeMillis()),
                        uid,
                        orderId,
                        orgId);

                if (updatedRows > 0) {
                    System.out.println("updated order ");
                    String action = ("Delivered".equalsIgnoreCase(orderStatus)
                            || "Completed".equalsIgnoreCase(orderStatus)) ? "COMPLETED" : "UPDATED";
                    notifyOrderStatusUpdate(orgId, orderId, orderStatus, action, null);

                    Map<String, Object> ssePayload = new HashMap<>();
                    ssePayload.put("event", "UPDATE_ORDER");
                    ssePayload.put("orgId", orgId);
                    ssePayload.put("orderId", orderId);
                    ssePayload.put("status", orderStatus);
                    sseService.sendToOrg(orgId, ssePayload);

                    return ResponseEntity.ok(Map.of("status", "updated", "orderId", orderId));
                } else {
                    System.out.println("order not found for update, performing insert with id: " + orderId);
                    String insertQuery = "INSERT INTO botiq_order_w (" +
                            "order_id, org_id, customer_id, order_details, order_status, payment_status, " +
                            "order_amount, advance_amount, due_amount, order_date, due_date, has_job_order, " +
                            "order_priority, delivered_date, created_date, updated_date, updated_by" +
                            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS date), CAST(? AS date), ?, ?, CAST(? AS date), NOW(), NOW(), ?)";

                    jdbcTemplate.update(
                            insertQuery,
                            orderId,
                            orgId,
                            customerId,
                            orderDetails,
                            orderStatus,
                            paymentStatus,
                            orderAmount,
                            advanceAmount,
                            dueAmount,
                            orderDate,
                            dueDate,
                            hasJobOrder,
                            orderPriority,
                            deliveredDate,
                            uid);
                    notifyOrderStatusUpdate(orgId, orderId, orderStatus, "CREATED", null);

                    Map<String, Object> ssePayload = new HashMap<>();
                    ssePayload.put("event", "CREATE_ORDER");
                    ssePayload.put("orgId", orgId);
                    ssePayload.put("orderId", orderId);
                    ssePayload.put("status", orderStatus);
                    sseService.sendToOrg(orgId, ssePayload);

                    return ResponseEntity.ok(Map.of("status", "inserted", "orderId", orderId));
                }
            } else {
                // INSERT branch
                String insertQuery = "INSERT INTO botiq_order_w (" +
                        "org_id, customer_id, order_details, order_status, payment_status, " +
                        "order_amount, advance_amount, due_amount, order_date, due_date, has_job_order, " +
                        "order_priority, delivered_date, created_date, updated_date, updated_by" +
                        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS date), CAST(? AS date), ?, ?, CAST(? AS date), NOW(), NOW(), ?)";

                jdbcTemplate.update(
                        insertQuery,
                        orgId,
                        customerId,
                        orderDetails,
                        orderStatus,
                        paymentStatus,
                        orderAmount,
                        advanceAmount,
                        dueAmount,
                        orderDate,
                        dueDate,
                        hasJobOrder,
                        orderPriority,
                        deliveredDate,
                        uid);

                Integer newId = jdbcTemplate.queryForObject("SELECT LASTVAL()", Integer.class);
                System.out.println("inserted order with ID: " + newId);
                notifyOrderStatusUpdate(orgId, newId, orderStatus, "CREATED", null);

                Map<String, Object> ssePayload = new HashMap<>();
                ssePayload.put("event", "CREATE_ORDER");
                ssePayload.put("orgId", orgId);
                ssePayload.put("orderId", newId);
                ssePayload.put("status", orderStatus);
                sseService.sendToOrg(orgId, ssePayload);

                return ResponseEntity.ok(Map.of("status", "inserted", "orderId", newId));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving order");
        }
    }

    @PostMapping("/saveOrUpdateCustomer")
    public ResponseEntity<?> saveOrUpdateCustomer(
            @RequestBody BotiqCustomer customer,
            HttpServletRequest request) {
        System.out.println("save or update customer " + customer.toString());
        try {

            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            if (customer.getCustomerId() != null && customer.getCustomerId() > 0) {
                // UPDATE branch
                String updateQuery = "UPDATE botiq_customer_w " +
                        "SET " +
                        " customer_name = ?, " +
                        " contact_number = ?, " +
                        " customer_address = ?, " +
                        " org_id = ?, " +
                        " org_name = ?, " +
                        " enabled = ?, " +
                        " deleted = ?, " +
                        " updated_date = ? " +
                        "WHERE customer_id = ?";

                int updatedRows = jdbcTemplate.update(
                        updateQuery,
                        customer.getCustomerName(),
                        customer.getContactNumber(),
                        customer.getCustomerAddress(),
                        customer.getOrgId(),
                        customer.getOrgName(),
                        customer.getEnabled(),
                        customer.getDeleted(),
                        new Timestamp(System.currentTimeMillis()),
                        customer.getCustomerId());

                if (updatedRows > 0) {
                    System.out.println("updated customer ");
                    return ResponseEntity.ok(Map.of("status", "updated", "customerId", customer.getCustomerId()));
                } else {
                    System.out.println(
                            "customer not found for update, performing insert with id: " + customer.getCustomerId());
                    String insertQuery = "INSERT INTO botiq_customer_w (" +
                            "customer_id, org_id, org_name, customer_name, contact_number, customer_address, " +
                            "enabled, deleted, created_date, updated_date, updated_by" +
                            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)";

                    jdbcTemplate.update(
                            insertQuery,
                            customer.getCustomerId(),
                            customer.getOrgId(),
                            customer.getOrgName(),
                            customer.getCustomerName(),
                            customer.getContactNumber(),
                            customer.getCustomerAddress(),
                            customer.getEnabled() != null ? customer.getEnabled() : true,
                            customer.getDeleted() != null ? customer.getDeleted() : false,
                            uid);
                    return ResponseEntity.ok(Map.of("status", "inserted", "customerId", customer.getCustomerId()));
                }
            } else {
                // INSERT branch
                String insertQuery = "INSERT INTO botiq_customer_w (" +
                        "org_id, org_name, customer_name, contact_number, customer_address, " +
                        "enabled, deleted, created_date, updated_date, updated_by" +
                        ") VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)";

                jdbcTemplate.update(
                        insertQuery,
                        customer.getOrgId(),
                        customer.getOrgName(),
                        customer.getCustomerName(),
                        customer.getContactNumber(),
                        customer.getCustomerAddress(),
                        customer.getEnabled() != null ? customer.getEnabled() : true,
                        customer.getDeleted() != null ? customer.getDeleted() : false,
                        uid);

                Integer newId = jdbcTemplate.queryForObject("SELECT LASTVAL()", Integer.class);
                System.out.println("inserted customer with ID: " + newId);
                return ResponseEntity.ok(Map.of("status", "inserted", "customerId", newId));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving customer");
        }
    }

    @PostMapping("/searchCustomerByPhoneNumber")
    public ResponseEntity<?> searchCustomerByPhoneNumber(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);

            if (users.isEmpty()) {
                return ResponseEntity.status(404).body("User not found");
            }

            Integer orgId = ((Number) users.get(0).get("org_id")).intValue();

            String mobile = (String) payload.get("mobile");

            System.out.println("mobile: " + mobile);

            String sql = """
                        SELECT customer_id,
                        customer_name AS name,
                        contact_number AS mobile,
                        customer_address AS place
                        FROM botiq_customer_w
                        WHERE contact_number = ?
                        AND org_id = ?
                    """;

            List<Map<String, Object>> customers = jdbcTemplate.queryForList(sql, mobile, orgId);
            System.out.println("customer data " + customers);
            return ResponseEntity.ok(customers);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error searching customer");
        }
    }

    @PostMapping("/deletePartner")
    public ResponseEntity<?> deletePartner(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        Integer id = null;

        if (payload.get("partner_id") != null) {
            id = ((Number) payload.get("partner_id")).intValue();
        }

        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = jdbcTemplate.queryForObject(userSql, Integer.class, uid);

            String deleteSql = """
                        DELETE FROM botiq_partner_w
                        WHERE partner_id = ? AND org_id = ?
                    """;

            int rows = jdbcTemplate.update(deleteSql, id, orgId);

            if (rows == 0) {
                System.out.println("deleted partner");
                return ResponseEntity.status(404)
                        .body("Partner not found");
            }

            evictPartnersCache(orgId);

            return ResponseEntity.ok(Map.of("message", "Partner deleted successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error deleting partner");
        }
    }

    @Transactional
    @PostMapping("/deleteOrder")
    public ResponseEntity<?> deleteOrder(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        Integer id = payload.get("id") != null
                ? ((Number) payload.get("id")).intValue()
                : null;

        if (id == null) {
            return ResponseEntity.badRequest().body("Order ID is required");
        }

        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = jdbcTemplate.queryForObject(userSql, Integer.class, uid);

            String deleteJobOrder = """
                    DELETE FROM botiq_job_order_w
                    WHERE order_id = ? AND org_id = ?
                    """;

            jdbcTemplate.update(deleteJobOrder, id, orgId);

            String deleteOrder = """
                    DELETE FROM botiq_order_w
                    WHERE order_id = ? AND org_id = ?
                    """;

            int order = jdbcTemplate.update(deleteOrder, id, orgId);

            if (order == 0) {
                return ResponseEntity.status(404).body("Order not found");
            }

            return ResponseEntity.ok(Map.of("message", "Order deleted successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error deleting order");
        }
    }

    @Transactional
    @PostMapping("/deleteJobOrder")
    public ResponseEntity<?> deleteJobOrder(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        Integer jobId = payload.get("jobId") != null
                ? ((Number) payload.get("jobId")).intValue()
                : null;

        if (jobId == null) {
            return ResponseEntity.badRequest()
                    .body("Job ID is required");
        }

        try {

            String authorization = request.getHeader("Authorization");

            String uid = FirebaseUtils.extractUidFromAuthorization(
                    authorization);

            Integer orgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    uid);

            Integer exists = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*)
                    FROM botiq_job_order_w
                    WHERE job_id = ?
                      AND org_id = ?
                    """,
                    Integer.class,
                    jobId,
                    orgId);

            if (exists == 0) {
                return ResponseEntity.status(404)
                        .body("Job order not found");
            }

            // Delete child records first
            jdbcTemplate.update("""
                    DELETE FROM botiq_job_docs_w
                    WHERE job_id = ?
                    """,
                    jobId);

            // Delete parent record
            jdbcTemplate.update("""
                    DELETE FROM botiq_job_order_w
                    WHERE job_id = ?
                      AND org_id = ?
                    """,
                    jobId,
                    orgId);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "jobId", jobId,
                            "message", "Job order deleted successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Error deleting job order");
        }
    }

    @PostMapping("/deleteOrderDocByDetailsId")
    public ResponseEntity<?> deleteOrderDocByDetailsId(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            Integer detailsId = ((Number) payload.get("detailsId")).intValue();
            String authorization = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorization);
            Integer orgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    uid);

            int rows = jdbcTemplate.update("""
                    DELETE FROM botiq_order_docs_w
                    WHERE details_id = ? AND org_id = ?
                    """,
                    detailsId,
                    orgId);

            return ResponseEntity.ok(Map.of("success", rows > 0));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error deleting order document");
        }
    }

    @Transactional
    @PostMapping("/deleteJobOrdersByOrderId")
    public ResponseEntity<?> deleteJobOrdersByOrderId(
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            Integer orderId = ((Number) payload.get("orderId")).intValue();
            String authorization = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorization);
            Integer orgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    uid);

            // Delete child job docs first
            jdbcTemplate.update("""
                    DELETE FROM botiq_job_docs_w jd
                    USING botiq_job_order_w jo
                    WHERE jd.job_id = jo.job_id
                      AND jo.order_id = ?
                      AND jo.org_id = ?
                    """,
                    orderId,
                    orgId);

            // Delete parent job orders
            int rows = jdbcTemplate.update("""
                    DELETE FROM botiq_job_order_w
                    WHERE order_id = ?
                      AND org_id = ?
                    """,
                    orderId,
                    orgId);

            return ResponseEntity.ok(Map.of("success", true, "deletedCount", rows));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error deleting job orders by order ID");
        }
    }

    @PostMapping("/saveProfile")
    public ResponseEntity<?> saveProfile(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);

            if (users.isEmpty()) {
                return ResponseEntity.status(404).body("User not found");
            }

            Integer orgId = ((Number) users.get(0).get("org_id")).intValue();

            String optionalSettings = (String) payload.get("optional_settings");
            String workCategories = (String) payload.get("work_categories");
            String partnerCategories = (String) payload.get("partner_categories");
            String orgLogo = (String) payload.get("org_logo");

            String updateSql = """
                        UPDATE org_settings
                        SET
                            optional_settings = ?,
                            work_categories = ?,
                            partner_categories = ?,
                            org_logo = ?,
                            updated_date = CURRENT_TIMESTAMP
                        WHERE org_id = ?
                    """;

            int rows = jdbcTemplate.update(
                    updateSql,
                    optionalSettings,
                    workCategories,
                    partnerCategories,
                    orgLogo,
                    orgId);
            System.out.println("Rows updated: " + rows);
            System.out.println("OrgId: " + orgId);

            if (rows == 0) {
                String insertSql = """
                            INSERT INTO org_settings (
                                org_id, optional_settings, work_categories, partner_categories, org_logo, created_date, updated_date
                            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """;
                jdbcTemplate.update(
                        insertSql,
                        orgId,
                        optionalSettings,
                        workCategories,
                        partnerCategories,
                        orgLogo);
                System.out.println("New org_settings inserted for orgId: " + orgId);
            }

            // Sync work categories to master_table
            jdbcTemplate.update(
                    "DELETE FROM master_table WHERE org_id = ? AND (master_type = 'WORK_CATEGORY' OR master_type = 'workCategories')",
                    orgId);
            if (workCategories != null && !workCategories.trim().isEmpty()) {
                String[] wcs = workCategories.split(",");
                for (int i = 0; i < wcs.length; i++) {
                    String cat = wcs[i].trim();
                    if (!cat.isEmpty()) {
                        String insertSql = "INSERT INTO master_table (key_id, key_name, master_type, org_id, created_date, updated_date) "
                                +
                                "VALUES (?, ?, 'WORK_CATEGORY', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                        jdbcTemplate.update(insertSql, i + 1, cat, orgId);
                    }
                }
            }

            // Sync partner categories to master_table
            jdbcTemplate.update(
                    "DELETE FROM master_table WHERE org_id = ? AND (master_type = 'PARTNER_CATEGORY' OR master_type = 'partnerCategories')",
                    orgId);
            if (partnerCategories != null && !partnerCategories.trim().isEmpty()) {
                String[] pcs = partnerCategories.split(",");
                for (int i = 0; i < pcs.length; i++) {
                    String cat = pcs[i].trim();
                    if (!cat.isEmpty()) {
                        String insertSql = "INSERT INTO master_table (key_id, key_name, master_type, org_id, created_date, updated_date) "
                                +
                                "VALUES (?, ?, 'PARTNER_CATEGORY', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                        jdbcTemplate.update(insertSql, i + 1, cat, orgId);
                    }
                }
            }

            // Evict caches to keep UI and other endpoints synchronized
            evictGetSettingsData(orgId);
            evictGetMasterData();

            return ResponseEntity.ok(Map.of("message", "Profile saved successfully"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error updating profile");
        }
    }

    @GetMapping("/getBasicDetails")
    public ResponseEntity<?> getBasicDetails(HttpServletRequest httpRequest) {
        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
            Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

            Integer orgId = (Integer) userInfo.get("org_id");

            String profileSql = """
                        SELECT
                            o.org_id AS orgId,
                            o.org_name,
                            o.owner_name,
                            o.org_address,
                            o.mobile_number,
                            u.email_id,
                            u.user_role AS userRole,
                            o.referral_code AS referralCode,
                            s.org_logo AS orgLogo,
                            s.optional_settings AS optionalSettings,
                            s.work_categories,
                            s.partner_categories
                        FROM organization o
                        INNER JOIN org_user u ON o.org_id = u.org_id AND u.firebase_id = ?
                        LEFT JOIN (
                            SELECT DISTINCT ON (org_id) *
                            FROM org_settings
                            ORDER BY org_id, org_sett_id DESC
                        ) s ON o.org_id = s.org_id
                        WHERE
                            o.deleted = FALSE
                            AND u.deleted = FALSE
                            AND o.org_id = ?
                    """;

            List<Map<String, Object>> profileInfo = jdbcTemplate.queryForList(profileSql, uid, orgId);

            if (profileInfo.isEmpty()) {
                return ResponseEntity.status(404).body("Profile not found");
            }

            Map<String, Object> profile = profileInfo.get(0);

            // Query work categories from master_table
            String workCategoriesSql = """
                        SELECT DISTINCT key_name FROM master_table
                        WHERE org_id = ? AND (UPPER(master_type) = 'WORK_CATEGORY' OR UPPER(master_type) = 'WORKCATEGORIES')
                        ORDER BY key_name
                    """;
            List<String> wCats = jdbcTemplate.queryForList(workCategoriesSql, String.class, orgId);
            if (wCats.isEmpty()) {
                wCats = jdbcTemplate.queryForList(workCategoriesSql, String.class, 0);
            }
            wCats.removeIf(Objects::isNull);
            String workCategoriesStr = String.join(",", wCats);

            // Query partner categories from master_table
            String partnerCategoriesSql = """
                        SELECT DISTINCT key_name FROM master_table
                        WHERE org_id = ? AND (UPPER(master_type) = 'PARTNER_CATEGORY' OR UPPER(master_type) = 'PARTNERCATEGORIES')
                        ORDER BY key_name
                    """;
            List<String> pCats = jdbcTemplate.queryForList(partnerCategoriesSql, String.class, orgId);
            if (pCats.isEmpty()) {
                pCats = jdbcTemplate.queryForList(partnerCategoriesSql, String.class, 0);
            }
            pCats.removeIf(Objects::isNull);
            String partnerCategoriesStr = String.join(",", pCats);

            Map<String, Object> response = new HashMap<>();
            response.put("org_id", userInfo.get("org_id"));
            response.put("org_name", userInfo.get("org_name"));
            response.put("owner_name", profile.get("owner_name"));
            response.put("org_address", profile.get("org_address"));
            response.put("referral_code", profile.get("referralCode"));
            response.put("org_logo", profile.get("orgLogo"));
            response.put("email_id", profile.get("email_id"));
            response.put("mobile_number", profile.get("mobile_number"));
            response.put("user_role", profile.get("userRole"));
            response.put("optional_settings", profile.get("optionalSettings"));
            response.put("work_categories", workCategoriesStr);
            response.put("partner_categories", partnerCategoriesStr);
            System.out.println("Fetched work categories: " + workCategoriesStr);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching basic details");
        }
    }

    @PostMapping("/addUser")
    public ResponseEntity<?> addUser(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);
            if (users.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Logged in user not found"));
            }

            String username = (String) payload.get("username");
            String phoneNumber = (String) payload.get("phone_number");
            String email = (String) payload.get("email");
            String orgName = (String) payload.get("org_name");
            Number orgIdNum = (Number) payload.get("org_id");
            String userRole = (String) payload.get("user_role");

            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "Username is required"));
            }
            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "Phone number is required"));
            }

            Optional<OrgUser> existingUser = orgUserRepository.findByMobileNumber(phoneNumber.trim());
            if (existingUser.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "User with this phone number already exists"));
            }

            OrgUser newUser = new OrgUser();
            newUser.setOrgId(orgIdNum != null ? orgIdNum.intValue() : null);
            newUser.setFirstName(username);
            newUser.setEnabled(true);
            newUser.setDeleted(false);
            newUser.setOrgName(orgName);
            newUser.setUserRole(userRole != null ? userRole : "APP_USER");
            newUser.setEmailId(email);
            newUser.setMobileNumber(phoneNumber);
            newUser.setCreatedDate(new Timestamp(System.currentTimeMillis()));
            newUser.setEmailVerified(false);

            newUser = orgUserRepository.save(newUser);

            String insertSql = """
                    INSERT INTO botiq_user_status (
                        org_id, user_id, minimum_version, version_to_update, logout, clearlocaldata,
                        disable_user, reload_master, created_at, updated_at, user_ipaddress
                    ) VALUES (?, ?, NULL, NULL, false, false, false, false, NOW(), NOW(), NULL)
                    """;
            jdbcTemplate.update(insertSql, newUser.getOrgId(), newUser.getUserId());

            return ResponseEntity.ok(Map.of("success", true, "message", "User added successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Error adding user: " + e.getMessage()));
        }
    }

    @PostMapping("/editUser")
    public ResponseEntity<?> editUser(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);
            if (users.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Logged in user not found"));
            }

            Integer loggedInOrgId = ((Number) users.get(0).get("org_id")).intValue();

            Number targetUserIdNum = (Number) payload.get("userId");
            if (targetUserIdNum == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "User ID is required"));
            }
            long targetUserId = targetUserIdNum.longValue();

            Optional<OrgUser> userToEditOpt = orgUserRepository.findById(targetUserId);
            if (userToEditOpt.isEmpty() || userToEditOpt.get().getDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "User not found"));
            }

            OrgUser userToEdit = userToEditOpt.get();

            // Security check: ensure target user belongs to same org
            if (userToEdit.getOrgId() == null || userToEdit.getOrgId().intValue() != loggedInOrgId) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("success", false, "message", "You do not have permission to edit this user"));
            }

            String username = (String) payload.get("username");
            String phoneNumber = (String) payload.get("phone_number");
            String email = (String) payload.get("email");
            String userRole = (String) payload.get("user_role");

            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "Username is required"));
            }
            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "Phone number is required"));
            }

            // Check if mobile number is used by someone else
            Optional<OrgUser> existingUser = orgUserRepository.findByMobileNumber(phoneNumber.trim());
            if (existingUser.isPresent() && existingUser.get().getUserId() != targetUserId) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message",
                                "Another user with this phone number already exists"));
            }

            // If phone number has changed, clear firebase_id and device_id to allow
            // re-verification/re-linking
            if (userToEdit.getMobileNumber() != null
                    && !phoneNumber.trim().equals(userToEdit.getMobileNumber().trim())) {
                userToEdit.setFirebaseId(null);
                userToEdit.setDeviceId(null);
            }

            userToEdit.setFirstName(username);
            userToEdit.setEmailId(email);
            userToEdit.setMobileNumber(phoneNumber);
            if (userRole != null && !userRole.trim().isEmpty()) {
                userToEdit.setUserRole(userRole);
            }

            orgUserRepository.save(userToEdit);

            return ResponseEntity.ok(Map.of("success", true, "message", "User updated successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Error updating user: " + e.getMessage()));
        }
    }

    @GetMapping("/getUsers")
    public ResponseEntity<?> getUsers(HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);
            if (users.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
            }

            Integer orgId = ((Number) users.get(0).get("org_id")).intValue();

            String query = """
                    SELECT user_id AS userId, org_id AS orgId, first_name AS firstName,
                           mobile_number AS mobileNumber, email_id AS email, user_role AS userRole, enabled
                    FROM org_user
                    WHERE org_id = ? AND deleted = FALSE
                    ORDER BY user_id DESC
                    """;
            List<Map<String, Object>> orgUsers = jdbcTemplate.queryForList(query, orgId);

            return ResponseEntity.ok(orgUsers);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error fetching users");
        }
    }

    @Cacheable(value = "partners", key = "#id", unless = "#result.body == null")
    @GetMapping("/getPartnersByOrgId/{id}")
    public ResponseEntity<?> getPartnersByOrgId(@PathVariable Integer id,
            HttpServletRequest request) {

        System.out.println("HITTING DB");
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            // String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = id;

            String query = """
                    SELECT partner_id AS partnerId, org_id AS orgId, partner_name AS partnerName, partner_contact AS partnerContact,
                           partner_address AS partnerAddress, partner_category_id AS partnerCategoryId,
                           partner_category AS partnerCategory, notes, enabled
                    FROM botiq_partner_w
                    WHERE org_id = ?
                    """;

            List<Map<String, Object>> partners = jdbcTemplate.query(query, new Object[] { orgId },
                    (rs, rowNum) -> {
                        Map<String, Object> map = new LinkedHashMap<>();

                        map.put("partnerId", rs.getLong("partnerId"));
                        map.put("orgId", rs.getLong("orgId"));
                        map.put("partnerName", rs.getString("partnerName"));
                        map.put("partnerContact", rs.getString("partnerContact"));
                        map.put("partnerAddress", rs.getString("partnerAddress"));

                        Long partnerCategoryId = rs.getLong("partnerCategoryId");
                        map.put("partnerCategoryId", rs.wasNull() ? null : partnerCategoryId);

                        map.put("partnerCategory", rs.getString("partnerCategory"));
                        map.put("notes", rs.getString("notes"));
                        map.put("enabled", rs.getBoolean("enabled"));

                        return map;
                    });

            System.out.println("Partners: " + partners);
            return ResponseEntity.ok(partners);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching partners");
        }
    }

    @GetMapping("/getPartnerById/{id}")
    public ResponseEntity<?> getPartnerById(@PathVariable Integer id,
            HttpServletRequest request) {

        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String query = """
                    SELECT partner_id AS partnerId, org_id AS orgId, partner_name AS partnerName, partner_contact AS partnerContact,
                           partner_address AS partnerAddress, partner_category_id AS partnerCategoryId,
                           partner_category AS partnerCategory, notes, enabled
                    FROM botiq_partner_w
                    WHERE partner_id = ?
                    """;

            List<Map<String, Object>> partners = jdbcTemplate.query(query, new Object[] { id },
                    (rs, rowNum) -> {
                        Map<String, Object> map = new LinkedHashMap<>();

                        map.put("partnerId", rs.getLong("partnerId"));
                        map.put("orgId", rs.getLong("orgId"));
                        map.put("partnerName", rs.getString("partnerName"));
                        map.put("partnerContact", rs.getString("partnerContact"));
                        map.put("partnerAddress", rs.getString("partnerAddress"));

                        Long partnerCategoryId = rs.getLong("partnerCategoryId");
                        map.put("partnerCategoryId", rs.wasNull() ? null : partnerCategoryId);

                        map.put("partnerCategory", rs.getString("partnerCategory"));
                        map.put("notes", rs.getString("notes"));
                        map.put("enabled", rs.getBoolean("enabled"));

                        return map;
                    });

            if (partners.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Partner not found");
            }

            System.out.println("Partner: " + partners.get(0));
            return ResponseEntity.ok(partners.get(0));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching partner");
        }
    }

    @PostMapping("/savePartner")
    public ResponseEntity<?> savePartner(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {

            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = jdbcTemplate.queryForObject(userSql, Integer.class, uid);

            Integer partnerId = null;
            Object partnerIdObj = payload.get("partnerId");
            if (partnerIdObj != null) {
                partnerId = ((Number) partnerIdObj).intValue();
            }
            String partnerName = (String) payload.get("partnerName");
            String partnerContact = (String) payload.get("partnerContact");
            String partnerAddress = (String) payload.get("partnerAddress");
            // Integer categoryId = (Integer) payload.get("partnerCategoryId");
            String category = (String) payload.get("partnerCategory");
            String notes = (String) payload.get("notes");
            Object enabledObj = payload.get("enabled");
            boolean isEnabled = enabledObj != null && (Boolean) enabledObj;

            Integer categoryId = null;
            Object categoryIdObj = payload.get("partnerCategoryId");
            if (categoryIdObj != null) {
                if (categoryIdObj instanceof Number) {
                    categoryId = ((Number) categoryIdObj).intValue();
                } else if (categoryIdObj instanceof String && !((String) categoryIdObj).trim().isEmpty()) {
                    try {
                        String strVal = (String) categoryIdObj;
                        if (strVal.contains(",")) {
                            strVal = strVal.split(",")[0].trim();
                        }
                        categoryId = Integer.parseInt(strVal);
                    } catch (NumberFormatException e) {
                        // ignore
                    }
                }
            }
            if (partnerId != null) {

                String updateQuery = """
                            UPDATE botiq_partner_w
                            SET org_id = ?, partner_name = ?, partner_contact = ?,
                                partner_address = ?, partner_category_id = ?,
                                partner_category = ?, notes = ?, enabled = ?, updated_date = NOW()
                            WHERE partner_id = ?
                        """;

                jdbcTemplate.update(updateQuery,
                        orgId,
                        partnerName,
                        partnerContact,
                        partnerAddress,
                        categoryId,
                        category,
                        notes,
                        isEnabled,
                        partnerId);

                evictPartnersCache(orgId);

                Map<String, Object> ssePayload = new HashMap<>();
                ssePayload.put("event", "EDIT_PARTNER");
                ssePayload.put("orgId", orgId);
                ssePayload.put("partnerId", partnerId);
                ssePayload.put("partnerName", partnerName);
                sseService.sendToOrg(orgId, ssePayload);

                return ResponseEntity.ok(Map.of(
                        "status", "updated",
                        "partnerId", partnerId));

            } else {

                String insertQuery = """
                            INSERT INTO botiq_partner_w (
                                org_id, partner_name, partner_contact, partner_address,
                                partner_category_id, partner_category, notes, enabled, updated_date
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        """;

                jdbcTemplate.update(insertQuery,
                        orgId,
                        partnerName,
                        partnerContact,
                        partnerAddress,
                        categoryId,
                        category,
                        notes,
                        isEnabled);

                Integer newId = jdbcTemplate.queryForObject("SELECT LASTVAL()", Integer.class);

                evictPartnersCache(orgId);

                Map<String, Object> ssePayload = new HashMap<>();
                ssePayload.put("event", "ADD_PARTNER");
                ssePayload.put("orgId", orgId);
                ssePayload.put("partnerId", newId);
                ssePayload.put("partnerName", partnerName);
                sseService.sendToOrg(orgId, ssePayload);

                return ResponseEntity.ok(Map.of(
                        "status", "inserted",
                        "partnerId", newId));
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving partner");
        }
    }

    @PostMapping("/getChartSummary")
    public ResponseEntity<?> getChartSummary(HttpServletRequest request) {
        try {
            String authorization = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorization);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);
            if (users.isEmpty()) {
                return ResponseEntity.status(404).body("User not found");
            }
            Integer orgId = ((Number) users.get(0).get("org_id")).intValue();

            String sql = """
                    WITH week_series AS (
                      SELECT gs::date AS week_start, (gs + interval '6 days')::date AS week_end
                      FROM generate_series(
                        date_trunc('week', current_date) - interval '7 weeks',
                        date_trunc('week', current_date),
                        '1 week'::interval
                      ) gs
                    )
                    SELECT
                      ws.week_start,
                      ws.week_end,
                      'W' || to_char(ws.week_start, 'IW') AS week_number,
                      COALESCE(o.order_count, 0) AS order_count,
                      COALESCE(c.delivered_count, 0) AS delivered_count
                    FROM week_series ws
                    LEFT JOIN (
                      SELECT
                        date_trunc('week', order_date)::date AS week_start,
                        COUNT(*) AS order_count
                      FROM botiq_order_w
                      WHERE org_id = ?
                      GROUP BY week_start
                    ) o ON o.week_start = ws.week_start
                    LEFT JOIN (
                      SELECT
                        date_trunc('week', delivered_date)::date AS week_start,
                        COUNT(*) AS delivered_count
                      FROM botiq_order_w
                      WHERE org_id = ? AND order_status = 'Delivered'
                      GROUP BY week_start
                    ) c ON c.week_start = ws.week_start
                    ORDER BY ws.week_start;
                    """;

            List<Map<String, Object>> result = jdbcTemplate.queryForList(sql, orgId, orgId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error getting chart summary: " + e.getMessage());
        }
    }

    @PostMapping("/getDashboardData")
    public ResponseEntity<?> getDashboardData(HttpServletRequest httpRequest) {

        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);
            String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
            Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

            Integer orgId = (Integer) userInfo.get("org_id");

            String json = jdbcTemplate.queryForObject(
                    "SELECT get_full_dashboard(?)::text",
                    new Object[] { orgId },
                    String.class);

            Map<String, Object> response = mapper.readValue(json, Map.class);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error fetching dashboard data");
    }

    // @PostMapping("/newOrder")
    // public ResponseEntity<?> newOrder(@RequestBody Map<String, Object> payload,
    // HttpServletRequest request) {
    // try {

    // String authorizationHeader = request.getHeader("Authorization");
    // String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

    // String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id =
    // ?";
    // Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

    // Integer orgId = (Integer) userInfo.get("org_id");
    // String orgName = (String) userInfo.get("org_name");

    // ObjectMapper mapper = new ObjectMapper();
    // String payloadJson = mapper.writeValueAsString(payload);

    // String sql = "SELECT save_new_order(?::jsonb, ?, ?)";

    // Integer orderId = jdbcTemplate.queryForObject(
    // sql,
    // Integer.class,
    // payloadJson,
    // orgId,
    // orgName);

    // return ResponseEntity.ok(Map.of(
    // "status", "success",
    // "orderId", orderId));

    // } catch (Exception e) {
    // e.printStackTrace();
    // return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
    // .body("Error saving order");
    // }
    // }

    @GetMapping("/getMasterByType")
    public ResponseEntity<?> getMasterByType(
            @RequestParam String type,
            HttpServletRequest httpRequest) {
        try {

            type = type.trim().toUpperCase();

            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = jdbcTemplate.queryForObject(userSql, Integer.class, uid);

            if ("WORK_CATEGORY".equals(type) || "WORKCATEGORIES".equals(type)) {
                // Try reading from master_table first
                String query = """
                            SELECT DISTINCT ON (key_name) key_id, key_name
                            FROM master_table
                            WHERE (UPPER(master_type) = 'WORK_CATEGORY' OR UPPER(master_type) = 'WORKCATEGORIES')
                              AND org_id = ?
                            ORDER BY key_name, org_id DESC
                        """;
                List<Map<String, Object>> masterRows = jdbcTemplate.queryForList(query, orgId);
                if (!masterRows.isEmpty()) {
                    return ResponseEntity.ok(masterRows);
                }

                // Fallback to org_settings if empty
                String settingsSql = "SELECT work_categories FROM org_settings WHERE org_id = ? ORDER BY org_sett_id DESC LIMIT 1";
                List<Map<String, Object>> settingsRows = jdbcTemplate.queryForList(settingsSql, orgId);
                if (!settingsRows.isEmpty()) {
                    String wc = (String) settingsRows.get(0).get("work_categories");
                    if (wc != null && !wc.trim().isEmpty()) {
                        String[] categories = wc.split(",");
                        List<Map<String, Object>> result = new ArrayList<>();
                        for (int i = 0; i < categories.length; i++) {
                            String catName = categories[i].trim();
                            if (!catName.isEmpty()) {
                                Map<String, Object> item = new HashMap<>();
                                item.put("key_id", i + 1);
                                item.put("key_name", catName);
                                result.add(item);
                            }
                        }
                        System.out.println("Fetched work categories from org_settings fallback: " + result);
                        return ResponseEntity.ok(result);
                    }
                }

                // If still empty, query master_table with org_id = 0
                query = """
                            SELECT DISTINCT ON (key_name) key_id, key_name
                            FROM master_table
                            WHERE (UPPER(master_type) = 'WORK_CATEGORY' OR UPPER(master_type) = 'WORKCATEGORIES')
                              AND (org_id = ? OR org_id = 0)
                            ORDER BY key_name, org_id DESC
                        """;
                return ResponseEntity.ok(jdbcTemplate.queryForList(query, orgId));
            }

            if ("PARTNER_CATEGORY".equals(type) || "PARTNERCATEGORIES".equals(type)) {
                // Try reading from master_table first
                String query = """
                            SELECT DISTINCT ON (key_name) key_id, key_name
                            FROM master_table
                            WHERE (UPPER(master_type) = 'PARTNER_CATEGORY' OR UPPER(master_type) = 'PARTNERCATEGORIES')
                              AND org_id = ?
                            ORDER BY key_name, org_id DESC
                        """;
                List<Map<String, Object>> masterRows = jdbcTemplate.queryForList(query, orgId);
                if (!masterRows.isEmpty()) {
                    return ResponseEntity.ok(masterRows);
                }

                // Fallback to org_settings if empty
                String settingsSql = "SELECT partner_categories FROM org_settings WHERE org_id = ? ORDER BY org_sett_id DESC LIMIT 1";
                List<Map<String, Object>> settingsRows = jdbcTemplate.queryForList(settingsSql, orgId);
                if (!settingsRows.isEmpty()) {
                    String pc = (String) settingsRows.get(0).get("partner_categories");
                    if (pc != null && !pc.trim().isEmpty()) {
                        String[] categories = pc.split(",");
                        List<Map<String, Object>> result = new ArrayList<>();
                        for (int i = 0; i < categories.length; i++) {
                            String catName = categories[i].trim();
                            if (!catName.isEmpty()) {
                                Map<String, Object> item = new HashMap<>();
                                item.put("key_id", i + 1);
                                item.put("key_name", catName);
                                result.add(item);
                            }
                        }
                        System.out.println("Fetched partner categories from org_settings fallback: " + result);
                        return ResponseEntity.ok(result);
                    }
                }

                // If still empty, query master_table with org_id = 0
                query = """
                            SELECT DISTINCT ON (key_name) key_id, key_name
                            FROM master_table
                            WHERE (UPPER(master_type) = 'PARTNER_CATEGORY' OR UPPER(master_type) = 'PARTNERCATEGORIES')
                              AND (org_id = ? OR org_id = 0)
                            ORDER BY key_name, org_id DESC
                        """;
                return ResponseEntity.ok(jdbcTemplate.queryForList(query, orgId));
            }

            String query = """
                        SELECT DISTINCT ON (key_name) key_id, key_name
                        FROM master_table
                        WHERE UPPER(master_type) = UPPER(?)
                          AND (org_id = ? OR org_id = 0)
                        ORDER BY key_name, org_id DESC
                    """;

            List<Map<String, Object>> result = jdbcTemplate.queryForList(
                    query,
                    type,
                    orgId);

            System.out.println("MasterType: " + type + ", OrgId: " + orgId);
            System.out.println("Result: " + result);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching master data");
        }

    }

    @GetMapping("/getPartners")
    public ResponseEntity<?> getPartners(HttpServletRequest httpRequest) {
        try {

            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = jdbcTemplate.queryForObject(userSql, Integer.class, uid);

            String query = """
                    SELECT
                        partner_id,
                        partner_name,
                        partner_contact,
                        partner_address,
                        partner_category_id,
                        partner_category,
                        notes,
                        enabled
                    FROM botiq_partner_w
                    WHERE org_id = ?
                      AND deleted = false
                    ORDER BY partner_name
                    """;

            List<Map<String, Object>> partners = jdbcTemplate.queryForList(query, orgId);

            return ResponseEntity.ok(partners);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching partners");
        }
    }

    // @PostMapping("/saveFullOrder")
    // public ResponseEntity<?> saveAll(@RequestBody Map<String, Object> payload,
    // HttpServletRequest request) {
    // try {
    // String authorizationHeader = request.getHeader("Authorization");
    // String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

    // String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id =
    // ?";
    // Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

    // Integer orgId = (Integer) userInfo.get("org_id");
    // String orgName = (String) userInfo.get("org_name");

    // String sql = "SELECT save_job_orders(?::jsonb, ?, ?)";

    // Integer orderId = jdbcTemplate.queryForObject(
    // sql,
    // Integer.class,
    // new ObjectMapper().writeValueAsString(payload),
    // orgId,
    // orgName);

    // return ResponseEntity.ok(orderId);

    // } catch (Exception e) {
    // e.printStackTrace();
    // return ResponseEntity.status(500).body("Error saving order");
    // }
    // }

    @PostMapping("/saveOrder")
    public ResponseEntity<?> saveOrder(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();
            String orgName = principal.getOrgName();

            String sql = "SELECT save_order(?::jsonb, ?, ?)";

            Integer orderId = jdbcTemplate.queryForObject(
                    sql,
                    Integer.class,
                    new ObjectMapper().writeValueAsString(payload),
                    orgId,
                    orgName);

            if (orderId != null && orderId > 0) {
                notifyOrderStatusUpdate(orgId, orderId, null, "CREATED", null);

                try {
                    Map<String, Object> orderMap = (Map<String, Object>) payload.get("order");
                    boolean isUpdate = false;
                    String orderStatus = null;
                    if (orderMap != null) {
                        Object orderIdObj = orderMap.get("orderId") != null ? orderMap.get("orderId")
                                : orderMap.get("order_id");
                        if (orderIdObj != null) {
                            long idVal = ((Number) orderIdObj).longValue();
                            if (idVal > 0) {
                                isUpdate = true;
                            }
                        }
                        Object orderStatusObj = orderMap.get("orderStatus") != null ? orderMap.get("orderStatus")
                                : orderMap.get("order_status");
                        if (orderStatusObj != null) {
                            orderStatus = orderStatusObj.toString();
                        }
                    }

                    Map<String, Object> ssePayload = new HashMap<>();
//                    ssePayload.put("event", isUpdate ? "UPDATE_ORDER" : "CREATE_ORDER");
//                    ssePayload.put("orgId", orgId);
//                    ssePayload.put("orderId", orderId);
                    if (orderStatus != null) {
                        ssePayload.put("status", orderStatus);
                    }
                    sseService.sendToOrg(orgId, ssePayload);
                } catch (Exception ex) {
                    System.err.println("Failed to send SSE in saveOrder: " + ex.getMessage());
                }
            }

            return ResponseEntity.ok(orderId);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving order");
        }
    }

    @PostMapping("/getAllOrders")
    public ResponseEntity<?> getAllOrders(HttpServletRequest request) {

        System.out.println("get all orders.....");
        try {
            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();
            String orgName = principal.getOrgName();

            String sql = "SELECT \r\n" + //
                    "  o.*,\r\n" + //
                    "  c.customer_name,\r\n" + //
                    "  c.contact_number,\r\n" + //
                    "  c.customer_address,\r\n" + //
                    "  d.details_data\r\n" + //
                    "FROM botiq_order_w o\r\n" + //
                    "LEFT JOIN botiq_customer_w c \r\n" + //
                    "  ON o.customer_id = c.customer_id\r\n" + //
                    "LEFT JOIN LATERAL (\r\n" + //
                    "  SELECT details_data\r\n" + //
                    "  FROM botiq_order_docs_w\r\n" + //
                    "  WHERE order_id = o.order_id \r\n" + //
                    "    AND details_type = 2\r\n" + //
                    "  ORDER BY details_id\r\n" + //
                    "  LIMIT 1\r\n" + //
                    ") d ON true\r\n" + //
                    "WHERE o.org_id = ?";
            List<Map<String, Object>> orders = jdbcTemplate.queryForList(
                    sql,
                    orgId);
            // for (Map<String, Object> order : orders) {
            // System.out.println(order);
            // }

            return ResponseEntity.ok(orders);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving order");
        }
    }

    @PostMapping("/getOrderById")
    public ResponseEntity<?> getOrderById(@RequestBody Map<String, Object> payload, HttpServletRequest request) {

        Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
        if (orderIdObj == null) {
            return ResponseEntity.badRequest().body("order_id is required");
        }
        Long id = Long.valueOf(orderIdObj.toString());

        UserPrincipal principal = getUserPrincipal();
        String uid = principal.getFirebaseUid();
        Integer orgId = principal.getOrgId();

        String sql = "SELECT o.*, c.customer_name, c.contact_number, c.customer_address " +
                "FROM botiq_order_w o " +
                "LEFT JOIN botiq_customer_w c ON o.customer_id = c.customer_id " +
                "WHERE o.order_id = ? AND o.org_id = ?";

        try {
            Map<String, Object> order = jdbcTemplate.queryForMap(sql, id, orgId);
            System.out.println("DEBUG order map: " + order);

            String docsSql = "SELECT details_id, details_type, details_data FROM botiq_order_docs_w WHERE order_id = ?";
            List<Map<String, Object>> docs = jdbcTemplate.queryForList(docsSql, id);

            Map<String, List<Map<String, Object>>> details = new HashMap<>();
            details.put("measurements", new ArrayList<>());
            details.put("materials", new ArrayList<>());
            details.put("patterns", new ArrayList<>());
            details.put("audio", new ArrayList<>());
            details.put("handwrittenNotes", new ArrayList<>());

            for (Map<String, Object> d : docs) {
                int type = (Integer) d.get("details_type");
                String data = (String) d.get("details_data");
                Long detailsId = ((Number) d.get("details_id")).longValue();

                Map<String, Object> docMap = new HashMap<>();
                docMap.put("details_id", detailsId);
                docMap.put("details_data", data);

                if (type == 1)
                    details.get("measurements").add(docMap);
                if (type == 2)
                    details.get("materials").add(docMap);
                if (type == 3)
                    details.get("patterns").add(docMap);
                if (type == 4)
                    details.get("audio").add(docMap);
                if (type == 5)
                    details.get("handwrittenNotes").add(docMap);
            }

            String jobSql = "SELECT * FROM botiq_job_order_w WHERE order_id = ?";
            List<Map<String, Object>> jobOrders = jdbcTemplate.queryForList(jobSql, id);

            Map<String, Object> response = new HashMap<>();
            boolean hasJobOrder = jobOrders != null && !jobOrders.isEmpty();
            // ObjectMapper mapper = new ObjectMapper();

            for (Map<String, Object> job : jobOrders) {
                String detailsStr = (String) job.get("job_order_details");

                if (detailsStr != null && !detailsStr.isEmpty()) {
                    try {
                        Object parsed = mapper.readValue(detailsStr, Object.class);
                        job.put("job_order_details", parsed);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }

            String orderDetailsStr = (String) order.get("order_details");

            if (orderDetailsStr != null && !orderDetailsStr.isEmpty()) {
                try {
                    Object parsed = mapper.readValue(orderDetailsStr, Object.class);
                    order.put("order_details", parsed);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            order.put("has_job_order", hasJobOrder);
            response.put("order", order);

            Map<String, Object> customer = new HashMap<>();
            customer.put("name", order.get("customer_name"));
            customer.put("mobile", order.get("contact_number"));
            customer.put("place", order.get("customer_address"));
            customer.put("customerId", order.get("customer_id"));

            response.put("customer", customer);
            response.put("details", details);
            response.put("jobOrders", jobOrders);

            System.out.println(response);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }

    }

    @Transactional
    @PostMapping("/updateOrder")
    public ResponseEntity<?> updateOrder(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            System.out.println("update order");
            System.out.println("👉 orderDetails from payload: " + payload.get("orderDetails"));

            UserPrincipal principal = getUserPrincipal();
            String uid = principal.getFirebaseUid();
            Integer orgId = principal.getOrgId();
            String orgName = principal.getOrgName();

            // 📦 Extract payload
            Map<String, Object> customer = (Map<String, Object>) payload.get("customer");
            Map<String, Object> order = (Map<String, Object>) payload.get("order");
            List<?> orderDetails = (List<?>) payload.get("orderDetails");

            if (customer == null || order == null) {
                return ResponseEntity.badRequest().body("Invalid payload");
            }

            Integer customerId = (Integer) customer.get("customerId");
            Integer orderId = (Integer) order.get("order_id");

            if (customerId == null || orderId == null) {
                return ResponseEntity.badRequest().body("Missing IDs for update");
            }

            // 🧾 Customer fields
            String customerName = (String) customer.get("name");
            String mobile = (String) customer.get("mobile");
            String address = (String) customer.get("place");

            // 📊 Order fields
            String status = (String) order.get("orderStatus");
            Integer paymentStatus = (Integer) order.get("paymentStatus");
            Integer orderAmount = (Integer) order.get("orderAmount");
            Integer advanceAmount = (Integer) order.get("advanceAmount");
            Integer dueAmount = (Integer) order.get("dueAmount");
            Integer priority = (Integer) order.get("orderPriority");

            // 📅 Date handling
            String orderDateRaw = (String) order.get("orderDate");
            String dueDate = (String) order.get("dueDate");

            String orderDate = (orderDateRaw != null && orderDateRaw.contains("T"))
                    ? orderDateRaw.split("T")[0]
                    : orderDateRaw;

            // 🔁 Boolean handling (robust)
            boolean hasJobOrder = false;
            Object value = order.get("hasJobOrder");

            if (value instanceof Boolean) {
                hasJobOrder = (Boolean) value;
            } else if (value instanceof Integer) {
                hasJobOrder = ((Integer) value) == 1;
            }

            // 🧠 Convert orderDetails → JSON
            String orderDetailsJson = "[]";
            if (orderDetails != null) {
                orderDetailsJson = mapper.writeValueAsString(orderDetails);
            }

            // ================= CUSTOMER UPDATE =================
            String updateCustomerSql = """
                        UPDATE botiq_customer_w
                        SET
                          customer_name = ?,
                          contact_number = ?,
                          customer_address = ?,
                          org_id = ?,
                          org_name = ?,
                          enabled = ?,
                          deleted = ?,
                          updated_date = NOW()
                        WHERE customer_id = ?
                    """;

            jdbcTemplate.update(updateCustomerSql,
                    customerName,
                    mobile,
                    address,
                    orgId,
                    orgName,
                    true,
                    false,
                    customerId);

            // ================= ORDER UPDATE =================
            String updateOrderSql = """
                        UPDATE botiq_order_w
                        SET
                          org_id = ?,
                          customer_id = ?,
                          order_details = ?,
                          order_status = ?,
                          payment_status = ?,
                          order_amount = ?,
                          advance_amount = ?,
                          due_amount = ?,
                          order_date = ?::date,
                          due_date = ?::date,
                          has_job_order = ?,
                          order_priority = ?,
                          delivered_date = CASE
                            WHEN ? = 'Delivered' THEN COALESCE(delivered_date, CURRENT_DATE)
                            ELSE NULL
                          END,
                          updated_date = NOW()
                        WHERE order_id = ? AND org_id = ?
                    """;
            System.out.println("👉 JSON: " + orderDetailsJson);
            System.out.println("👉 Updating order with ID: " + orderId);
            jdbcTemplate.update(updateOrderSql,
                    orgId,
                    customerId,
                    orderDetailsJson,
                    status,
                    paymentStatus,
                    orderAmount,
                    advanceAmount,
                    dueAmount,
                    orderDate,
                    dueDate,
                    hasJobOrder,
                    priority,
                    status,
                    orderId,
                    orgId);

            // ================= UPDATE/SAVE DETAILS (DOCUMENTS) =================
            try {
                jdbcTemplate.update("DELETE FROM botiq_order_docs_w WHERE order_id = ? AND org_id = ?", orderId, orgId);

                Map<String, Object> details = (Map<String, Object>) payload.get("details");
                if (details != null) {
                    String insertDocSql = "INSERT INTO botiq_order_docs_w (order_id, org_id, details_type, details_data, updated_date) VALUES (?, ?, ?, ?, NOW())";

                    // Measurements (Type 1)
                    List<Map<String, Object>> measurements = (List<Map<String, Object>>) details.get("measurements");
                    if (measurements != null) {
                        for (Map<String, Object> doc : measurements) {
                            String data = (String) doc.get("base64");
                            if (data != null && !data.isEmpty()) {
                                jdbcTemplate.update(insertDocSql, orderId, orgId, 1, data);
                            }
                        }
                    }

                    // Materials (Type 2)
                    List<Map<String, Object>> materials = (List<Map<String, Object>>) details.get("materials");
                    if (materials != null) {
                        for (Map<String, Object> doc : materials) {
                            String data = (String) doc.get("base64");
                            if (data != null && !data.isEmpty()) {
                                jdbcTemplate.update(insertDocSql, orderId, orgId, 2, data);
                            }
                        }
                    }

                    // Patterns (Type 3)
                    List<Map<String, Object>> patterns = (List<Map<String, Object>>) details.get("patterns");
                    if (patterns != null) {
                        for (Map<String, Object> doc : patterns) {
                            String data = (String) doc.get("base64");
                            if (data != null && !data.isEmpty()) {
                                jdbcTemplate.update(insertDocSql, orderId, orgId, 3, data);
                            }
                        }
                    }

                    // Audio (Type 4)
                    List<Map<String, Object>> audioList = (List<Map<String, Object>>) details.get("audio");
                    if (audioList != null) {
                        for (Map<String, Object> doc : audioList) {
                            String data = (String) doc.get("base64");
                            if (data != null && !data.isEmpty()) {
                                jdbcTemplate.update(insertDocSql, orderId, orgId, 4, data);
                            }
                        }
                    }

                    // Handwritten Notes (Type 5)
                    List<Map<String, Object>> handwritten = (List<Map<String, Object>>) details.get("handwrittenNotes");
                    if (handwritten != null) {
                        for (Map<String, Object> doc : handwritten) {
                            String data = (String) doc.get("base64");
                            if (data != null && !data.isEmpty()) {
                                jdbcTemplate.update(insertDocSql, orderId, orgId, 5, data);
                            }
                        }
                    }
                }
            } catch (Exception ex) {
                System.err.println("Failed to update order documents: " + ex.getMessage());
                ex.printStackTrace();
            }

            String action = ("Delivered".equalsIgnoreCase(status) || "Completed".equalsIgnoreCase(status)) ? "COMPLETED"
                    : "UPDATED";
            notifyOrderStatusUpdate(orgId, orderId, status, action, null);

            try {
                Map<String, Object> ssePayload = new HashMap<>();
                ssePayload.put("event", "UPDATE_ORDER");
                ssePayload.put("orgId", orgId);
                ssePayload.put("orderId", orderId);
                if (status != null) {
                    ssePayload.put("status", status);
                }
                sseService.sendToOrg(orgId, ssePayload);
            } catch (Exception ex) {
                System.err.println("Failed to send SSE in updateOrder: " + ex.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "orderId", orderId));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error updating order");
        }
    }

    @GetMapping("/getJobOrdes")
    public ResponseEntity<?> getJobOrdes(HttpServletRequest request) {

        UserPrincipal principal = getUserPrincipal();
        String uid = principal.getFirebaseUid();
        Integer orgId = principal.getOrgId();

        String query = "SELECT \r\n" + //
                "  j.job_id,\r\n" + //
                "  j.org_id,\r\n" + //
                "  j.order_id,\r\n" + //
                "  j.customer_id,\r\n" + //
                "  j.partner_id,\r\n" + //
                "  j.job_order_details,\r\n" + //
                "  j.job_due_date,\r\n" + //
                "  j.job_priority,\r\n" + //
                "  j.job_order_status,\r\n" + //
                "  j.created_date,\r\n" + //
                "  j.updated_date,\r\n" + //
                "  j.updated_by,\r\n" + //
                "  p.partner_name,\r\n" + //
                "  p.partner_contact,\r\n" + //
                "  p.partner_address,\r\n" + //
                "  c.customer_name,\r\n" + //
                "  o.order_date,\r\n" + //
                "  (\r\n" + //
                "    SELECT details_data\r\n" + //
                "    FROM (\r\n" + //
                "      SELECT \r\n" + //
                "        d.details_data,\r\n" + //
                "        ROW_NUMBER() OVER (PARTITION BY d.details_id ORDER BY d.details_id) AS slno\r\n" + //
                "      FROM botiq_order_docs_w d\r\n" + //
                "      WHERE d.order_id = j.order_id \r\n" + //
                "        AND d.details_type = 2\r\n" + //
                "    ) sub\r\n" + //
                "    WHERE slno = 1\r\n" + //
                "    LIMIT 1\r\n" + //
                "  ) AS details_data\r\n" + //
                "FROM botiq_job_order_w j\r\n" + //
                "LEFT JOIN botiq_partner_w p ON j.partner_id = p.partner_id\r\n" + //
                "LEFT JOIN botiq_customer_w c ON j.customer_id = c.customer_id\r\n" + //
                "LEFT JOIN botiq_order_w o ON j.order_id = o.order_id\r\n" + //
                "WHERE j.org_id = ?";

        List<Map<String, Object>> order = jdbcTemplate.queryForList(query, orgId);
        System.out.println("fetched: " + order.size());
        return ResponseEntity.ok(order);

    }
}
