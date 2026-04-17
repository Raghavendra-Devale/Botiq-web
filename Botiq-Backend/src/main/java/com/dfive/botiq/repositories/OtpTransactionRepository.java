package com.dfive.botiq.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.dfive.botiq.entities.OtpTransaction;

import jakarta.transaction.Transactional;

@Repository
public interface OtpTransactionRepository extends JpaRepository<OtpTransaction, Long> {
    Optional<OtpTransaction> findByTxnId(String txnId);

    @Modifying
    @Transactional
    @Query("DELETE FROM OtpTransaction o WHERE o.txnId = :txnId")
    void deleteByTxnId(String txnId);
    
}
