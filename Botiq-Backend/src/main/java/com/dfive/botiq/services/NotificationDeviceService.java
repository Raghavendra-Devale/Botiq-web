package com.dfive.botiq.services;

import com.dfive.botiq.dto.RegisterTokenRequest;
import com.dfive.botiq.entities.NotificationDevice;
import com.dfive.botiq.repositories.NotificationDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationDeviceService {

    private final NotificationDeviceRepository repository;

    public void registerToken(
            Long userId,
            RegisterTokenRequest request) {

        Optional<NotificationDevice> existing =
                repository.findByFcmToken(
                        request.getFcmToken());

        if (existing.isPresent()) {

            NotificationDevice device =
                    existing.get();

            device.setUserId(userId);
            device.setActive(true);
            device.setUpdatedAt(
                    new Timestamp(
                            System.currentTimeMillis()));

            repository.save(device);

            return;
        }

        repository.save(
                NotificationDevice.builder()
                        .userId(userId)
                        .deviceType(
                                request.getDeviceType())
                        .fcmToken(
                                request.getFcmToken())
                        .active(true)
                        .createdAt(
                                new Timestamp(
                                        System.currentTimeMillis()))
                        .updatedAt(
                                new Timestamp(
                                        System.currentTimeMillis()))
                        .build()
        );
    }
}
