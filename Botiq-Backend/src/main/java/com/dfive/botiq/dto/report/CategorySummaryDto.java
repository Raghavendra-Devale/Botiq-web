package com.dfive.botiq.dto.report;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategorySummaryDto {
    private String categoryName;
    private Integer totalOrders;
    private Double totalValue;
    private Integer percentage;
}
