package com.dfive.botiq.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SseServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private SseService sseService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testSubscribeAndSendToUser() {
        Long userId = 1L;
        SseEmitter emitter = sseService.subscribe(userId);
        assertNotNull(emitter);

        // Test sending to user (no exceptions thrown)
        assertDoesNotThrow(() -> sseService.sendToUser(userId, "test payload"));
    }

    @Test
    void testSendToOrg_NoUsers() {
        Integer orgId = 10;
        when(jdbcTemplate.queryForList(anyString(), eq(Long.class), eq(orgId)))
                .thenReturn(Collections.emptyList());

        assertDoesNotThrow(() -> sseService.sendToOrg(orgId, "payload"));
        verify(jdbcTemplate, times(1)).queryForList(anyString(), eq(Long.class), eq(orgId));
    }

    @Test
    void testSendToOrg_WithUsers() {
        Integer orgId = 10;
        List<Long> userIds = Arrays.asList(1L, 2L);
        when(jdbcTemplate.queryForList(anyString(), eq(Long.class), eq(orgId)))
                .thenReturn(userIds);

        // Subscribe user 1
        SseEmitter emitter1 = sseService.subscribe(1L);
        assertNotNull(emitter1);

        assertDoesNotThrow(() -> sseService.sendToOrg(orgId, "payload"));
        verify(jdbcTemplate, times(1)).queryForList(anyString(), eq(Long.class), eq(orgId));
    }
}
