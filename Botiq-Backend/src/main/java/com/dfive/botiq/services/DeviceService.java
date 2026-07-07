package com.dfive.botiq.services;

import com.dfive.botiq.constants.DeviceConstants;
import com.dfive.botiq.entities.UserDevice;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.repositories.UserDeviceRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeviceService {

    private final UserDeviceRepository userDeviceRepository;
    private final DeviceTokenService deviceTokenService;

    public UserDevice findCurrentDevice(HttpServletRequest request) {

        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            throw new RuntimeException("Device cookie not found");
        }

        String rawToken = null;

        for (Cookie cookie : cookies) {

            if (DeviceConstants.DEVICE_COOKIE_NAME.equals(cookie.getName())) {
                rawToken = cookie.getValue();
                break;
            }
        }

        if (rawToken == null) {
            throw new RuntimeException("Device cookie not found");
        }

        String tokenHash = deviceTokenService.hashToken(rawToken);

        return userDeviceRepository.findByDeviceTokenHash(tokenHash)
                .orElseThrow(() ->
                        new RuntimeException("Device not found"));
    }

    public List<UserDevice> getDevices(
            UserPrincipal principal
    ) {

        return userDeviceRepository.findByUserIdAndOrgId(principal.getUserId(), Long.valueOf(principal.getOrgId()));
    }
}