package com.dfive.botiq.dto.report;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PendingPaymentDto {
    private String orderId;
    private String customerName;
    private Double amount;
    private Double pendingAmount;
    private String paymentStatus;
}
