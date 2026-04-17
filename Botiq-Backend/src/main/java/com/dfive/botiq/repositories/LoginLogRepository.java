package com.dfive.botiq.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.LoginLogs;


public interface LoginLogRepository extends JpaRepository<LoginLogs, Integer> {

    
} 