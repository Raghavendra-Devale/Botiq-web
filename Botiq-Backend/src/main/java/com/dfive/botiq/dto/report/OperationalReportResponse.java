package com.dfive.botiq.dto.report;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalReportResponse {
    private OperationalReportSummaryDto summary;
    private List<ReportOrderDto> tableData;
    private List<PartnerWorkloadDto> partnerWorkload;
    private List<CategorySummaryDto> categorySummary;
    private List<OverdueOrderDto> overdueOrdersList;
    private List<PendingPaymentDto> pendingPaymentsList;
}
