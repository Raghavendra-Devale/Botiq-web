package com.dfive.botiq.controllers;

import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.util.FirebaseUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/web")
public class WebController {
    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    OrgUserRepository orgUserRepository;

    ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/checkUserExists")
    public ResponseEntity<?> checkUserExists(@RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            List<Map<String, Object>> users = jdbcTemplate.queryForList(userSql, uid);

            Integer orgId = ((Number) users.get(0).get("org_id")).intValue();

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

        if (payload.get("id") != null) {
            id = ((Number) payload.get("id")).intValue();
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
                return ResponseEntity.status(404)
                        .body("Partner not found");
            }

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
                return ResponseEntity.status(404).body("Settings not found for org_id: " + orgId);
            }

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
                            o.referral_code AS referralCode,
                            s.org_logo AS orgLogo,
                            s.optional_settings AS optionalSettings,
                            s.work_categories,
                            s.partner_categories
                        FROM organization o
                        INNER JOIN org_user u ON o.org_id = u.org_id
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

            List<Map<String, Object>> profileInfo = jdbcTemplate.queryForList(profileSql, orgId);

            if (profileInfo.isEmpty()) {
                return ResponseEntity.status(404).body("Profile not found");
            }

            Map<String, Object> profile = profileInfo.get(0);

            Map<String, Object> response = new HashMap<>();
            response.put("org_id", userInfo.get("org_id"));
            response.put("org_name", userInfo.get("org_name"));
            response.put("owner_name", profile.get("owner_name"));
            response.put("org_address", profile.get("org_address"));
            response.put("referral_code", profile.get("referralCode"));
            response.put("org_logo", profile.get("orgLogo"));
            response.put("email_id", profile.get("email_id"));
            response.put("mobile_number", profile.get("mobile_number"));
            response.put("optional_settings", profile.get("optionalSettings"));
            response.put("work_categories", profile.get("work_categories"));
            response.put("partner_categories", profile.get("partner_categories"));
            System.out.println(profile.get("work_categories"));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching basic details");
        }
    }

    @GetMapping("/getPartnerById/{id}")
    public ResponseEntity<?> getPartnerById(@PathVariable Integer id,
            HttpServletRequest request) {

        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id FROM org_user WHERE firebase_id = ?";
            Integer orgId = jdbcTemplate.queryForObject(userSql, Integer.class, uid);

            String query = """
                    SELECT partner_id, partner_name, partner_contact,
                           partner_address, partner_category_id,
                           partner_category, notes, enabled
                    FROM botiq_partner_w
                    WHERE partner_id = ? AND org_id = ?
                    """;

            Map<String, Object> partner = jdbcTemplate.queryForMap(query, id, orgId);
            System.out.println("Partner: " + partner);
            return ResponseEntity.ok(partner);

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

            Integer partnerId = (Integer) payload.get("partnerId");
            String partnerName = (String) payload.get("partnerName");
            String partnerContact = (String) payload.get("partnerContact");
            String partnerAddress = (String) payload.get("partnerAddress");
            // Integer categoryId = (Integer) payload.get("partnerCategoryId");
            String category = (String) payload.get("partnerCategory");
            String notes = (String) payload.get("notes");
            Object enabledObj = payload.get("enabled");
            boolean isEnabled = enabledObj != null && (Boolean) enabledObj;
            Integer categoryId = null;
            if (payload.get("partnerCategoryId") != null) {
                categoryId = ((Number) payload.get("partnerCategoryId")).intValue();
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
                            partner_category,
                            partner_contact,
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

    @PostMapping("/save_order")
    public ResponseEntity<?> saveOrder(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
            Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

            Integer orgId = (Integer) userInfo.get("org_id");
            String orgName = (String) userInfo.get("org_name");

            String sql = "SELECT save_order(?::jsonb, ?, ?)";

            Integer orderId = jdbcTemplate.queryForObject(
                    sql,
                    Integer.class,
                    new ObjectMapper().writeValueAsString(payload),
                    orgId,
                    orgName);

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
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
            Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

            Integer orgId = (Integer) userInfo.get("org_id");
            String orgName = (String) userInfo.get("org_name");

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
                    "  FROM botiq_order_docs\r\n" + //
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

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id, HttpServletRequest request) {

        String authorizationHeader = request.getHeader("Authorization");
        String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

        String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
        Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);
        Integer orgId = (Integer) userInfo.get("org_id");

        String sql = "SELECT o.*, c.customer_name, c.contact_number, c.customer_address " +
                "FROM botiq_order_w o " +
                "LEFT JOIN botiq_customer_w c ON o.customer_id = c.customer_id " +
                "WHERE o.order_id = ? AND o.org_id = ?";

        try {
            Map<String, Object> order = jdbcTemplate.queryForMap(sql, id, orgId);

            String docsSql = "SELECT details_type, details_data FROM botiq_order_docs_w WHERE order_id = ?";
            List<Map<String, Object>> docs = jdbcTemplate.queryForList(docsSql, id);

            Map<String, List<String>> details = new HashMap<>();
            details.put("measurements", new ArrayList<>());
            details.put("materials", new ArrayList<>());
            details.put("patterns", new ArrayList<>());

            for (Map<String, Object> d : docs) {
                int type = (Integer) d.get("details_type");
                String data = (String) d.get("details_data");

                if (type == 1)
                    details.get("measurements").add(data);
                if (type == 2)
                    details.get("materials").add(data);
                if (type == 3)
                    details.get("patterns").add(data);
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

            // 🔐 Auth
            String authorizationHeader = request.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
            Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

            Integer orgId = (Integer) userInfo.get("org_id");
            String orgName = (String) userInfo.get("org_name");

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
                    orgId // ✅ IMPORTANT
            );
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

        String authorizationHeader = request.getHeader("Authorization");
        String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

        String userSql = "SELECT org_id, org_name FROM org_user WHERE firebase_id = ?";
        Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);

        Integer orgId = (Integer) userInfo.get("org_id");

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
