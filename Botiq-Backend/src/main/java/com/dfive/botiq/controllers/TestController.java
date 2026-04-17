package com.dfive.botiq.controllers;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dfive.botiq.dto.FirebaseUserInfoDto;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.entities.User;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.repositories.UserRepository;
import com.dfive.botiq.util.FirebaseUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;

@RestController
@RequestMapping("/api")
public class TestController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private OrgUserRepository orgUserRepository;

    @GetMapping("/private")
    public String publicEndpoint() {
        return "This is a public endpoint!";
    }

    // @GetMapping("/secure")
    // public String secureEndpoint() {
    //     return "This is a secure endpoint. You are authenticated!";
    // }
    // @GetMapping("/secure")
    // public String secureEndpoint() {
    //     return "secured";
    // }
//     @PostMapping("/register")
//     public ResponseEntity<Map<String, Object>> registerUser(@RequestBody User user) {
//         Map<String, Object> response = new HashMap<>();
//         try {
//             if (userRepository.existsByPhoneNumber(user.getPhoneNumber())) {
//                 response.put("success", false);
//                 response.put("message", "User already exists with this phone number.");
//                 return ResponseEntity.badRequest().body(response);
//             }
    
//             User savedUser = userRepository.save(user);
//             response.put("success", true);
//             response.put("message", "User registered successfully.");
//             response.put("user", savedUser);
//             return ResponseEntity.ok(response);
//         } catch (Exception e) {
//             response.put("success", false);
//             response.put("message", "Error occurred: " + e.getMessage());
//             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
//         }
//     }


    
            
//             @PostMapping("/set-claims")
//             public ResponseEntity<Map<String, Object>> setCustomClaims(@RequestHeader("Authorization") String authorizationHeader) {
//                 Map<String, Object> response = new HashMap<>();
//                 try {
//                     if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
//                         response.put("success", false);
//                         response.put("message", "Authorization header missing or malformed.");
//                         return ResponseEntity.badRequest().body(response);
//                     }
            
//                     String idToken = authorizationHeader.substring(7); 
//                     System.out.println("Received Token: " + idToken);
            
//                     FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            
//                     String uid = decodedToken.getUid();
//                     String role = determineUserRole(uid);
                    
//                     Map<String, Object> claims = new HashMap<>();
//                     claims.put("role", role);
                    
            
//                     FirebaseAuth.getInstance().setCustomUserClaims(uid, claims);
            
//                     response.put("success", true);
//                     response.put("message", "Custom claims set successfully.");
//                     response.put("role", role); 
//                     return ResponseEntity.ok(response);
//                 } catch (FirebaseAuthException e) {
//                     e.printStackTrace();
//                     response.put("success", false);
//                     response.put("message", "Error verifying token or setting claims: " + e.getMessage());
//                     return ResponseEntity.status(500).body(response);
//                 }
//             }
            
//             private String determineUserRole(String uid) {
//                 if (uid.equals("n32Avp4R7me3YXXAnHhFWZFBd8Q2")) {
//                     return "admin";
//                 }
//                 return "user"; 
//             }
    
//     @PostMapping("/sync")
//     public ResponseEntity<String> syncData(@RequestBody Map<String, Object> payload) {
//         try {
//             String sql = "SELECT upsert_data(?::jsonb)";
//             String jsonPayload = new ObjectMapper().writeValueAsString(payload);
//             String result = jdbcTemplate.queryForObject(sql, String.class, jsonPayload);
//             return ResponseEntity.ok(result);
//         } catch (DataAccessException dae) {
//             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                                  .body("Database error: " + dae.getMessage());
//         } catch (JsonProcessingException jpe) {
//             return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                                  .body("Error processing JSON payload: " + jpe.getMessage());
//         } catch (Exception e) {
//             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                                  .body("An unexpected error occurred: " + e.getMessage());
//         }
// }

 
}