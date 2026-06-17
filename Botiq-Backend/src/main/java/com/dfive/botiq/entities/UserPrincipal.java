package com.dfive.botiq.entities;

import lombok.*;

import java.io.Serializable;
import java.security.Principal;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ToString
public class UserPrincipal implements Principal, Serializable {

    private Long userId;

    private String firebaseUid;

    private String email;

    private Long organizationId;

    private Integer orgId;

    private String role;

    private String orgName;

    @Override
    public String getName() {
        return email != null ? email : firebaseUid;
    }
}