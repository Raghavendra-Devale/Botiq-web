package com.dfive.botiq.entities;

import jakarta.persistence.*;
import lombok.*;
import java.sql.Timestamp;

@Entity
@Table(name = "notification_device")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String deviceType;

    @Column(columnDefinition = "TEXT")
    private String fcmToken;

    private Boolean active;

    private Timestamp createdAt;

    private Timestamp updatedAt;
}
