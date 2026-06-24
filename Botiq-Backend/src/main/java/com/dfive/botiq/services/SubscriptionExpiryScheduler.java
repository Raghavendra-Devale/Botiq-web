package com.dfive.botiq.services;

import com.dfive.botiq.entities.BotiqOrgPlan;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubscriptionExpiryScheduler {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PushNotificationService pushNotificationService;

    // Run every day at 9:00 AM local time
    @Scheduled(cron = "0 0 9 * * ?")
    public void checkSubscriptions() {
        // 7 days before expiry
        notifyExpiringPlans(7, "Subscription expiring in 7 days");
        // 3 days before expiry
        notifyExpiringPlans(3, "Subscription expiring in 3 days");
        // 1 day before expiry
        notifyExpiringPlans(1, "Subscription expiring tomorrow");
        // Expired today
        notifyExpiringPlans(0, "Subscription has expired");
    }

    private void notifyExpiringPlans(int days, String message) {
        String sql;
        if (days > 0) {
            sql = "SELECT * FROM botiq_org_plan WHERE CAST(plan_end_date AS date) = CURRENT_DATE + " + days;
        } else {
            sql = "SELECT * FROM botiq_org_plan WHERE CAST(plan_end_date AS date) = CURRENT_DATE";
        }

        try {
            List<BotiqOrgPlan> plans = jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(BotiqOrgPlan.class));
            for (BotiqOrgPlan plan : plans) {
                // Send push notification to all active devices in the organization
                if (plan.getOrgId() != null) {
                    pushNotificationService.sendToOrg(
                        plan.getOrgId().longValue(),
                        "BotiQ Subscription Warning",
                        message + " (Plan type: " + plan.getPlanType() + ")",
                        null
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("Error processing subscription reminders: " + e.getMessage());
        }
    }
}
