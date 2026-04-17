package com.dfive.botiq.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dfive.botiq.entities.MasterTable;

public interface MasterTableRepository extends JpaRepository<MasterTable, Long> {

    
} 
