package com.dfive.botiq.dto.report;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalReportSummaryDto {
    private Integer totalOrders;
    private Integer completedOrders;
    private Double revenue;
    private Integer overdueOrders;
    private Double pendingPayments;
}
