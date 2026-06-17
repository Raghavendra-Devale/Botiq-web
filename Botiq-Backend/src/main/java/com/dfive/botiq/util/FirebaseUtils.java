package com.dfive.botiq.util;

import java.util.Map;

import com.dfive.botiq.dto.FirebaseUserInfoDto;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

import jakarta.servlet.http.HttpServletRequest;

public class FirebaseUtils {
    
    public static String extractUidFromAuthorization(String authorizationHeader) {
        org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.dfive.botiq.entities.UserPrincipal) {
            return ((com.dfive.botiq.entities.UserPrincipal) auth.getPrincipal()).getFirebaseUid();
        }

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Authorization header missing or malformed.");
        }

        try {
            String idToken = authorizationHeader.substring(7);
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            return decodedToken.getUid();
        } catch (Exception ex) {
            throw new RuntimeException("Invalid or expired Firebase token.");
        }
    }



    
    // public static FirebaseUserInfoDto extractUserInfo(String authorizationHeader) {
    //     if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
    //         throw new IllegalArgumentException("Authorization header missing or malformed.");
    //     }
    
    //     try {
    //         String idToken = authorizationHeader.substring(7);
    //         FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
    
    //         Map<String, Object> claims = decodedToken.getClaims();
    
    //         String phone = claims.get("phone_number") != null ? claims.get("phone_number").toString() : null;
    //         String name = claims.get("name") != null ? claims.get("name").toString() : null;
    
    //         return new FirebaseUserInfoDto(
    //             decodedToken.getUid(),
    //             decodedToken.getEmail(),
    //             decodedToken.isEmailVerified(),
    //             phone,
    //             name
    //         );
    
    //     } catch (Exception ex) {
    //         throw new RuntimeException("Invalid or expired Firebase token.", ex);
    //     }
    // }
    

        // public static String extractUid(String authorizationHeader) {
        //     return extractUserInfo(authorizationHeader).getUid();
        // }

      public static String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        if ("0:0:0:0:0:0:0:1".equals(ip)) {
            ip = "127.0.0.1";
        }

        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }


    
}
