package com.dfive.botiq.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.Organization;

public interface OrganizationRepository extends JpaRepository<Organization, Integer> {

    boolean existsByOrgName(String orgName);

    Optional<Organization> findByOrgName(String orgName);

    Optional<Organization> findByMobileNumber(String mobileNumber);


}
