package com.dfive.botiq.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.User;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByPhoneNumber(String phoneNumber);
    // Optional<User> findByPhoneNumber(String phoneNumber);

    User findByPhoneNumber(String phoneNumber);
}