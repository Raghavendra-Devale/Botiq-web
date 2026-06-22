package com.dfive.botiq.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterTokenRequest {

    private String fcmToken;
    private String deviceType;
}
