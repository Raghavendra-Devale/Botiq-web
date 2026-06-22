package com.dfive.botiq.controllers;

import com.dfive.botiq.services.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/web/push")
@RequiredArgsConstructor
public class PushNotificationController {

    private final PushNotificationService pushService;

    @PostMapping("/test")
    public String test(@RequestParam String token) throws Exception {
        System.out.println("PUSH CONTROLLER HIT");
        return pushService.sendNotification(
                token,
                "BotiQ",
                "Push notification working"
        );
    }
}