package com.dfive.botiq.controllers;

import com.dfive.botiq.constants.DeviceConstants;
import com.dfive.botiq.constants.SessionConstants;
import com.dfive.botiq.dto.DeviceStatusResponse;
import com.dfive.botiq.dto.SetupMpinRequest;
import com.dfive.botiq.dto.VerifyMpinRequest;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.entities.UserDevice;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.enums.DeviceStatus;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.repositories.UserDeviceRepository;
import com.dfive.botiq.services.AuthService;
import com.dfive.botiq.services.DeviceService;
import com.dfive.botiq.services.DeviceTokenService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.ToString;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import com.dfive.botiq.dto.MpinLoginRequest;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/web/auth")
@ToString
public class AuthController {

        private final OrgUserRepository orgUserRepository;
        private final DeviceTokenService deviceTokenService;
        private final UserDeviceRepository userDeviceRepository;
        private final PasswordEncoder passwordEncoder;
        private final DeviceService deviceService;
        private final AuthService authService;

        public AuthController(OrgUserRepository orgUserRepository,
                        DeviceTokenService deviceTokenService,
                        UserDeviceRepository userDeviceRepository,
                        PasswordEncoder passwordEncoder,
                        DeviceService deviceService,
                        AuthService authService) {

                this.orgUserRepository = orgUserRepository;
                this.deviceTokenService = deviceTokenService;
                this.userDeviceRepository = userDeviceRepository;
                this.passwordEncoder = passwordEncoder;
                this.deviceService = deviceService;
                this.authService = authService;
        }

        @GetMapping("/device-status")
        public ResponseEntity<DeviceStatusResponse> deviceStatus(
                        HttpServletRequest request) {

                System.out.println("===== DEVICE STATUS =====");

                Cookie[] cookies = request.getCookies();

                for (Cookie cookie : cookies) {
                        System.out.println(
                                        cookie.getName() + " = " + cookie.getValue());
                }

                if (cookies == null) {
                        return ResponseEntity.ok(DeviceStatusResponse.builder().knownDevice(false).build());
                }

                String rawToken = null;

                for (Cookie cookie : cookies) {

                        if (DeviceConstants.DEVICE_COOKIE_NAME.equals(cookie.getName())) {
                                rawToken = cookie.getValue();
                                System.out.println("Raw Token = " + rawToken);

                                break;
                        }
                }

                if (rawToken == null) {
                        return ResponseEntity.ok(
                                        DeviceStatusResponse.builder().knownDevice(false).build());
                }

                String tokenHash = deviceTokenService.hashToken(rawToken);
                System.out.println("Token Hash = " + tokenHash);

                Optional<UserDevice> deviceOpt = userDeviceRepository.findByDeviceTokenHash(tokenHash);
                System.out.println("Device Found = " + deviceOpt.isPresent());
                deviceOpt.ifPresent(System.out::println);

                if (deviceOpt.isEmpty()) {
                        return ResponseEntity.ok(
                                        DeviceStatusResponse.builder()
                                                        .knownDevice(false)
                                                        .build());
                }

                UserDevice device = deviceOpt.get();

                if (device.getStatus() != DeviceStatus.ACTIVE || device.getMpinHash() == null
                                || device.getMpinHash().isEmpty()) {
                        return ResponseEntity.ok(
                                        DeviceStatusResponse.builder()
                                                        .knownDevice(false)
                                                        .build());
                }

                if (device.getExpiresAt() != null
                                && device.getExpiresAt().isBefore(LocalDateTime.now())) {

                        device.setStatus(DeviceStatus.EXPIRED);
                        userDeviceRepository.save(device);

                        return ResponseEntity.ok(
                                        DeviceStatusResponse.builder()
                                                        .knownDevice(false)
                                                        .build());
                }

                device.setLastActiveAt(LocalDateTime.now());
                userDeviceRepository.save(device);

                return ResponseEntity.ok(
                                DeviceStatusResponse.builder()
                                                .knownDevice(true)
                                                .userId(device.getUserId())
                                                .orgId(device.getOrgId())
                                                .deviceId(device.getId())
                                                .build());
        }

