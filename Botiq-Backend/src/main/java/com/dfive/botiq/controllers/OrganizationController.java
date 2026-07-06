package com.dfive.botiq.controllers;

import org.springframework.web.bind.annotation.*;
import com.dfive.botiq.dto.CreateOrgUserDto;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.entities.Organization;
import com.dfive.botiq.entities.OtpTransaction;
import com.dfive.botiq.exceptions.UnauthorizedException;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.repositories.OrganizationRepository;
import com.dfive.botiq.repositories.OtpTransactionRepository;
import com.dfive.botiq.services.EmailService;
import com.dfive.botiq.util.FirebaseUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/organization")
public class OrganizationController {

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private OrgUserRepository orgUserRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private OtpTransactionRepository otpTransactionRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping("/check-user")
    public ResponseEntity<Map<String, Object>> checkUserExists(@RequestBody Map<String, String> payload) {
        System.out.println("Received payload: " + payload);

        String phoneNumber = payload.get("phoneNumber");
        String deviceId = payload.get("deviceId");

        System.out.println("Phone Number: " + phoneNumber);
        System.out.println("Device ID: " + deviceId);

        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "phoneNumber required"));
        }

        Optional<OrgUser> userOpt = orgUserRepository.findByMobileNumber(phoneNumber);

        Map<String, Object> response = new HashMap<>();

        if (userOpt.isPresent()) {
            OrgUser user = userOpt.get();
            response.put("phoneNumber", phoneNumber);
            response.put("ownerName", user.getFirstName());

            // Admin created user, Firebase account not yet linked
            if (user.getFirebaseId() == null || user.getFirebaseId().isBlank()) {
                response.put("status", 6);
                response.put("message", "First time login Firebase account needs to be linked.");
                return ResponseEntity.ok(response);
            }

            String existingDeviceId = user.getDeviceId();
            if (deviceId != null && !deviceId.trim().isEmpty()) {
                if (existingDeviceId != null && deviceId.equals(existingDeviceId)) {
                    response.put("status", 2);
                    response.put("message", "User verified on the same phone.");
                } else {
                    response.put("status", 3);
                    response.put("message", "User has changed phone. Cannot continue on this device.");
                }
            } else {
                if (existingDeviceId != null) {
                    response.put("status", 4);
                    response.put("message", "User is on another phone. Warn and switch if confirmed.");
                } else {
                    response.put("status", 5);
                    response.put("message", "User exists but no local database found.");
                }
            }
        } else {
            response.put("status", 1);
            response.put("message", "New User.");
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/link-firebase")
    public ResponseEntity<?> linkFirebaseAccount(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid authorization header"));
        }

        try {
            String token = authHeader.replace("Bearer ", "");
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
            String firebaseUid = decodedToken.getUid();
            String firebasePhone = (String) decodedToken.getClaims().get("phone_number");

            if (firebasePhone == null || firebasePhone.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Phone number not found in Firebase token"));
            }

            String cleanedPhone = firebasePhone.replaceAll("\\D", "");
            if (cleanedPhone.length() >= 10) {
                cleanedPhone = cleanedPhone.substring(cleanedPhone.length() - 10);
            }

            Optional<OrgUser> userOpt = orgUserRepository.findByMobileNumber(cleanedPhone);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found with phone number " + cleanedPhone));
            }

            OrgUser user = userOpt.get();

            // Check if user already has a firebase ID
            if (user.getFirebaseId() != null && !user.getFirebaseId().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Firebase account already linked for this user"));
            }

            user.setFirebaseId(firebaseUid);
            orgUserRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Firebase account linked successfully");
            return ResponseEntity.ok(response);

        } catch (FirebaseAuthException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Firebase token: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An error occurred: " + e.getMessage()));
        }
    }

    // @PostMapping("/check-user")
    // public ResponseEntity<Map<String, String>> checkUserExists(@RequestBody
    // Map<String, String> payload) {
    // System.out.println("Received payload: " + payload);

    // String phoneNumber = payload.get("phoneNumber");
    // String deviceId = payload.get("deviceId");

    // System.out.println("Phone Number: " + phoneNumber);
    // System.out.println("Device ID: " + deviceId);

    // if (phoneNumber == null) {
    // return ResponseEntity.badRequest().body(Map.of("error", "phoneNumber
    // required"));
    // }

    // Optional<OrgUser> user = orgUserRepository.findByMobileNumber(phoneNumber);

    // if (user.isPresent()) {
    // Map<String, String> response = new HashMap<>();
    // response.put("phoneNumber", phoneNumber);
    // response.put("deviceId", deviceId);
    // return ResponseEntity.ok(response);
    // }

    // return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User
    // not found"));
    // }

    // @PostMapping("/check-user")
    // public ResponseEntity<Map<String, String>> checkUserExists(@RequestBody
    // Map<String, String> payload) {
    // System.out.println(payload.toString());
    // String phoneNumber = payload.get("phoneNumber");
    // System.out.println(phoneNumber);
    // if (orgUserRepository.existsByMobileNumber(phoneNumber)) {
    // Map<String, String> response = new HashMap<>();
    // response.put("phoneNumber", phoneNumber);
    // return ResponseEntity.ok(response);
    // }
    // return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
    // }

    // @PostMapping("/createUser")
    // public ResponseEntity<Map<String, Object>> createUser(@RequestBody
    // CreateOrgUserDto requestDto) {
    // Map<String, Object> response = new HashMap<>();

    // try {
    // if (requestDto.getMobileNumber() == null ||
    // requestDto.getMobileNumber().isEmpty()) {
    // response.put("success", false);
    // response.put("message", "Mobile number cannot be null or empty.");
    // return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    // }

    // Optional<Organization> existingOrgByMobile =
    // organizationRepository.findByMobileNumber(requestDto.getMobileNumber());

    // if (existingOrgByMobile.isPresent()) {
    // Organization existingOrganization = existingOrgByMobile.get();

    // response.put("success", true);
    // response.put("message", "Existing organization details returned.");
    // response.put("organizationId", existingOrganization.getOrgId());
    // response.put("orgName", existingOrganization.getOrgName());
    // response.put("ownerName", existingOrganization.getOwnerName());
    // response.put("mobileNumber", existingOrganization.getMobileNumber());
    // response.put("orgAddress", existingOrganization.getOrgAddress());
    // response.put("supportPlan", existingOrganization.getSupportPlan());

    // return ResponseEntity.ok(response);
    // }

    // if (requestDto.getOrgName() == null || requestDto.getOrgName().isEmpty()) {
    // response.put("success", false);
    // response.put("message", "Organization name cannot be null or empty when
    // creating a new organization.");
    // return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    // }

    // Organization organization = new Organization();
    // organization.setOrgName(requestDto.getOrgName());
    // organization.setMobileNumber(requestDto.getMobileNumber());
    // organization.setOwnerName(requestDto.getOwnerName());
    // organization.setEnabled(true);
    // organization.setDeleted(false);
    // organization.setOrgAddress(requestDto.getOrgAddress());
    // organization.setSupportPlan("Free Plan");

    // organization = organizationRepository.save(organization);

    // OrgUser orgUser = new OrgUser();
    // orgUser.setOrgId(organization.getOrgId());
    // orgUser.setEnabled(true);
    // orgUser.setDeleted(false);
    // orgUser.setOrgName(organization.getOrgName());
    // orgUser.setUserRole("OWNER");
    // orgUser.setEmailId(requestDto.getEmailId());
    // orgUser.setMobileNumber(organization.getMobileNumber());
    // orgUser.setDeviceId(requestDto.getDeviceId());
    // orgUser.setCreatedDate(new Timestamp(System.currentTimeMillis()));

    // orgUserRepository.save(orgUser);

    // response.put("success", true);
    // response.put("message", "New Organization created successfully.");
    // response.put("organizationId", organization.getOrgId());
    // response.put("orgName", organization.getOrgName());
    // response.put("ownerName", organization.getOwnerName());
    // response.put("mobileNumber", organization.getMobileNumber());
    // response.put("orgAddress", organization.getOrgAddress());
    // response.put("supportPlan", organization.getSupportPlan());

    // return ResponseEntity.ok(response);

    // } catch (Exception e) {
    // e.printStackTrace();
    // response.put("success", false);
    // response.put("message", "An unexpected error occurred.");
    // return
    // ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    // }
    // }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerUser(
            @RequestBody CreateOrgUserDto requestDto, HttpServletRequest httpRequest) {

        Map<String, Object> response = new HashMap<>();

        try {
            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            Optional<OrgUser> existingUserByMobile = orgUserRepository
                    .findByMobileNumber(requestDto.getMobileNumber().trim());

            System.out.println("Checking for existing user with mobile number: " + requestDto.getMobileNumber());

            if (existingUserByMobile.isPresent()) {
                OrgUser orgUser = existingUserByMobile.get();
                Optional<Organization> organizationOpt = organizationRepository.findById(orgUser.getOrgId());
                if (!organizationOpt.isPresent()) {
                    response.put("success", false);
                    response.put("message", "Organization details not found for the user.");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                }

                Organization organization = organizationOpt.get();
                if (requestDto.getDeviceId() == null || requestDto.getDeviceId().trim().isEmpty()) {
                    response.put("success", true);
                    response.put("message", "Existing organization and user details returned.");
                    response.put("orgId", organization.getOrgId());
                    response.put("orgName", organization.getOrgName());
                    response.put("ownerName", organization.getOwnerName());
                    response.put("mobileNumber", organization.getMobileNumber());
                    response.put("orgAddress", organization.getOrgAddress());
                    response.put("planStartDate", organization.getPlanStartDate());
                    response.put("planEndDate", organization.getPlanEndDate());
                    response.put("planId", organization.getPlanId());
                    response.put("planType", organization.getPlanType());
                    response.put("planTypeId", organization.getPlanTypeId());
                    response.put("deviceId", orgUser.getDeviceId());
                    response.put("role", orgUser.getUserRole());
                    response.put("emailId", orgUser.getEmailId());
                    response.put("emailVerified", orgUser.getEmailVerified());
                    response.put("referralCode", organization.getReferralCode());
                    return ResponseEntity.ok(response);
                }

                // If Device Id is sent, checking if it matches
                if (requestDto.getDeviceId().equals(orgUser.getDeviceId())) {
                    System.out.println(" Device ID matches. Returning existing user details.");
                    response.put("success", true);
                    response.put("message", "Existing organization and user details returned.");
                    response.put("orgId", organization.getOrgId());
                    response.put("orgName", organization.getOrgName());
                    response.put("ownerName", organization.getOwnerName());
                    response.put("mobileNumber", organization.getMobileNumber());
                    response.put("orgAddress", organization.getOrgAddress());
                    response.put("planStartDate", organization.getPlanStartDate());
                    response.put("planEndDate", organization.getPlanEndDate());
                    response.put("planId", organization.getPlanId());
                    response.put("planType", organization.getPlanType());
                    response.put("planTypeId", organization.getPlanTypeId());
                    response.put("monthlyOrderLimit", organization.getMonthlyOrderLimit());
                    response.put("referralCode", organization.getReferralCode());
                    response.put("deviceId", orgUser.getDeviceId());
                    response.put("role", orgUser.getUserRole());
                    response.put("emailId", orgUser.getEmailId());
                    response.put("emailVerified", orgUser.getEmailVerified());
                    return ResponseEntity.ok(response);
                } else {
                    System.out.println("Device ID mismatch. Updating device ID.");
                    orgUserRepository.save(orgUser);
                    // Updating Firebase claims
                    Map<String, Object> claims = new HashMap<>();
                    claims.put("role", orgUser.getUserRole());
                    claims.put("orgId", organization.getOrgId());
                    claims.put("userId", orgUser.getUserId());
                    claims.put("deviceId", requestDto.getDeviceId());
                    FirebaseAuth.getInstance().setCustomUserClaims(uid, claims);
                    FirebaseAuth.getInstance().revokeRefreshTokens(uid);

                    response.put("success", true);
                    response.put("message", "Device ID updated successfully.");
                    response.put("orgId", organization.getOrgId());
                    response.put("userId", orgUser.getUserId());
                    response.put("orgName", organization.getOrgName());
                    response.put("ownerName", organization.getOwnerName());
                    response.put("mobileNumber", organization.getMobileNumber());
                    response.put("orgAddress", organization.getOrgAddress());
                    response.put("planStartDate", organization.getPlanStartDate());
                    response.put("planEndDate", organization.getPlanEndDate());
                    response.put("planId", organization.getPlanId());
                    response.put("planType", organization.getPlanType());
                    response.put("planTypeId", organization.getPlanTypeId());
                    response.put("monthlyOrderLimit", organization.getMonthlyOrderLimit());
                    response.put("deviceId", orgUser.getDeviceId());
                    response.put("role", orgUser.getUserRole());
                    response.put("emailId", orgUser.getEmailId());
                    response.put("emailVerified", orgUser.getEmailVerified());
                    response.put("referralCode", organization.getReferralCode());
                    return ResponseEntity.ok(response);
                }
            }

            System.out.println(" No existing user found. Proceeding with new registration.");

            if (requestDto.getOrgName() == null || requestDto.getOrgName().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Organization name cannot be null or empty for a new registration.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Create New Organization
            Organization organization = new Organization();
            organization.setOrgName(requestDto.getOrgName());
            organization.setMobileNumber(requestDto.getMobileNumber());
            organization.setOwnerName(requestDto.getOwnerName());
            organization.setEnabled(true);
            organization.setDeleted(false);
            organization.setOrgAddress(requestDto.getOrgAddress());
            LocalDate startDate = LocalDate.now();
            LocalDate endDate = startDate.plusDays(90);
            organization.setPlanStartDate(startDate);
            organization.setPlanEndDate(endDate);
            organization.setPlanId(0);
            organization.setPlanType("FREE");
            organization.setPlanTypeId(1);
            organization.setMonthlyOrderLimit(20);
            organization.setReferredBy(requestDto.getReferredBy());
            organization = organizationRepository.save(organization);

            String ownerName = requestDto.getOwnerName();
            String firstFour = ownerName != null && ownerName.length() >= 4
                    ? ownerName.substring(0, 4)
                    : ownerName;
            String referralCode = firstFour.toUpperCase() + organization.getOrgId();
            organization.setReferralCode(referralCode);
            organization = organizationRepository.save(organization);

            // Create New Org User
            OrgUser orgUser = new OrgUser();
            orgUser.setOrgId(organization.getOrgId());
            orgUser.setEnabled(true);
            orgUser.setDeleted(false);
            orgUser.setFirstName(organization.getOwnerName());
            orgUser.setOrgName(organization.getOrgName());
            orgUser.setUserRole("OWNER");
            orgUser.setEmailId(requestDto.getEmailId());
            orgUser.setMobileNumber(organization.getMobileNumber());
            orgUser.setCreatedDate(new Timestamp(System.currentTimeMillis()));
            orgUser.setFirebaseId(uid);

            // Generate & Set New Device ID
            String uniqueDeviceId = UUID.randomUUID().toString();
            orgUser.setDeviceId(uniqueDeviceId);
            orgUserRepository.save(orgUser);

            System.out.println(organization.getOrgId());
            System.out.println(orgUser.getUserRole());

            setUserclaims(uid, orgUser);

            // if (!existingUserByMobile.isPresent()) {
            // BotiqOrgPlan plan = new BotiqOrgPlan();
            // plan.setOrgId(organization.getOrgId());
            // plan.setUserId(orgUser.getUserId());
            // planRepository.save(plan);
            // }
            if (!existingUserByMobile.isPresent()) {
                String insertSql = "INSERT INTO botiq_user_status (" +
                        "org_id, user_id, minimum_version, version_to_update, logout, clearlocaldata, " +
                        "disable_user, reload_master, created_at, updated_at, user_ipaddress) " +
                        "VALUES (?, ?, NULL, NULL, false, false, false, false, NOW(), NOW(), NULL)";

                jdbcTemplate.update(insertSql,
                        organization.getOrgId(),
                        orgUser.getUserId());
            }

            response.put("success", true);
            response.put("message", "New organization and user created successfully.");
            response.put("orgId", organization.getOrgId());
            response.put("orgName", organization.getOrgName());
            response.put("userId", orgUser.getUserId());
            response.put("ownerName", organization.getOwnerName());
            response.put("mobileNumber", organization.getMobileNumber());
            response.put("orgAddress", organization.getOrgAddress());
            response.put("planStartDate", organization.getPlanStartDate());
            response.put("planEndDate", organization.getPlanEndDate());
            response.put("planId", organization.getPlanId());
            response.put("planType", organization.getPlanType());
            response.put("planTypeId", organization.getPlanTypeId());
            response.put("monthlyOrderLimit", organization.getMonthlyOrderLimit());
            response.put("emailId", orgUser.getEmailId());
            response.put("emailVerified", orgUser.getEmailVerified());
            response.put("deviceId", uniqueDeviceId);
            response.put("role", orgUser.getUserRole());
            response.put("referralCode", organization.getReferralCode());

            return ResponseEntity.ok(response);

        } catch (FirebaseAuthException e) {
            response.put("success", false);
            response.put("message", "Firebase Authentication Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "An unexpected error occurred.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private void setUserclaims(String uid, OrgUser orgUser) {
        Map<String, Object> claims = new HashMap<>();
        try {
            claims.put("role", orgUser.getUserRole());
            claims.put("orgId", orgUser.getOrgId());
            claims.put("orgUserId", orgUser.getUserId());
            claims.put("deviceId", orgUser.getDeviceId());
            Optional<Organization> userOrg = organizationRepository.findById(orgUser.getOrgId());
            claims.put("plan", userOrg.get().getPlanType());

            FirebaseAuth.getInstance().setCustomUserClaims(uid, claims);
        } catch (FirebaseAuthException e) {
            e.printStackTrace();
        }
    }

    @PostMapping("/send-email-otp")
    public ResponseEntity<Map<String, String>> sendEmailOtp(
            @RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String mobileNumber = request.get("mobileNumber");
        String authorizationHeader = httpRequest.getHeader("Authorization");

        String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

        Integer orgId = jdbcTemplate.queryForObject(
                "SELECT org_id FROM org_user WHERE firebase_id = ?",
                Integer.class,
                uid);

        if (orgId == null) {
            throw new UnauthorizedException("Access denied: user is not associated with any organization.");
        }

        Optional<OrgUser> optionalUser = orgUserRepository.findByMobileNumber(mobileNumber);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found."));
        }

        OrgUser orguser = optionalUser.get();
        if (!orguser.getEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "User is not active."));
        }

        if (orguser.getEmailId() == null || orguser.getEmailId().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email ID is not registered. Please contact the developer."));
        }

        String otp = generateOtp();
        String txnId = UUID.randomUUID().toString();
        String encryptedOtp = passwordEncoder.encode(otp);
        String clientIp = FirebaseUtils.getClientIp(httpRequest);

        OtpTransaction otpTransaction = new OtpTransaction();
        otpTransaction.setMobileNumber(mobileNumber);
        otpTransaction.setPrevDeviceId(orguser.getDeviceId());
        otpTransaction.setEmailId(orguser.getEmailId()); // Store full email in DB
        otpTransaction.setRequestDate(Instant.now());
        otpTransaction.setEmailOtp(encryptedOtp);
        otpTransaction.setValidDuration(600);
        otpTransaction.setTxnId(txnId);
        otpTransactionRepository.save(otpTransaction);

        emailService.sendEmail(orguser.getEmailId(), "Your OTP Code", "Your OTP is: " + otp);
        String maskedEmail = maskEmail(orguser.getEmailId());

        return ResponseEntity
                .ok(Map.of("message", "OTP sent to your email.", "txnId", txnId, "maskedEmail", maskedEmail));
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "";
        }

        String[] parts = email.split("@");
        String localPart = parts[0];
        String domainPart = parts[1];

        String maskedLocal = localPart.charAt(0) + "*****" + localPart.charAt(localPart.length() - 1);
        return maskedLocal + "@" + domainPart;
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    @PostMapping("/verify-email-otp")
    public ResponseEntity<Map<String, Object>> verifyEmailOtp(
            @RequestBody Map<String, String> request, HttpServletRequest httpRequest)

    {
        String mobileNumber = request.get("mobileNumber");
        String txnId = request.get("txnId");
        String enteredOtp = request.get("otp");
        String purpose = request.get("purpose");

        String authorizationHeader = httpRequest.getHeader("Authorization");
        String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

        Integer orgId = jdbcTemplate.queryForObject(
                "SELECT org_id FROM org_user WHERE firebase_id = ?",
                Integer.class,
                uid);

        if (orgId == null) {
            throw new UnauthorizedException("Access denied: user is not associated with any organization.");
        }
        Optional<OtpTransaction> optionalOtpTransaction = otpTransactionRepository.findByTxnId(txnId);
        if (optionalOtpTransaction.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Invalid OTP request."));
        }

        OtpTransaction otpTransaction = optionalOtpTransaction.get();
        if (Instant.now().isAfter(otpTransaction.getRequestDate().plusSeconds(otpTransaction.getValidDuration()))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "OTP expired."));
        }

        if (!passwordEncoder.matches(enteredOtp, otpTransaction.getEmailOtp())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Incorrect OTP."));
        }

        if ("email-verification".equalsIgnoreCase(purpose != null ? purpose.trim() : "")) {
            try {
                jdbcTemplate.update(
                        "UPDATE org_user SET email_verified = true, email_verified_date = now() WHERE mobile_number = ? and firebase_id = ?",
                        mobileNumber, uid);

                jdbcTemplate.update(
                        "UPDATE otp_transactions SET verified_date = now() WHERE mobile_number = ? AND txn_id = ?",
                        mobileNumber, txnId);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Email verified successfully."));

            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "success", false,
                        "message", "Failed to verify email verification.",
                        "error", e.getMessage()));
            }
        }

        String newDeviceId = UUID.randomUUID().toString();
        String updateSql = "UPDATE org_user SET device_id = ? WHERE mobile_number = ? and firebase_id = ? ";
        jdbcTemplate.update(updateSql, newDeviceId, mobileNumber, uid);

        String insertSql = "UPDATE otp_transactions SET new_device_id = ?,verified_date = now() WHERE mobile_number = ? and txn_id = ? ";
        jdbcTemplate.update(insertSql, newDeviceId, mobileNumber, txnId);

        // otpTransactionRepository.deleteByTxnId(txnId);
        try {
            String fid = getFirebaseUidByPhoneNumber(mobileNumber);
            if (fid == null) {
                return ResponseEntity.status(500)
                        .body(Map.of("success", false, "message", "Failed to fetch Firebase UID."));
            }

            Optional<OrgUser> orgUser = orgUserRepository.findByMobileNumber(mobileNumber);

            setUserclaims(fid, orgUser.get());
            // Map<String, Object> claims = new HashMap<>();
            // claims.put("device_id", newDeviceId);
            // FirebaseAuth.getInstance().setCustomUserClaims(uid, claims);
        } catch (FirebaseAuthException e) {
            return ResponseEntity.status(500)
                    .body(Map.of("success", false, "message", "Failed to update Firebase claims."));
        }

        String sql = "SELECT u.user_id, u.mobile_number, u.device_id, u.user_role, " +
                "o.org_name, o.org_address, o.org_id, o.owner_name, o.plan_type ,o.referral_code " +
                "FROM org_user u " +
                "JOIN organization o ON u.org_id = o.org_id " +
                "WHERE u.mobile_number = ?";

        Map<String, Object> userData = jdbcTemplate.queryForMap(sql, mobileNumber);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Device ID updated successfully.");
        response.put("userId", userData.get("user_id"));
        response.put("mobileNumber", userData.get("mobile_number"));
        response.put("deviceId", userData.get("device_id"));
        response.put("userRole", userData.get("user_role"));
        response.put("orgName", userData.get("org_name"));
        response.put("orgAddress", userData.get("org_address"));
        response.put("orgId", userData.get("org_id"));
        response.put("ownerName", userData.get("owner_name"));
        response.put("PlanType", userData.get("plan_type"));
        response.put("referralCode", userData.get("referral_code"));

        return ResponseEntity.ok(response);

    }

    private String getFirebaseUidByPhoneNumber(String phoneNumber) throws FirebaseAuthException {
        try {
            if (!phoneNumber.startsWith("+")) {
                phoneNumber = "+91" + phoneNumber;
            }
            UserRecord userRecord = FirebaseAuth.getInstance().getUserByPhoneNumber(phoneNumber);
            System.out.println(" Firebase UID for phone number " + phoneNumber + " is: " + userRecord.getUid());
            return userRecord.getUid();
        } catch (FirebaseAuthException e) {
            System.err.println(" Error fetching Firebase UID for phone number " + phoneNumber + ": " + e.getMessage());
            throw e;
        }
    }

    @PostMapping("/callbackrequests")
    public ResponseEntity<?> saveCallbackRequest(@RequestBody Map<String, Object> request,
            HttpServletRequest httpRequest) {
        try {
            String mobileNumber = (String) request.get("mobileNumber");
            String email = (String) request.get("email");
            String requesterName = (String) request.get("requesterName");
            String planType = (String) request.get("planType");
            Integer orgId = (Integer) request.get("orgId");

            String authorizationHeader = httpRequest.getHeader("Authorization");
            String uid = FirebaseUtils.extractUidFromAuthorization(authorizationHeader);

            Integer allowedOrgId = jdbcTemplate.queryForObject(
                    "SELECT org_id FROM org_user WHERE firebase_id = ?",
                    Integer.class,
                    uid);

            if (allowedOrgId == null || allowedOrgId != orgId) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not allowed to access this organization");
            }
            // Step 1 → Check if already submitted
            String checkSql = """
                    SELECT COUNT(*) FROM callback_requests
                    WHERE mobile_number = ? AND org_id = ? AND plan_type = ?
                    """;

            Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class,
                    mobileNumber, orgId, planType);

            if (count != null && count > 0) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Callback request already submitted.");
                return ResponseEntity.ok(response);
            }

            String sql = """
                    INSERT INTO callback_requests
                    (mobile_number, email, requester_name, plan_type, org_id, request_date)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    RETURNING request_id
                    """;

            Integer requestId = jdbcTemplate.queryForObject(sql, Integer.class,
                    mobileNumber, email, requesterName, planType, orgId);

            String userSubject = "Thank you for your request (Ref No: " + requestId + ")";
            String userMessage = """
                    Dear %s,<br><br>
                    Thank you for your interest in our <b>%s</b> plan.<br>
                    Your reference number is <b>%d</b>.<br>
                    Our team will contact you soon.<br><br>
                    Regards,<br>DFIVE Technologies Pvt.Ltd.
                    """.formatted(requesterName, planType, requestId);

            emailService.sendEmail(email, userSubject, userMessage);

            String supportSubject = "New Callback Request Received (Ref No: " + requestId + ")";
            String supportMessage = """
                    Callback request details:<br>
                    Request ID: %d<br>
                    Name: %s<br>
                    Mobile: %s<br>
                    Email: %s<br>
                    Plan: %s<br>
                    Org ID: %d<br>
                    Date: %s
                    """.formatted(requestId, requesterName, mobileNumber, email, planType, orgId, LocalDateTime.now());

            emailService.sendEmail("support@botiqcloud.com", supportSubject, supportMessage);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Callback request saved successfully.");
            response.put("request_id", requestId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to save callback request.");
        }
    }

}
