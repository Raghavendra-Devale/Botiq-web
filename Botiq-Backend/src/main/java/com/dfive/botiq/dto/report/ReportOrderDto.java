package com.dfive.botiq.dto.report;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportOrderDto {
    private String orderId;
    private String date;
    private String customerName;
    private String dueDate;
    private String status;
    private Double amount;
    private String paymentStatus;
    private String partner;
    private String category;
}
