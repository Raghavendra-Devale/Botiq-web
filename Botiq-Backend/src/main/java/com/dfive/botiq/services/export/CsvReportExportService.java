package com.dfive.botiq.services.export;

import com.dfive.botiq.dto.report.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;

@Service
public class CsvReportExportService {

    public byte[] exportToCsv(OperationalReportResponse report) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(out, true, StandardCharsets.UTF_8);

        // 1. Operational Summary
        writer.println("OPERATIONAL REPORT SUMMARY");
        writer.println("Total Orders,Completed Orders,Revenue,Overdue Orders,Pending Payments");
        OperationalReportSummaryDto summary = report.getSummary();
        if (summary != null) {
            writer.printf("%d,%d,%.2f,%d,%.2f%n",
                    summary.getTotalOrders() != null ? summary.getTotalOrders() : 0,
                    summary.getCompletedOrders() != null ? summary.getCompletedOrders() : 0,
                    summary.getRevenue() != null ? summary.getRevenue() : 0.0,
                    summary.getOverdueOrders() != null ? summary.getOverdueOrders() : 0,
                    summary.getPendingPayments() != null ? summary.getPendingPayments() : 0.0);
        }
        writer.println();

        // 2. Order Status Details
        writer.println("ORDER STATUS DETAILS");
        writer.println("Order ID,Date,Customer Name,Due Date,Status,Amount,Payment Status,Partner,Category");
        if (report.getTableData() != null) {
            for (ReportOrderDto order : report.getTableData()) {
                writer.printf("%s,%s,\"%s\",%s,%s,%.2f,%s,\"%s\",\"%s\"%n",
                        escapeCsv(order.getOrderId()),
                        escapeCsv(order.getDate()),
                        escapeCsv(order.getCustomerName()),
                        escapeCsv(order.getDueDate()),
                        escapeCsv(order.getStatus()),
                        order.getAmount() != null ? order.getAmount() : 0.0,
                        escapeCsv(order.getPaymentStatus()),
                        escapeCsv(order.getPartner()),
                        escapeCsv(order.getCategory()));
            }
        }
        writer.println();

        // 3. Partner Workload Summary
        writer.println("PARTNER WORKLOAD SUMMARY");
        writer.println("Partner Name,Total Orders,Active Orders,Completed Orders,Revenue Handled,Success Rate (%)");
        if (report.getPartnerWorkload() != null) {
            for (PartnerWorkloadDto partner : report.getPartnerWorkload()) {
                writer.printf("\"%s\",%d,%d,%d,%.2f,%d%%%n",
                        escapeCsv(partner.getPartnerName()),
                        partner.getTotalOrders() != null ? partner.getTotalOrders() : 0,
                        partner.getActiveOrders() != null ? partner.getActiveOrders() : 0,
                        partner.getCompletedOrders() != null ? partner.getCompletedOrders() : 0,
                        partner.getRevenueHandled() != null ? partner.getRevenueHandled() : 0.0,
                        partner.getSuccessRate() != null ? partner.getSuccessRate() : 0);
            }
        }
        writer.println();

        // 4. Category Summary
        writer.println("CATEGORY SUMMARY");
        writer.println("Category Name,Total Orders,Total Value,Percentage Share (%)");
        if (report.getCategorySummary() != null) {
            for (CategorySummaryDto category : report.getCategorySummary()) {
                writer.printf("\"%s\",%d,%.2f,%d%%%n",
                        escapeCsv(category.getCategoryName()),
                        category.getTotalOrders() != null ? category.getTotalOrders() : 0,
                        category.getTotalValue() != null ? category.getTotalValue() : 0.0,
                        category.getPercentage() != null ? category.getPercentage() : 0);
            }
        }
        writer.println();

        // 5. Overdue Orders List
        writer.println("OVERDUE ORDERS LIST");
        writer.println("Order ID,Customer Name,Due Date,Delay Days,Amount");
        if (report.getOverdueOrdersList() != null) {
            for (OverdueOrderDto overdue : report.getOverdueOrdersList()) {
                writer.printf("%s,\"%s\",%s,%d,%.2f%n",
                        escapeCsv(overdue.getOrderId()),
                        escapeCsv(overdue.getCustomerName()),
                        escapeCsv(overdue.getDueDate()),
                        overdue.getDelayDays() != null ? overdue.getDelayDays() : 0,
                        overdue.getAmount() != null ? overdue.getAmount() : 0.0);
            }
        }
        writer.println();

        // 6. Pending Payments List
        writer.println("PENDING PAYMENTS LIST");
        writer.println("Order ID,Customer Name,Total Amount,Pending Amount,Payment Status");
        if (report.getPendingPaymentsList() != null) {
            for (PendingPaymentDto pending : report.getPendingPaymentsList()) {
                writer.printf("%s,\"%s\",%.2f,%.2f,%s%n",
                        escapeCsv(pending.getOrderId()),
                        escapeCsv(pending.getCustomerName()),
                        pending.getAmount() != null ? pending.getAmount() : 0.0,
                        pending.getPendingAmount() != null ? pending.getPendingAmount() : 0.0,
                        escapeCsv(pending.getPaymentStatus()));
            }
        }

        writer.flush();
        return out.toByteArray();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }
}
