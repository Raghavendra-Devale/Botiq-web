package com.dfive.botiq.controllers;

import com.dfive.botiq.configuration.SessionConstants;
import com.dfive.botiq.entities.OrgUser;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.ToString;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/web/auth")
@ToString
public class AuthController {

    private final OrgUserRepository orgUserRepository;

    public AuthController(OrgUserRepository orgUserRepository) {
        this.orgUserRepository = orgUserRepository;
    }

    @PostMapping("/session")
    public ResponseEntity<?> createSession(
            HttpServletRequest request,
            @RequestHeader("Authorization") String authHeader
    ) throws FirebaseAuthException {

        String token = authHeader.replace("Bearer ", "");

        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);

        String firebaseUid = decodedToken.getUid();

        OrgUser orgUser = orgUserRepository.findByfirebaseId(firebaseUid)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found for uid: " + firebaseUid
                        ));

        UserPrincipal principal = UserPrincipal.builder()
                .userId(orgUser.getUserId() != null
                        ? orgUser.getUserId().longValue()
                        : null)
                .firebaseUid(firebaseUid)
                .email(orgUser.getEmailId())
                .orgId(orgUser.getOrgId())
                .orgName(orgUser.getOrgName())
                .build();

        HttpSession session = request.getSession(true);

        session.setAttribute(
                SessionConstants.USER_PRINCIPAL,
                principal
        );

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "session created");
        response.put("sessionId", session.getId());

        System.out.println("SESSION PRINCIPAL CREATED");
        System.out.println(principal);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {

        System.out.println("ME ENDPOINT");
        System.out.println(authentication);
        System.out.println(authentication.getPrincipal());

        return ResponseEntity.ok(authentication.getPrincipal());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request
    ) {

        HttpSession session = request.getSession(false);

        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.ok().build();
    }
}