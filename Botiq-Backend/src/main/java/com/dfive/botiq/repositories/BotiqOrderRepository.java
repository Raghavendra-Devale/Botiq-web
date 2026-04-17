package com.dfive.botiq.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.BotiqOrder;

public interface BotiqOrderRepository extends JpaRepository<BotiqOrder, Long> {
    
}
