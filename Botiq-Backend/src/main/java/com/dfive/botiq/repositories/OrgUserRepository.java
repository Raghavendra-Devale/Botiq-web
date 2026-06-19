package com.dfive.botiq.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.dfive.botiq.dto.UserOrgDetailsDto;
import com.dfive.botiq.entities.OrgUser;

public interface OrgUserRepository extends JpaRepository<OrgUser, Long> {

    // OrgUser findByContactNumber(String contactNumber);

    boolean existsByMobileNumber(String phoneNumber);

    // OrgUser findByMobileNumber(String phoneNumber);
    Optional<OrgUser> findByMobileNumber(String mobileNumber);

    Optional<OrgUser> findByMobileNumberAndDeviceId(String phoneNumber, String deviceId); 

    @Query(value = "SELECT u.user_id, u.mobile_number, u.device_id, u.user_role, " +
    "o.org_name, o.org_address, o.org_id, o.owner_name, o.support_plan " +
    "FROM org_user u JOIN organization o ON u.org_id = o.org_id " +
    "WHERE u.mobile_number = :mobileNumber", nativeQuery = true)
Optional<UserOrgDetailsDto> findUserWithOrgDetails(@Param("mobileNumber") String mobileNumber);

    Optional<OrgUser>findByfirebaseId(String uid);


    Optional<OrgUser> findByUserId(Integer userId);
}
