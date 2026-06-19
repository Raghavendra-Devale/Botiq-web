
package com.dfive.botiq.repositories;

import com.dfive.botiq.entities.BotiqNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BotiqNotificationRepository extends JpaRepository<BotiqNotification, Integer> {

        @Query("SELECT n FROM BotiqNotification n WHERE n.orgId = :orgId AND (n.userId = :userId OR n.userId IS NULL) "
                        +
                        "AND (n.expiresAt IS NULL OR n.expiresAt > CURRENT_TIMESTAMP) ORDER BY n.createdAt DESC")
        List<BotiqNotification> findActiveNotificationsByOrgAndUser(@Param("orgId") Integer orgId,
                        @Param("userId") Integer userId);
}
