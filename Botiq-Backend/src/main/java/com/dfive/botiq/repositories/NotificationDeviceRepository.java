package com.dfive.botiq.repositories;

import com.dfive.botiq.entities.NotificationDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationDeviceRepository
        extends JpaRepository<NotificationDevice, Long> {

    Optional<NotificationDevice> findByFcmToken(String fcmToken);

    List<NotificationDevice> findByUserIdAndActiveTrue(
            Long userId
    );
}
