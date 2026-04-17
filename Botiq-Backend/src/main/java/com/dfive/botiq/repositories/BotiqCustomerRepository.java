package com.dfive.botiq.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.BotiqCustomer;

public interface BotiqCustomerRepository extends JpaRepository<BotiqCustomer, Long> {

    
} 