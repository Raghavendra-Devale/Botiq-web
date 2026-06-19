package com.dfive.botiq.services;

import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class DeviceTokenService {

    public String generateToken() {
        return UUID.randomUUID().toString().replaceAll("-", "");
    }

    public String hashToken(String token) {
        return DigestUtils.sha256Hex(token);
    }

}
