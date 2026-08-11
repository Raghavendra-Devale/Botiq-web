package com.dfive.botiq.services;

import com.dfive.botiq.dto.report.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class OperationalReportService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper mapper = new ObjectMapper();

    public OperationalReportResponse generateOperationalReport(Integer orgId, String startDate, String endDate) {
        validateInputs(orgId, startDate, endDate);

        // 1. KPI Summary Cards
        OperationalReportSummaryDto summary = fetchSummary(orgId, startDate, endDate);

        // 2. Detailed Orders (Table Data)
        List<ReportOrderDto> tableData = fetchTableData(orgId, startDate, endDate);

        // 3. Partner Workload Summary
        List<PartnerWorkloadDto> partnerWorkload = fetchPartnerWorkload(orgId, startDate, endDate);

        // 4. Category Summary (aggregated in memory from tableData categories)
        List<CategorySummaryDto> categorySummary = calculateCategorySummary(tableData);

        // 5. Overdue Orders List
        List<OverdueOrderDto> overdueOrdersList = fetchOverdueOrders(orgId);

        // 6. Pending Payments List
        List<PendingPaymentDto> pendingPaymentsList = fetchPendingPayments(orgId, startDate, endDate);

        return OperationalReportResponse.builder()
                .summary(summary)
                .tableData(tableData)
                .partnerWorkload(partnerWorkload)
                .categorySummary(categorySummary)
                .overdueOrdersList(overdueOrdersList)
                .pendingPaymentsList(pendingPaymentsList)
                .build();
    }

    private void validateInputs(Integer orgId, String startDate, String endDate) {
        if (orgId == null) {
            throw new IllegalArgumentException("Organization ID must not be null.");
        }
        if (startDate == null || startDate.trim().isEmpty()) {
            throw new IllegalArgumentException("Start date is required.");
        }
        if (endDate == null || endDate.trim().isEmpty()) {
            throw new IllegalArgumentException("End date is required.");
        }

        try {
            LocalDate start = LocalDate.parse(startDate.trim());
            LocalDate end = LocalDate.parse(endDate.trim());
            if (start.isAfter(end)) {
                throw new IllegalArgumentException("Start date cannot be after end date.");
            }
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date format. Expected YYYY-MM-DD.");
        }
    }

    private OperationalReportSummaryDto fetchSummary(Integer orgId, String startDate, String endDate) {
        String totalOrdersSql = "SELECT COUNT(*) FROM botiq_order_w WHERE org_id = ? AND order_date >= CAST(? AS date) AND order_date <= CAST(? AS date)";
        Integer totalOrders = jdbcTemplate.queryForObject(totalOrdersSql, Integer.class, orgId, startDate, endDate);

        String completedOrdersSql = "SELECT COUNT(*) FROM botiq_order_w WHERE org_id = ? AND LOWER(order_status) IN ('delivered', 'completed') AND order_date >= CAST(? AS date) AND order_date <= CAST(? AS date)";
        Integer completedOrders = jdbcTemplate.queryForObject(completedOrdersSql, Integer.class, orgId, startDate, endDate);

        String revenueSql = "SELECT COALESCE(SUM(order_amount), 0) FROM botiq_order_w WHERE org_id = ? AND order_date >= CAST(? AS date) AND order_date <= CAST(? AS date)";
        Double revenue = jdbcTemplate.queryForObject(revenueSql, Double.class, orgId, startDate, endDate);

        String overdueSql = "SELECT COUNT(*) FROM botiq_order_w WHERE org_id = ? AND LOWER(order_status) NOT IN ('delivered', 'completed', 'cancelled') AND due_date < CURRENT_DATE";
        Integer overdueOrders = jdbcTemplate.queryForObject(overdueSql, Integer.class, orgId);

        String pendingPaySql = "SELECT COALESCE(SUM(due_amount), 0) FROM botiq_order_w WHERE org_id = ? AND due_amount > 0 AND order_date >= CAST(? AS date) AND order_date <= CAST(? AS date)";
        Double pendingPayments = jdbcTemplate.queryForObject(pendingPaySql, Double.class, orgId, startDate, endDate);

        return OperationalReportSummaryDto.builder()
                .totalOrders(totalOrders != null ? totalOrders : 0)
                .completedOrders(completedOrders != null ? completedOrders : 0)
                .revenue(revenue != null ? revenue : 0.0)
                .overdueOrders(overdueOrders != null ? overdueOrders : 0)
                .pendingPayments(pendingPayments != null ? pendingPayments : 0.0)
                .build();
    }

    private List<ReportOrderDto> fetchTableData(Integer orgId, String startDate, String endDate) {
        String ordersSql = "SELECT o.order_id, o.order_date, c.customer_name, o.order_details, o.due_date, o.order_status, o.order_amount, o.payment_status, o.due_amount, p.partner_name " +
                "FROM botiq_order_w o " +
                "LEFT JOIN botiq_customer_w c ON o.customer_id = c.customer_id " +
                "LEFT JOIN botiq_job_order_w j ON o.order_id = j.order_id " +
                "LEFT JOIN botiq_partner_w p ON j.partner_id = p.partner_id " +
                "WHERE o.org_id = ? AND o.order_date >= CAST(? AS date) AND o.order_date <= CAST(? AS date) " +
                "ORDER BY o.order_date DESC";

        List<Map<String, Object>> rawOrders = jdbcTemplate.queryForList(ordersSql, orgId, startDate, endDate);
        List<ReportOrderDto> tableData = new ArrayList<>();

        for (Map<String, Object> row : rawOrders) {
            String category = extractCategory((String) row.get("order_details"));
            Number amountNum = (Number) row.get("order_amount");
            Double amount = amountNum != null ? amountNum.doubleValue() : 0.0;
            Number dueNum = (Number) row.get("due_amount");
            String paymentStatus = mapPaymentStatus(row.get("payment_status"), dueNum, amountNum);

            ReportOrderDto dto = ReportOrderDto.builder()
                    .orderId("ORD-" + row.get("order_id"))
                    .date(row.get("order_date") != null ? row.get("order_date").toString() : "")
                    .customerName(row.get("customer_name") != null ? row.get("customer_name").toString() : "Walk-in Customer")
                    .dueDate(row.get("due_date") != null ? row.get("due_date").toString() : "")
                    .status(row.get("order_status") != null ? row.get("order_status").toString() : "Pending")
                    .amount(amount)
                    .paymentStatus(paymentStatus)
                    .partner(row.get("partner_name") != null ? row.get("partner_name").toString() : "In-House")
                    .category(category)
                    .build();

            tableData.add(dto);
        }

        return tableData;
    }

    private List<PartnerWorkloadDto> fetchPartnerWorkload(Integer orgId, String startDate, String endDate) {
        String partnerSql = "SELECT p.partner_name, COUNT(j.job_id) as total_orders, " +
                "SUM(CASE WHEN LOWER(j.job_order_status) NOT IN ('completed', 'delivered', 'cancelled') THEN 1 ELSE 0 END) as active_orders, " +
                "SUM(CASE WHEN LOWER(j.job_order_status) IN ('completed', 'delivered') THEN 1 ELSE 0 END) as completed_orders, " +
                "COALESCE(SUM(o.order_amount), 0) as revenue_handled " +
                "FROM botiq_partner_w p " +
                "JOIN botiq_job_order_w j ON p.partner_id = j.partner_id " +
                "LEFT JOIN botiq_order_w o ON j.order_id = o.order_id " +
                "WHERE p.org_id = ? AND o.order_date >= CAST(? AS date) AND o.order_date <= CAST(? AS date) " +
                "GROUP BY p.partner_name, p.partner_id";

        List<Map<String, Object>> partnerList = jdbcTemplate.queryForList(partnerSql, orgId, startDate, endDate);
        List<PartnerWorkloadDto> partnerWorkload = new ArrayList<>();

        for (Map<String, Object> row : partnerList) {
            long total = row.get("total_orders") != null ? ((Number) row.get("total_orders")).longValue() : 0L;
            long completed = row.get("completed_orders") != null ? ((Number) row.get("completed_orders")).longValue() : 0L;
            int active = row.get("active_orders") != null ? ((Number) row.get("active_orders")).intValue() : 0;
            double revenue = row.get("revenue_handled") != null ? ((Number) row.get("revenue_handled")).doubleValue() : 0.0;
            long rate = total > 0 ? (completed * 100) / total : 100;

            PartnerWorkloadDto dto = PartnerWorkloadDto.builder()
                    .partnerName(row.get("partner_name") != null ? row.get("partner_name").toString() : "")
                    .totalOrders(total)
                    .activeOrders(active)
                    .completedOrders(completed)
                    .revenueHandled(revenue)
                    .successRate(rate)
                    .build();

            partnerWorkload.add(dto);
        }

        return partnerWorkload;
    }

    private List<CategorySummaryDto> calculateCategorySummary(List<ReportOrderDto> tableData) {
        Map<String, Integer> catCounts = new HashMap<>();
        Map<String, Double> catValues = new HashMap<>();
        int grandTotalOrders = 0;

        for (ReportOrderDto order : tableData) {
            String cat = order.getCategory() != null ? order.getCategory() : "General";
            Double amt = order.getAmount() != null ? order.getAmount() : 0.0;

            catCounts.put(cat, catCounts.getOrDefault(cat, 0) + 1);
            catValues.put(cat, catValues.getOrDefault(cat, 0.0) + amt);
            grandTotalOrders++;
        }

        List<CategorySummaryDto> categorySummary = new ArrayList<>();
        for (String cat : catCounts.keySet()) {
            int count = catCounts.get(cat);
            int share = grandTotalOrders > 0 ? (count * 100) / grandTotalOrders : 0;

            CategorySummaryDto dto = CategorySummaryDto.builder()
                    .categoryName(cat)
                    .totalOrders(count)
                    .totalValue(catValues.get(cat))
                    .percentage(share)
                    .build();

            categorySummary.add(dto);
        }

        return categorySummary;
    }

    private List<OverdueOrderDto> fetchOverdueOrders(Integer orgId) {
        String overdueListSql = "SELECT o.order_id, c.customer_name, o.due_date, o.order_amount, " +
                "CURRENT_DATE - o.due_date as delay_days " +
                "FROM botiq_order_w o " +
                "LEFT JOIN botiq_customer_w c ON o.customer_id = c.customer_id " +
                "WHERE o.org_id = ? AND LOWER(o.order_status) NOT IN ('delivered', 'completed', 'cancelled') AND o.due_date < CURRENT_DATE " +
                "ORDER BY delay_days DESC";

        List<Map<String, Object>> rawOverdue = jdbcTemplate.queryForList(overdueListSql, orgId);
        List<OverdueOrderDto> overdueOrdersList = new ArrayList<>();

        for (Map<String, Object> row : rawOverdue) {
            Number delayNum = (Number) row.get("delay_days");
            Number amountNum = (Number) row.get("order_amount");

            OverdueOrderDto dto = OverdueOrderDto.builder()
                    .orderId("ORD-" + row.get("order_id"))
                    .customerName(row.get("customer_name") != null ? row.get("customer_name").toString() : "Walk-in Customer")
                    .dueDate(row.get("due_date") != null ? row.get("due_date").toString() : "")
                    .delayDays(delayNum != null ? delayNum.intValue() : 0)
                    .amount(amountNum != null ? amountNum.doubleValue() : 0.0)
                    .build();

            overdueOrdersList.add(dto);
        }

        return overdueOrdersList;
    }

    private List<PendingPaymentDto> fetchPendingPayments(Integer orgId, String startDate, String endDate) {
        String pendingPayListSql = "SELECT o.order_id, c.customer_name, o.order_amount, o.due_amount, o.payment_status " +
                "FROM botiq_order_w o " +
                "LEFT JOIN botiq_customer_w c ON o.customer_id = c.customer_id " +
                "WHERE o.org_id = ? AND o.due_amount > 0 AND o.order_date >= CAST(? AS date) AND o.order_date <= CAST(? AS date) " +
                "ORDER BY o.due_amount DESC";

        List<Map<String, Object>> rawPendingPay = jdbcTemplate.queryForList(pendingPayListSql, orgId, startDate, endDate);
        List<PendingPaymentDto> pendingPaymentsList = new ArrayList<>();

        for (Map<String, Object> row : rawPendingPay) {
            Number amountNum = (Number) row.get("order_amount");
            Number dueNum = (Number) row.get("due_amount");

            PendingPaymentDto dto = PendingPaymentDto.builder()
                    .orderId("ORD-" + row.get("order_id"))
                    .customerName(row.get("customer_name") != null ? row.get("customer_name").toString() : "Walk-in Customer")
                    .amount(amountNum != null ? amountNum.doubleValue() : 0.0)
                    .pendingAmount(dueNum != null ? dueNum.doubleValue() : 0.0)
                    .paymentStatus(mapPaymentStatus(row.get("payment_status"), dueNum, amountNum))
                    .build();

            pendingPaymentsList.add(dto);
        }

        return pendingPaymentsList;
    }

    private String extractCategory(String detailsStr) {
        String category = "General";
        if (detailsStr != null && !detailsStr.trim().isEmpty()) {
            try {
                if (detailsStr.trim().startsWith("[")) {
                    List<?> items = mapper.readValue(detailsStr, List.class);
                    if (!items.isEmpty() && items.get(0) instanceof Map) {
                        Map<?, ?> firstItem = (Map<?, ?>) items.get(0);
                        if (firstItem.containsKey("itemName")) {
                            category = (String) firstItem.get("itemName");
                        }
                    }
                } else if (detailsStr.trim().startsWith("{")) {
                    Map<?, ?> detailObj = mapper.readValue(detailsStr, Map.class);
                    if (detailObj.containsKey("itemName")) {
                        category = (String) detailObj.get("itemName");
                    } else if (detailObj.containsKey("items")) {
                        List<?> itemsList = (List<?>) detailObj.get("items");
                        if (!itemsList.isEmpty() && itemsList.get(0) instanceof Map) {
                            Map<?, ?> itemMap = (Map<?, ?>) itemsList.get(0);
                            if (itemMap.containsKey("itemName")) {
                                category = (String) itemMap.get("itemName");
                            }
                        }
                    }
                }
            } catch (Exception parseEx) {
                // Return default fallback "General" on JSON parse exception
            }
        }
        return category;
    }

    private String mapPaymentStatus(Object statusObj, Number dueAmount, Number orderAmount) {
        if (statusObj == null) {
            if (dueAmount != null && orderAmount != null) {
                double due = dueAmount.doubleValue();
                double total = orderAmount.doubleValue();
                if (due <= 0) return "Paid";
                if (due == total) return "Unpaid";
                return "Partial";
            }
            return "Unpaid";
        }

        int statusVal;
        if (statusObj instanceof Number) {
            statusVal = ((Number) statusObj).intValue();
        } else {
            try {
                statusVal = Integer.parseInt(statusObj.toString());
            } catch (Exception e) {
                return "Unpaid";
            }
        }

        if (statusVal == 2) {
            return "Paid";
        } else if (statusVal == 1) {
            return "Partial";
        } else {
            return "Unpaid";
        }
    }
}
