package com.dfive.botiq.repositories;

import com.dfive.botiq.entities.UserDevice;
import com.dfive.botiq.enums.DeviceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

    Optional<UserDevice> findByDeviceTokenHash(String deviceTokenHash);

    List<UserDevice> findByUserId(Long userId);

    List<UserDevice> findByUserIdAndOrgId(Long userId, Long orgId);

    Optional<UserDevice> findByUserIdAndOrgIdAndStatus(Long userId, Long orgId, DeviceStatus status);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, DeviceStatus status);
}