        @PostMapping("/setup-mpin")
        public ResponseEntity<?> setupMpin(
                        HttpServletRequest request,
                        Authentication authentication,
                        @Valid @RequestBody SetupMpinRequest payload) {

                UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

                UserDevice device = deviceService.findCurrentDevice(request);

                device.setMpinHash(passwordEncoder.encode(payload.getMpin()));

                device.setUpdatedAt(LocalDateTime.now());

                userDeviceRepository.save(device);

                return ResponseEntity.ok(
                                Map.of(
                                                "message",
                                                "MPIN configured successfully"));
        }

        @PostMapping("/verify-mpin")
        public ResponseEntity<?> verifyMpin(
                        HttpServletRequest request,
                        Authentication authentication,
                        @Valid @RequestBody VerifyMpinRequest payload) {

                UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

                UserDevice device = deviceService.findCurrentDevice(request);

                boolean valid = passwordEncoder.matches(
                                payload.getMpin(),
                                device.getMpinHash());

                return ResponseEntity.ok(
                                Map.of(
                                                "valid",
                                                valid));
        }

        @PostMapping("/mpin-login")
        public ResponseEntity<?> mpinLogin(
                        HttpServletRequest request,
                        @Valid @RequestBody MpinLoginRequest payload) {

                System.out.println("MPIN LOGIN HIT");

                UserDevice device;

                try {

                        device = deviceService.findCurrentDevice(
                                        request);

                } catch (Exception e) {

                        return ResponseEntity.status(401)
                                        .body(
                                                        Map.of(
                                                                        "message",
                                                                        "Device not recognized"));
                }

                if (device.getStatus() == DeviceStatus.LOCKED) {

                        return ResponseEntity.badRequest()
                                        .body(
                                                        Map.of(
                                                                        "message",
                                                                        "Device locked. Login with OTP.",
                                                                        "remainingAttempts",
                                                                        0));
                }

                boolean valid = passwordEncoder.matches(
                                payload.getMpin(),
                                device.getMpinHash());

                if (!valid) {

                        int attempts = device.getFailedAttempts() + 1;

                        device.setFailedAttempts(
                                        attempts);

                        device.setUpdatedAt(
                                        LocalDateTime.now());

                        if (attempts >= 3) {

                                device.setStatus(
                                                DeviceStatus.LOCKED);
                        }

                        userDeviceRepository.save(
                                        device);

                        return ResponseEntity.badRequest()
                                        .body(
                                                        Map.of(
                                                                        "message",
                                                                        attempts >= 3
                                                                                        ? "Device locked. Login with OTP."
                                                                                        : "Invalid MPIN",
                                                                        "remainingAttempts",
                                                                        Math.max(
                                                                                        0,
                                                                                        3 - attempts)));
                }

                device.setFailedAttempts(0);
                device.setLastActiveAt(LocalDateTime.now());
                device.setUpdatedAt(LocalDateTime.now());

                userDeviceRepository.save(device);

                OrgUser orgUser = orgUserRepository
                                .findByUserId(
                                                device.getUserId().intValue())
                                .orElseThrow(() -> new RuntimeException(
                                                "User not found"));

                UserPrincipal principal = authService.buildPrincipal(
                                orgUser);

                authService.createUserSession(
                                request,
                                principal);

                return ResponseEntity.ok(
                                Map.of(
                                                "message",
                                                "MPIN login successful"));

        }

