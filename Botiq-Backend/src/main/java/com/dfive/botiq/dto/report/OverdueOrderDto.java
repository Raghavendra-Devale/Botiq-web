package com.dfive.botiq.dto.report;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OverdueOrderDto {
    private String orderId;
    private String customerName;
    private String dueDate;
    private Integer delayDays;
    private Double amount;
}
