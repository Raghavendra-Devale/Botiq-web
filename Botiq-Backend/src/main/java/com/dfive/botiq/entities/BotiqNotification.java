package com.dfive.botiq.entities;

import lombok.*;
import jakarta.persistence.*;
import java.sql.Timestamp;

@Entity
@Table(name = "botiq_notification_w")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ToString
public class BotiqNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "note_id")
    private Integer noteId;

    @Column(name = "org_id")
    private Integer orgId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "message_type")
    private String messageType;

    @Column(name = "message_text")
    private String messageText;

    @Column(name = "priority")
    private String priority;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Timestamp createdAt;

    @Column(name = "expires_at")
    private Timestamp expiresAt;

    @Column(name = "acknwoledged_at")
    private Timestamp acknwoledgedAt;
}