        @PostMapping("/register-device")
        public ResponseEntity<?> registerDevice(Authentication authentication, HttpServletResponse response,
                        HttpServletRequest request) {
                UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

                System.out.println("===== REGISTER DEVICE =====");

                Cookie[] cookies = request.getCookies();

                if (cookies == null) {
                        System.out.println("No cookies received");
                } else {
                        for (Cookie cookie : cookies) {
                                System.out.println(cookie.getName() + " = " + cookie.getValue());
                        }
                }

                if (cookies != null) {

                        for (Cookie cookie : cookies) {

                                if (DeviceConstants.DEVICE_COOKIE_NAME.equals(
                                                cookie.getName())) {

                                        String existingTokenHash = deviceTokenService.hashToken(
                                                        cookie.getValue());

                                        Optional<UserDevice> existingDevice = userDeviceRepository
                                                        .findByDeviceTokenHash(
                                                                        existingTokenHash);

                                        if (existingDevice.isPresent()) {

                                                return ResponseEntity.ok(
                                                                Map.of(
                                                                                "message",
                                                                                "device already registered"));
                                        }
                                }
                        }
                }

                String rawToken = deviceTokenService.generateToken();

                String tokenHash = deviceTokenService.hashToken(rawToken);

                // long deviceCount = userDeviceRepository.countByUserIdAndStatus(
                // principal.getUserId(),
                // DeviceStatus.ACTIVE);
                System.out.println("Generated Raw Token = " + rawToken);
                System.out.println("Generated Hash      = " + tokenHash);


                // if (deviceCount >= 3) {
                // return ResponseEntity.badRequest().body(Map.of("message", "Maximum 3 devices
                // allowed"));
                // }

                String userAgent = request.getHeader("User-Agent");
                String browser = parseBrowser(userAgent);
                String os = parseOs(userAgent);
                String deviceName = parseDeviceName(userAgent);
                String ipAddress = request.getRemoteAddr();

                UserDevice userDevice = UserDevice.builder()
                                .orgId(Long.valueOf(principal.getOrgId()))
                                .userId(principal.getUserId())
                                .deviceTokenHash(tokenHash)
                                .status(DeviceStatus.ACTIVE)
                                .failedAttempts(0)
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .lastActiveAt(LocalDateTime.now())
                                .expiresAt(LocalDateTime.now().plusMonths(6))
                                .browserName(browser)
                                .osName(os)
                                .deviceName(deviceName)
                                .ipAddress(ipAddress)
                                .build();

                userDeviceRepository.save(userDevice);

                ResponseCookie cookie = ResponseCookie.from(DeviceConstants.DEVICE_COOKIE_NAME, rawToken)
                                .httpOnly(true)
                                .secure(false)
                                .path("/")
                                .maxAge(Duration.ofDays(180))
                                .sameSite("Strict")
                                .build();

                response.addHeader(
                                HttpHeaders.SET_COOKIE,
                                cookie.toString());

                return ResponseEntity.ok(
                                Map.of(
                                                "message",
                                                "device registered"));
        }

        @PostMapping("/session")
        public ResponseEntity<?> createSession(
                        HttpServletRequest request,
                        @RequestHeader("Authorization") String authHeader) throws FirebaseAuthException {

                String token = authHeader.replace(
                                "Bearer ",
                                "");

                FirebaseToken decodedToken = FirebaseAuth.getInstance()
                                .verifyIdToken(token);

                String firebaseUid = decodedToken.getUid();

                OrgUser orgUser = orgUserRepository
                                .findByfirebaseId(firebaseUid)
                                .orElseThrow(() -> new RuntimeException(
                                                "User not found for uid: "
                                                                + firebaseUid));

                UserPrincipal principal = authService.buildPrincipal(
                                orgUser);

                authService.createUserSession(
                                request,
                                principal);

                List<UserDevice> devices = userDeviceRepository.findByUserId(
                                principal.getUserId());

                devices.forEach(device -> {

                        if (device.getStatus() == DeviceStatus.LOCKED) {

                                device.setStatus(
                                                DeviceStatus.ACTIVE);

                                device.setFailedAttempts(0);

                                device.setMpinHash(null);

                                device.setUpdatedAt(
                                                LocalDateTime.now());

                                userDeviceRepository.save(
                                                device);
                        }
                });

                return ResponseEntity.ok(
                                Map.of(
                                                "status",
                                                "ok",
                                                "message",
                                                "session created"));

        }

        @GetMapping("/me")
        public ResponseEntity<?> me(Authentication authentication) {

                System.out.println("ME ENDPOINT");
                System.out.println(authentication);
                System.out.println(authentication.getPrincipal());

                return ResponseEntity.ok(authentication.getPrincipal());
        }

