package com.dfive.botiq.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.BotiqJobDocs;

public interface BotiqJobDocsRepository extends JpaRepository<BotiqJobDocs, Long> {
    
}
