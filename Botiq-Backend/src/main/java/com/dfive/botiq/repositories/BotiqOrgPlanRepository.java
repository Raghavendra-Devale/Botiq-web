package com.dfive.botiq.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dfive.botiq.entities.BotiqOrgPlan;

@Repository
public interface BotiqOrgPlanRepository extends JpaRepository<BotiqOrgPlan, Integer> {
}