        @GetMapping("/devices")
        public ResponseEntity<?> getDevices(Authentication authentication) {

                UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

                List<UserDevice> devices = userDeviceRepository.findByUserIdAndOrgId(
                                principal.getUserId(),
                                Long.valueOf(principal.getOrgId()));

                List<Map<String, Object>> response = new ArrayList<>();
                for (UserDevice d : devices) {
                        if (d.getStatus() == DeviceStatus.ACTIVE || d.getStatus() == DeviceStatus.LOCKED) {
                                Map<String, Object> map = new HashMap<>();
                                map.put("id", d.getId());
                                map.put("deviceName", d.getDeviceName());
                                map.put("browserName", d.getBrowserName());
                                map.put("osName", d.getOsName());
                                map.put("ipAddress", d.getIpAddress());
                                map.put("status", d.getStatus());
                                map.put("lastActiveAt", d.getLastActiveAt());
                                map.put("createdAt", d.getCreatedAt());
                                response.add(map);
                        }
                }

                return ResponseEntity.ok(response);
        }

        @DeleteMapping("/devices/{id}")
        public ResponseEntity<?> deleteDevice(
                        @PathVariable Long id,
                        Authentication authentication,
                        HttpServletRequest request,
                        HttpServletResponse response) {

                UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

                Optional<UserDevice> deviceOpt = userDeviceRepository.findById(id);
                if (deviceOpt.isEmpty() || !deviceOpt.get().getUserId().equals(principal.getUserId())) {
                        return ResponseEntity.status(403).body(Map.of("message", "Unauthorized to remove this device"));
                }

                UserDevice device = deviceOpt.get();
                device.setStatus(DeviceStatus.REVOKED);
                device.setUpdatedAt(LocalDateTime.now());
                userDeviceRepository.save(device);

                // If deleting current device, log out and clear cookies
                try {
                        UserDevice currentDevice = deviceService.findCurrentDevice(request);
                        if (currentDevice.getId().equals(device.getId())) {
                                HttpSession session = request.getSession(false);
                                if (session != null) {
                                        session.invalidate();
                                }
                                ResponseCookie cookie = ResponseCookie.from(DeviceConstants.DEVICE_COOKIE_NAME, "")
                                                .httpOnly(true)
                                                .secure(false)
                                                .path("/")
                                                .maxAge(0)
                                                .sameSite("Strict")
                                                .build();
                                response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
                        }
                } catch (Exception e) {
                        // Ignore if current device not found
                }

                return ResponseEntity.ok(
                                Map.of(
                                                "message",
                                                "Device removed successfully"));
        }

        @PostMapping("/logout")
        public ResponseEntity<?> logout(
                        HttpServletRequest request) {

                HttpSession session = request.getSession(false);

                if (session != null) {
                        session.invalidate();
                }

                return ResponseEntity.ok().build();
        }

        private String parseBrowser(String userAgent) {
                if (userAgent == null)
                        return "Unknown Browser";
                String ua = userAgent.toLowerCase();
                if (ua.contains("edg"))
                        return "Edge";
                if (ua.contains("chrome") && ua.contains("safari") && !ua.contains("chromium"))
                        return "Chrome";
                if (ua.contains("firefox"))
                        return "Firefox";
                if (ua.contains("safari") && !ua.contains("chrome"))
                        return "Safari";
                if (ua.contains("opr") || ua.contains("opera"))
                        return "Opera";
                return "Unknown Browser";
        }

        private String parseOs(String userAgent) {
                if (userAgent == null)
                        return "Unknown OS";
                String ua = userAgent.toLowerCase();
                if (ua.contains("windows"))
                        return "Windows";
                if (ua.contains("macintosh") || ua.contains("mac os x"))
                        return "macOS";
                if (ua.contains("iphone"))
                        return "iOS (iPhone)";
                if (ua.contains("ipad"))
                        return "iOS (iPad)";
                if (ua.contains("android"))
                        return "Android";
                if (ua.contains("linux"))
                        return "Linux";
                return "Unknown OS";
        }

        private String parseDeviceName(String userAgent) {
                if (userAgent == null)
                        return "Desktop";
                String ua = userAgent.toLowerCase();
                if (ua.contains("iphone"))
                        return "iPhone";
                if (ua.contains("ipad"))
                        return "iPad";
                if (ua.contains("android")) {
                        return ua.contains("mobile") ? "Android Phone" : "Android Tablet";
                }
                return "Desktop";
        }
}