package com.dfive.botiq.dto.report;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerWorkloadDto {
    private String partnerName;
    private Long totalOrders;
    private Integer activeOrders;
    private Long completedOrders;
    private Double revenueHandled;
    private Long successRate;
}
