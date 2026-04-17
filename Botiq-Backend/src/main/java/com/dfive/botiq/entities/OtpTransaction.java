package com.dfive.botiq.entities;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "otp_transactions")
public class OtpTransaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "mobile_number", nullable = false)
    private String mobileNumber;

    @Column(name = "email_id", nullable = false)
    private String emailId;

    @Column(name = "request_date", nullable = false, updatable = false)
    private Instant requestDate;

    @Column(name = "email_otp", nullable = false)
    private String emailOtp;

    @Column(name = "valid_duration", nullable = false)
    private Integer validDuration = 600; 
    
    @Column(name = "verified_date")
    private Instant verifiedDate;

    @Column(name = "txn_id", nullable = false, unique = true)
    private String txnId;

    @Column(name = "prev_device_id")
    private String prevDeviceId;
    
    @Column(name = "new_device_id")
    private String newDeviceId;

}
