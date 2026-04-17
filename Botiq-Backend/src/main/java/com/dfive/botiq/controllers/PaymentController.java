package com.dfive.botiq.controllers;

import java.util.HashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Hex;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.exceptions.UnauthorizedException;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.util.FirebaseUtils;
import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

   private final String RAZORPAY_KEY = "rzp_test_fvYk7cIko1ynL6";
   private final String RAZORPAY_SECRET = "F5Po3uKRHDXwv3KFrMYIzp1k";

    // private final String RAZORPAY_KEY = "rzp_live_uPqzEKyYdZzm7e";
    // private final String RAZORPAY_SECRET = "17kpnUcAZsD7PNsc0Std1s9N";
@PostMapping("/createOrder")
public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> payload, HttpServletRequest httpRequest) {
    try {
        String authorizationHeader = httpRequest.getHeader("Authorization");
        String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            Integer orgIdfromDb = jdbcTemplate.queryForObject(
                "SELECT org_id FROM org_user WHERE firebase_id = ?",
                Integer.class,
                uid
            );

    if (orgIdfromDb == null) {
        throw new UnauthorizedException("Access denied: user is not associated with any organization.");
    }
        String userSql = "SELECT org_id, user_id FROM org_user WHERE firebase_id = ?";
        Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);
  

     String paymentInfo  =  (String) payload.get("upgrade");
 

        Integer orgId = (Integer) userInfo.get("org_id");
        Integer userId = (Integer) userInfo.get("user_id");

        Integer planTypeId = Integer.parseInt(payload.get("plan_type_id").toString());

        String planSql = "SELECT plan_price, plan_type FROM botiq_plan_master WHERE plan_type_id = ?";
        Map<String, Object> plan = jdbcTemplate.queryForMap(planSql, planTypeId);

        Integer planPrice = ((Number) plan.get("plan_price")).intValue();
        String planType = (String) plan.get("plan_type");


        Integer discountAmt = 0;

//get_actual_price(_orgid int, _plantype_id int, _isupgrade boolean) - return {"credit_used": 0, "actual_price": 2000}


        // if ("YES".equalsIgnoreCase(paymentInfo)) {
        //     String discountSql = """
        //         SELECT 
        //         b.plan_price - (b.plan_price / 10)::int * ((current_date - b.plan_start_date) / 30)::int AS discount_amt
        //         FROM 
        //         organization o
        //         JOIN botiq_org_plan b ON b.org_id = o.org_id AND o.plan_id = b.plan_id
        //         WHERE 
        //         o.org_id = ?
        //     """;

        //     Map<String, Object> discountMap = jdbcTemplate.queryForMap(discountSql, orgIdfromDb);
        //     if (discountMap != null && discountMap.get("discount_amt") != null) {
        //         discountAmt = ((Number) discountMap.get("discount_amt")).intValue();
        //     }
        // }

        // can use dir

        // Integer finalAmount;
        // if ("YES".equalsIgnoreCase(paymentInfo) && discountAmt > 0) {
        //     finalAmount = planPrice - discountAmt;
        //     if (finalAmount < 0) finalAmount = 0;
        // } else {
        //     finalAmount = planPrice;
        // }

        
            Map<String, Object> result = jdbcTemplate.queryForMap(
                "SELECT * FROM get_actual_price(?, ?, ?)",
                orgId, planTypeId, paymentInfo
            );

            Integer finalAmount = (Integer) result.get("actual_price");
            Integer creditsUsed = (Integer) result.get("credits_used");


        Integer amountInPaise = finalAmount * 100;
        RazorpayClient razorpay = new RazorpayClient(RAZORPAY_KEY, RAZORPAY_SECRET);

        JSONObject options = new JSONObject();
        options.put("amount", amountInPaise); 
        options.put("currency", "INR");
        options.put("receipt", "botiq_" + System.currentTimeMillis());
        options.put("payment_capture", 1);

        JSONObject notes = new JSONObject();
        notes.put("org_id", orgId.toString());
        notes.put("plan_type", planType);
        options.put("notes", notes);

        Order order = razorpay.orders.create(options);
        String razorpayOrderId = order.get("id");

    String insertSql = """
                        INSERT INTO botiq_payments (
                            org_id, user_id, razorpay_order_id, amount_in_paise,
                            plan_type_id, plan_type, status,upgrade,credits_used
                        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING',?, ?)
                    """;


        jdbcTemplate.update(insertSql, orgId, userId, razorpayOrderId, amountInPaise, planTypeId, planType,
        paymentInfo != null ? paymentInfo : "NO",creditsUsed);

        return ResponseEntity.ok(Map.of(
            "order_id", razorpayOrderId,
            "amount", amountInPaise,
            "currency", "INR",
            "plan_type", planType
        ));

    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", "Order creation failed"));
    }
}

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> payload,
                                           HttpServletRequest httpRequest) {
        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

                Integer orgIdfromDb = jdbcTemplate.queryForObject(
                "SELECT org_id FROM org_user WHERE firebase_id = ?",
                Integer.class,
                uid
            );

            if (orgIdfromDb == null) {
                throw new UnauthorizedException("Access denied: user is not associated with any organization.");
            }
            String razorpayOrderId = payload.get("razorpay_order_id");
            String razorpayPaymentId = payload.get("razorpay_payment_id");
            String razorpaySignature = payload.get("razorpay_signature");

            String data = razorpayOrderId + "|" + razorpayPaymentId;
            String generatedSignature = hmacSHA256(data, RAZORPAY_SECRET);

            if (!generatedSignature.equals(razorpaySignature)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Signature mismatch"));
            }

            String userSql = "SELECT org_id, user_id FROM org_user WHERE firebase_id = ?";
            Map<String, Object> userInfo = jdbcTemplate.queryForMap(userSql, uid);
            Integer orgId = (Integer) userInfo.get("org_id");
            Integer userId = (Integer) userInfo.get("user_id");

            Integer paymentId = jdbcTemplate.queryForObject(
                "SELECT payment_id FROM botiq_payments WHERE razorpay_order_id = ? AND org_id = ?",
                Integer.class, razorpayOrderId, orgId
            );

            RazorpayClient razorpay = new RazorpayClient(RAZORPAY_KEY, RAZORPAY_SECRET);
            Payment payment = razorpay.payments.fetch(razorpayPaymentId);
            String status = payment.get("status"); 

            if (!"captured".equalsIgnoreCase(status)) {
                jdbcTemplate.update(
                    "UPDATE botiq_payments SET status = ?, verified_at = now() WHERE payment_id = ?",
                    "FAILED", paymentId
                );
                return ResponseEntity.ok(Map.of("success", false, "message", "Payment failed", "status", status));
            }

            String result = jdbcTemplate.queryForObject(
                "SELECT process_payment(?, ?, ?, ?, ?)::text",
                String.class,
                paymentId, uid, razorpayOrderId, razorpayPaymentId, "SUCCESS"
            );

            if ("Success".equalsIgnoreCase(result)) {
            // Fetch and return the updated plan
            Map<String, Object> planInfo = jdbcTemplate.queryForMap(
                "SELECT plan_id, org_id, user_id, plan_type, plan_start_date, plan_end_date, plan_type_id ,monthly_order_limit " +
                "FROM botiq_org_plan WHERE org_id = ? ORDER BY plan_start_date DESC LIMIT 1", orgId
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payment verified and plan activated",
                "plan_info", planInfo
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Payment succeeded, but plan activation failed. Please contact support@botiqcloud.com.",
                "status", result
            ));
        }

                
            
            // if ("Success".equalsIgnoreCase(result)) {
            //     return ResponseEntity.ok(Map.of("success", true, "message", "Payment verified and plan activated"));
            // } else {
            //     return ResponseEntity.ok(Map.of(
            //         "success", false,
            //         "message", "Payment succeeded, but plan activation failed. Please contact support@botiqcloud.com.",
            //         "status", result
            //     ));
            // }

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                Map.of("success", false, "message", "Payment verified but system error occurred. Please contact support@botiqcloud.com.")
            );
        }
    }

    private String hmacSHA256(String data, String secret) throws Exception {
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secret_key = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        return Hex.encodeHexString(sha256_HMAC.doFinal(data.getBytes()));
    }


}