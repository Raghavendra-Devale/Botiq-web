package com.dfive.botiq.controllers;

import com.dfive.botiq.constants.DeviceConstants;
import com.dfive.botiq.entities.UserDevice;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.enums.DeviceStatus;
import com.dfive.botiq.repositories.OrgUserRepository;
import com.dfive.botiq.repositories.UserDeviceRepository;
import com.dfive.botiq.services.AuthService;
import com.dfive.botiq.services.DeviceService;
import com.dfive.botiq.services.DeviceTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    private AuthController authController;

    @Mock
    private OrgUserRepository orgUserRepository;
    @Mock
    private DeviceTokenService deviceTokenService;
    @Mock
    private UserDeviceRepository userDeviceRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private DeviceService deviceService;
    @Mock
    private AuthService authService;

    @Mock
    private Authentication authentication;
    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        authController = new AuthController(
                orgUserRepository,
                deviceTokenService,
                userDeviceRepository,
                passwordEncoder,
                deviceService,
                authService
        );
    }

    @Test
    void testRegisterDevice_Success_UnderLimit() {
        UserPrincipal principal = UserPrincipal.builder()
                .userId(1L)
                .orgId(100)
                .build();
        when(authentication.getPrincipal()).thenReturn(principal);
        when(request.getCookies()).thenReturn(null);
        when(deviceTokenService.generateToken()).thenReturn("mockRawToken");
        when(deviceTokenService.hashToken("mockRawToken")).thenReturn("mockTokenHash");
        when(userDeviceRepository.countByUserIdAndStatus(1L, DeviceStatus.ACTIVE)).thenReturn(2L); // 2 active devices

        ResponseEntity<?> responseEntity = authController.registerDevice(authentication, response, request);

        assertEquals(200, responseEntity.getStatusCode().value());
        verify(userDeviceRepository, times(1)).save(any(UserDevice.class));
    }

    @Test
    void testRegisterDevice_Fails_AtLimit() {
        UserPrincipal principal = UserPrincipal.builder()
                .userId(1L)
                .orgId(100)
                .build();
        when(authentication.getPrincipal()).thenReturn(principal);
        when(request.getCookies()).thenReturn(null);
        when(deviceTokenService.generateToken()).thenReturn("mockRawToken");
        when(deviceTokenService.hashToken("mockRawToken")).thenReturn("mockTokenHash");
        when(userDeviceRepository.countByUserIdAndStatus(1L, DeviceStatus.ACTIVE)).thenReturn(3L); // 3 active devices

        ResponseEntity<?> responseEntity = authController.registerDevice(authentication, response, request);

        assertEquals(400, responseEntity.getStatusCode().value());
        verify(userDeviceRepository, never()).save(any(UserDevice.class));
    }

    @Test
    void testRegisterDevice_Success_WithInactiveDevices() {
        UserPrincipal principal = UserPrincipal.builder()
                .userId(1L)
                .orgId(100)
                .build();
        when(authentication.getPrincipal()).thenReturn(principal);
        when(request.getCookies()).thenReturn(null);
        when(deviceTokenService.generateToken()).thenReturn("mockRawToken");
        when(deviceTokenService.hashToken("mockRawToken")).thenReturn("mockTokenHash");
        // User has 5 total devices in DB, but only 2 of them are ACTIVE
        when(userDeviceRepository.countByUserIdAndStatus(1L, DeviceStatus.ACTIVE)).thenReturn(2L);

        ResponseEntity<?> responseEntity = authController.registerDevice(authentication, response, request);

        assertEquals(200, responseEntity.getStatusCode().value());
        verify(userDeviceRepository, times(1)).save(any(UserDevice.class));
    }

    @Test
    void testSetupMpin_Success() {
        UserPrincipal principal = UserPrincipal.builder().userId(1L).orgId(100).build();
        when(authentication.getPrincipal()).thenReturn(principal);
        UserDevice device = new UserDevice();
        when(deviceService.findCurrentDevice(request)).thenReturn(device);
        when(passwordEncoder.encode("123456")).thenReturn("hashedMpin");

        com.dfive.botiq.dto.SetupMpinRequest payload = new com.dfive.botiq.dto.SetupMpinRequest();
        payload.setMpin("123456");

        ResponseEntity<?> responseEntity = authController.setupMpin(request, authentication, payload);

        assertEquals(200, responseEntity.getStatusCode().value());
        assertEquals("hashedMpin", device.getMpinHash());
        verify(userDeviceRepository, times(1)).save(device);
    }

    @Test
    void testVerifyMpin_Success() {
        UserPrincipal principal = UserPrincipal.builder().userId(1L).orgId(100).build();
        when(authentication.getPrincipal()).thenReturn(principal);
        UserDevice device = new UserDevice();
        device.setMpinHash("hashedMpin");
        when(deviceService.findCurrentDevice(request)).thenReturn(device);
        when(passwordEncoder.matches("123456", "hashedMpin")).thenReturn(true);

        com.dfive.botiq.dto.VerifyMpinRequest payload = new com.dfive.botiq.dto.VerifyMpinRequest();
        payload.setMpin("123456");

        ResponseEntity<?> responseEntity = authController.verifyMpin(request, authentication, payload);

        assertEquals(200, responseEntity.getStatusCode().value());
        verify(deviceService, times(1)).findCurrentDevice(request);
    }
}
