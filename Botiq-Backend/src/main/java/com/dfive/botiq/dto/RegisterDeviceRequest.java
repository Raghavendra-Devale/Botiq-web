package com.dfive.botiq.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterDeviceRequest {
    private String deviceName;

    private String browserName;

    private String osName;

    private String fingerprint;
}
