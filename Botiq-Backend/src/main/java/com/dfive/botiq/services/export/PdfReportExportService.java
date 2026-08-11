package com.dfive.botiq.services.export;

import com.dfive.botiq.dto.report.*;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

@Service
public class PdfReportExportService {

    public byte[] exportToPdf(OperationalReportResponse report) {
        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.DARK_GRAY);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(41, 128, 185));
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

            // Document Title
            Paragraph title = new Paragraph("Operational Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            // 1. Summary Cards Section
            document.add(new Paragraph("Summary", sectionFont));
            document.add(new Paragraph(" "));
            
            PdfPTable summaryTable = new PdfPTable(5);
            summaryTable.setWidthPercentage(100);
            String[] summaryHeaders = {"Total Orders", "Completed Orders", "Revenue", "Overdue Orders", "Pending Payments"};
            for (String h : summaryHeaders) {
                summaryTable.addCell(createHeaderCell(h, headerFont));
            }

            OperationalReportSummaryDto summary = report.getSummary();
            if (summary != null) {
                summaryTable.addCell(createDataCell(String.valueOf(summary.getTotalOrders() != null ? summary.getTotalOrders() : 0), cellFont));
                summaryTable.addCell(createDataCell(String.valueOf(summary.getCompletedOrders() != null ? summary.getCompletedOrders() : 0), cellFont));
                summaryTable.addCell(createDataCell(String.format("%.2f", summary.getRevenue() != null ? summary.getRevenue() : 0.0), cellFont));
                summaryTable.addCell(createDataCell(String.valueOf(summary.getOverdueOrders() != null ? summary.getOverdueOrders() : 0), cellFont));
                summaryTable.addCell(createDataCell(String.format("%.2f", summary.getPendingPayments() != null ? summary.getPendingPayments() : 0.0), cellFont));
            }
            document.add(summaryTable);
            document.add(new Paragraph(" "));

            // 2. Order Status Details
            document.add(new Paragraph("Order Status Details", sectionFont));
            document.add(new Paragraph(" "));

            PdfPTable orderTable = new PdfPTable(9);
            orderTable.setWidthPercentage(100);
            orderTable.setWidths(new float[]{1.2f, 1.2f, 2.0f, 1.2f, 1.2f, 1.2f, 1.2f, 1.5f, 1.5f});
            String[] orderHeaders = {"Order ID", "Date", "Customer", "Due Date", "Status", "Amount", "Payment", "Partner", "Category"};
            for (String h : orderHeaders) {
                orderTable.addCell(createHeaderCell(h, headerFont));
            }

            if (report.getTableData() != null) {
                for (ReportOrderDto order : report.getTableData()) {
                    orderTable.addCell(createDataCell(order.getOrderId(), cellFont));
                    orderTable.addCell(createDataCell(order.getDate(), cellFont));
                    orderTable.addCell(createDataCell(order.getCustomerName(), cellFont));
                    orderTable.addCell(createDataCell(order.getDueDate(), cellFont));
                    orderTable.addCell(createDataCell(order.getStatus(), cellFont));
                    orderTable.addCell(createDataCell(String.format("%.2f", order.getAmount() != null ? order.getAmount() : 0.0), cellFont));
                    orderTable.addCell(createDataCell(order.getPaymentStatus(), cellFont));
                    orderTable.addCell(createDataCell(order.getPartner(), cellFont));
                    orderTable.addCell(createDataCell(order.getCategory(), cellFont));
                }
            }
            document.add(orderTable);
            document.add(new Paragraph(" "));

            // 3. Partner Workload Summary
            document.add(new Paragraph("Partner Workload Summary", sectionFont));
            document.add(new Paragraph(" "));

            PdfPTable partnerTable = new PdfPTable(6);
            partnerTable.setWidthPercentage(100);
            String[] partnerHeaders = {"Partner Name", "Total Orders", "Active Orders", "Completed Orders", "Revenue Handled", "Success Rate"};
            for (String h : partnerHeaders) {
                partnerTable.addCell(createHeaderCell(h, headerFont));
            }

            if (report.getPartnerWorkload() != null) {
                for (PartnerWorkloadDto p : report.getPartnerWorkload()) {
                    partnerTable.addCell(createDataCell(p.getPartnerName(), cellFont));
                    partnerTable.addCell(createDataCell(String.valueOf(p.getTotalOrders() != null ? p.getTotalOrders() : 0), cellFont));
                    partnerTable.addCell(createDataCell(String.valueOf(p.getActiveOrders() != null ? p.getActiveOrders() : 0), cellFont));
                    partnerTable.addCell(createDataCell(String.valueOf(p.getCompletedOrders() != null ? p.getCompletedOrders() : 0), cellFont));
                    partnerTable.addCell(createDataCell(String.format("%.2f", p.getRevenueHandled() != null ? p.getRevenueHandled() : 0.0), cellFont));
                    partnerTable.addCell(createDataCell((p.getSuccessRate() != null ? p.getSuccessRate() : 0) + "%", cellFont));
                }
            }
            document.add(partnerTable);
            document.add(new Paragraph(" "));

            // 4. Category Summary
            document.add(new Paragraph("Category Breakdown", sectionFont));
            document.add(new Paragraph(" "));

            PdfPTable catTable = new PdfPTable(4);
            catTable.setWidthPercentage(100);
            String[] catHeaders = {"Category Name", "Total Orders", "Total Value", "Share (%)"};
            for (String h : catHeaders) {
                catTable.addCell(createHeaderCell(h, headerFont));
            }

            if (report.getCategorySummary() != null) {
                for (CategorySummaryDto c : report.getCategorySummary()) {
                    catTable.addCell(createDataCell(c.getCategoryName(), cellFont));
                    catTable.addCell(createDataCell(String.valueOf(c.getTotalOrders() != null ? c.getTotalOrders() : 0), cellFont));
                    catTable.addCell(createDataCell(String.format("%.2f", c.getTotalValue() != null ? c.getTotalValue() : 0.0), cellFont));
                    catTable.addCell(createDataCell((c.getPercentage() != null ? c.getPercentage() : 0) + "%", cellFont));
                }
            }
            document.add(catTable);
            document.add(new Paragraph(" "));

            // 5. Overdue Orders List
            document.add(new Paragraph("Overdue Orders List", sectionFont));
            document.add(new Paragraph(" "));

            PdfPTable overdueTable = new PdfPTable(5);
            overdueTable.setWidthPercentage(100);
            String[] overdueHeaders = {"Order ID", "Customer", "Due Date", "Delay Days", "Amount"};
            for (String h : overdueHeaders) {
                overdueTable.addCell(createHeaderCell(h, headerFont));
            }

            if (report.getOverdueOrdersList() != null) {
                for (OverdueOrderDto o : report.getOverdueOrdersList()) {
                    overdueTable.addCell(createDataCell(o.getOrderId(), cellFont));
                    overdueTable.addCell(createDataCell(o.getCustomerName(), cellFont));
                    overdueTable.addCell(createDataCell(o.getDueDate(), cellFont));
                    overdueTable.addCell(createDataCell(String.valueOf(o.getDelayDays() != null ? o.getDelayDays() : 0), cellFont));
                    overdueTable.addCell(createDataCell(String.format("%.2f", o.getAmount() != null ? o.getAmount() : 0.0), cellFont));
                }
            }
            document.add(overdueTable);
            document.add(new Paragraph(" "));

            // 6. Pending Payments List
            document.add(new Paragraph("Pending Payments List", sectionFont));
            document.add(new Paragraph(" "));

            PdfPTable pendingTable = new PdfPTable(5);
            pendingTable.setWidthPercentage(100);
            String[] pendingHeaders = {"Order ID", "Customer", "Total Amount", "Pending Amount", "Payment Status"};
            for (String h : pendingHeaders) {
                pendingTable.addCell(createHeaderCell(h, headerFont));
            }

            if (report.getPendingPaymentsList() != null) {
                for (PendingPaymentDto pp : report.getPendingPaymentsList()) {
                    pendingTable.addCell(createDataCell(pp.getOrderId(), cellFont));
                    pendingTable.addCell(createDataCell(pp.getCustomerName(), cellFont));
                    pendingTable.addCell(createDataCell(String.format("%.2f", pp.getAmount() != null ? pp.getAmount() : 0.0), cellFont));
                    pendingTable.addCell(createDataCell(String.format("%.2f", pp.getPendingAmount() != null ? pp.getPendingAmount() : 0.0), cellFont));
                    pendingTable.addCell(createDataCell(pp.getPaymentStatus(), cellFont));
                }
            }
            document.add(pendingTable);

            document.close();
            return out.toByteArray();

        } catch (DocumentException e) {
            throw new RuntimeException("Error generating PDF report: " + e.getMessage(), e);
        }
    }

    private PdfPCell createHeaderCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(41, 128, 185));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(6);
        return cell;
    }

    private PdfPCell createDataCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(5);
        return cell;
    }
}
