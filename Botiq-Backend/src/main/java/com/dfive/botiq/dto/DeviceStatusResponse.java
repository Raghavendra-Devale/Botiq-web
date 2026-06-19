package com.dfive.botiq.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

public class DeviceStatusResponse {

    private boolean knownDevice;

    private Long userId;

    private Long orgId;

    private Long deviceId;
}