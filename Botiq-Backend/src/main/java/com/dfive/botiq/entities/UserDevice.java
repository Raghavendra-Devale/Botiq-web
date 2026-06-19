package com.dfive.botiq.entities;

import com.dfive.botiq.enums.DeviceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;

    private Long userId;

    @Column(nullable = false, unique = true)
    private String deviceTokenHash;

    private String fingerprintHash;

    private String mpinHash;

    private String deviceName;

    private String browserName;

    private String osName;

    private String ipAddress;

//    private String status;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status;

    private Integer failedAttempts;

    private LocalDateTime lastActiveAt;

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}