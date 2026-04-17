package com.dfive.botiq.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserOrgDetailsDto {
    private Long userId;
    private String username;
    private String mobileNumber;
    private String deviceId;
    private String userRole;
    private String orgName;
    private String orgAddress;
    private Long orgId;
    private String ownerName;
    private String supportPlan;
}
