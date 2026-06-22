package com.dfive.botiq.controllers;

import com.dfive.botiq.dto.RegisterTokenRequest;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.services.NotificationDeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/web/notifications")
@RequiredArgsConstructor
public class NotificationDeviceController {

    private final NotificationDeviceService service;

    @PostMapping("/register-token")
    public ResponseEntity<?> registerToken(
            @RequestBody RegisterTokenRequest request) {

        Authentication auth =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        UserPrincipal principal =
                (UserPrincipal) auth.getPrincipal();

        service.registerToken(
                principal.getUserId(),
                request);

        return ResponseEntity.ok().build();
    }
}
