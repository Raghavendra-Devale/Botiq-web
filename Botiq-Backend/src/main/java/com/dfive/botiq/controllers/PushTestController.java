package com.dfive.botiq.controllers;

import com.dfive.botiq.services.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/web/push")
@RequiredArgsConstructor
public class PushTestController {

    private final PushNotificationService pushService;

    @PostMapping("/test-user")
    public ResponseEntity<?> testUser(@RequestParam Long userId) {
        pushService.sendToUser(userId, "BotiQ Test", "Push notification working");
        return ResponseEntity.ok().build();
    }
}
