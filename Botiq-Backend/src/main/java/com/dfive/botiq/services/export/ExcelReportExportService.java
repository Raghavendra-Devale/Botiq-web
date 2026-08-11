package com.dfive.botiq.services.export;

import com.dfive.botiq.dto.report.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ExcelReportExportService {

    public byte[] exportToExcel(OperationalReportResponse report) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            // Sheet 1: Summary & Orders
            Sheet mainSheet = workbook.createSheet("Orders & Summary");
            int rowIdx = 0;

            // Title
            Row titleRow = mainSheet.createRow(rowIdx++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("OPERATIONAL REPORT SUMMARY");
            titleCell.setCellStyle(titleStyle);

            rowIdx++; // Empty row

            // Summary Table
            Row sumHeader = mainSheet.createRow(rowIdx++);
            String[] sumHeaders = {"Total Orders", "Completed Orders", "Revenue", "Overdue Orders", "Pending Payments"};
            for (int i = 0; i < sumHeaders.length; i++) {
                Cell cell = sumHeader.createCell(i);
                cell.setCellValue(sumHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            OperationalReportSummaryDto summary = report.getSummary();
            if (summary != null) {
                Row sumData = mainSheet.createRow(rowIdx++);
                sumData.createCell(0).setCellValue(summary.getTotalOrders() != null ? summary.getTotalOrders() : 0);
                sumData.createCell(1).setCellValue(summary.getCompletedOrders() != null ? summary.getCompletedOrders() : 0);
                
                Cell revCell = sumData.createCell(2);
                revCell.setCellValue(summary.getRevenue() != null ? summary.getRevenue() : 0.0);
                revCell.setCellStyle(currencyStyle);

                sumData.createCell(3).setCellValue(summary.getOverdueOrders() != null ? summary.getOverdueOrders() : 0);

                Cell pendCell = sumData.createCell(4);
                pendCell.setCellValue(summary.getPendingPayments() != null ? summary.getPendingPayments() : 0.0);
                pendCell.setCellStyle(currencyStyle);
            }

            rowIdx += 2; // Empty rows

            // Detailed Orders Table Header
            Row orderTitleRow = mainSheet.createRow(rowIdx++);
            Cell orderTitleCell = orderTitleRow.createCell(0);
            orderTitleCell.setCellValue("ORDER STATUS DETAILS");
            orderTitleCell.setCellStyle(titleStyle);

            Row orderHeader = mainSheet.createRow(rowIdx++);
            String[] orderHeaders = {"Order ID", "Date", "Customer Name", "Due Date", "Status", "Amount", "Payment Status", "Partner", "Category"};
            for (int i = 0; i < orderHeaders.length; i++) {
                Cell cell = orderHeader.createCell(i);
                cell.setCellValue(orderHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            if (report.getTableData() != null) {
                for (ReportOrderDto order : report.getTableData()) {
                    Row dataRow = mainSheet.createRow(rowIdx++);
                    dataRow.createCell(0).setCellValue(order.getOrderId() != null ? order.getOrderId() : "");
                    dataRow.createCell(1).setCellValue(order.getDate() != null ? order.getDate() : "");
                    dataRow.createCell(2).setCellValue(order.getCustomerName() != null ? order.getCustomerName() : "");
                    dataRow.createCell(3).setCellValue(order.getDueDate() != null ? order.getDueDate() : "");
                    dataRow.createCell(4).setCellValue(order.getStatus() != null ? order.getStatus() : "");
                    
                    Cell amtCell = dataRow.createCell(5);
                    amtCell.setCellValue(order.getAmount() != null ? order.getAmount() : 0.0);
                    amtCell.setCellStyle(currencyStyle);

                    dataRow.createCell(6).setCellValue(order.getPaymentStatus() != null ? order.getPaymentStatus() : "");
                    dataRow.createCell(7).setCellValue(order.getPartner() != null ? order.getPartner() : "");
                    dataRow.createCell(8).setCellValue(order.getCategory() != null ? order.getCategory() : "");
                }
            }

            autoSizeColumns(mainSheet, orderHeaders.length);

            // Sheet 2: Partner Workload
            Sheet partnerSheet = workbook.createSheet("Partner Workload");
            int pRowIdx = 0;

            Row pTitleRow = partnerSheet.createRow(pRowIdx++);
            Cell pTitleCell = pTitleRow.createCell(0);
            pTitleCell.setCellValue("PARTNER WORKLOAD SUMMARY");
            pTitleCell.setCellStyle(titleStyle);

            Row pHeader = partnerSheet.createRow(pRowIdx++);
            String[] pHeaders = {"Partner Name", "Total Orders", "Active Orders", "Completed Orders", "Revenue Handled", "Success Rate (%)"};
            for (int i = 0; i < pHeaders.length; i++) {
                Cell cell = pHeader.createCell(i);
                cell.setCellValue(pHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            if (report.getPartnerWorkload() != null) {
                for (PartnerWorkloadDto partner : report.getPartnerWorkload()) {
                    Row dataRow = partnerSheet.createRow(pRowIdx++);
                    dataRow.createCell(0).setCellValue(partner.getPartnerName() != null ? partner.getPartnerName() : "");
                    dataRow.createCell(1).setCellValue(partner.getTotalOrders() != null ? partner.getTotalOrders() : 0);
                    dataRow.createCell(2).setCellValue(partner.getActiveOrders() != null ? partner.getActiveOrders() : 0);
                    dataRow.createCell(3).setCellValue(partner.getCompletedOrders() != null ? partner.getCompletedOrders() : 0);

                    Cell revCell = dataRow.createCell(4);
                    revCell.setCellValue(partner.getRevenueHandled() != null ? partner.getRevenueHandled() : 0.0);
                    revCell.setCellStyle(currencyStyle);

                    dataRow.createCell(5).setCellValue((partner.getSuccessRate() != null ? partner.getSuccessRate() : 0) + "%");
                }
            }

            autoSizeColumns(partnerSheet, pHeaders.length);

            // Sheet 3: Category & Pending/Overdue
            Sheet catSheet = workbook.createSheet("Category & Pending");
            int cRowIdx = 0;

            Row cTitleRow = catSheet.createRow(cRowIdx++);
            Cell cTitleCell = cTitleRow.createCell(0);
            cTitleCell.setCellValue("CATEGORY BREAKDOWN");
            cTitleCell.setCellStyle(titleStyle);

            Row cHeader = catSheet.createRow(cRowIdx++);
            String[] cHeaders = {"Category Name", "Total Orders", "Total Value", "Percentage Share (%)"};
            for (int i = 0; i < cHeaders.length; i++) {
                Cell cell = cHeader.createCell(i);
                cell.setCellValue(cHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            if (report.getCategorySummary() != null) {
                for (CategorySummaryDto category : report.getCategorySummary()) {
                    Row dataRow = catSheet.createRow(cRowIdx++);
                    dataRow.createCell(0).setCellValue(category.getCategoryName() != null ? category.getCategoryName() : "");
                    dataRow.createCell(1).setCellValue(category.getTotalOrders() != null ? category.getTotalOrders() : 0);

                    Cell valCell = dataRow.createCell(2);
                    valCell.setCellValue(category.getTotalValue() != null ? category.getTotalValue() : 0.0);
                    valCell.setCellStyle(currencyStyle);

                    dataRow.createCell(3).setCellValue((category.getPercentage() != null ? category.getPercentage() : 0) + "%");
                }
            }

            cRowIdx += 2;

            // Overdue Orders Section
            Row oTitleRow = catSheet.createRow(cRowIdx++);
            Cell oTitleCell = oTitleRow.createCell(0);
            oTitleCell.setCellValue("OVERDUE ORDERS LIST");
            oTitleCell.setCellStyle(titleStyle);

            Row oHeader = catSheet.createRow(cRowIdx++);
            String[] oHeaders = {"Order ID", "Customer Name", "Due Date", "Delay Days", "Amount"};
            for (int i = 0; i < oHeaders.length; i++) {
                Cell cell = oHeader.createCell(i);
                cell.setCellValue(oHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            if (report.getOverdueOrdersList() != null) {
                for (OverdueOrderDto overdue : report.getOverdueOrdersList()) {
                    Row dataRow = catSheet.createRow(cRowIdx++);
                    dataRow.createCell(0).setCellValue(overdue.getOrderId() != null ? overdue.getOrderId() : "");
                    dataRow.createCell(1).setCellValue(overdue.getCustomerName() != null ? overdue.getCustomerName() : "");
                    dataRow.createCell(2).setCellValue(overdue.getDueDate() != null ? overdue.getDueDate() : "");
                    dataRow.createCell(3).setCellValue(overdue.getDelayDays() != null ? overdue.getDelayDays() : 0);

                    Cell amtCell = dataRow.createCell(4);
                    amtCell.setCellValue(overdue.getAmount() != null ? overdue.getAmount() : 0.0);
                    amtCell.setCellStyle(currencyStyle);
                }
            }

            cRowIdx += 2;

            // Pending Payments Section
            Row payTitleRow = catSheet.createRow(cRowIdx++);
            Cell payTitleCell = payTitleRow.createCell(0);
            payTitleCell.setCellValue("PENDING PAYMENTS LIST");
            payTitleCell.setCellStyle(titleStyle);

            Row payHeader = catSheet.createRow(cRowIdx++);
            String[] payHeaders = {"Order ID", "Customer Name", "Total Amount", "Pending Amount", "Payment Status"};
            for (int i = 0; i < payHeaders.length; i++) {
                Cell cell = payHeader.createCell(i);
                cell.setCellValue(payHeaders[i]);
                cell.setCellStyle(headerStyle);
            }

            if (report.getPendingPaymentsList() != null) {
                for (PendingPaymentDto pending : report.getPendingPaymentsList()) {
                    Row dataRow = catSheet.createRow(cRowIdx++);
                    dataRow.createCell(0).setCellValue(pending.getOrderId() != null ? pending.getOrderId() : "");
                    dataRow.createCell(1).setCellValue(pending.getCustomerName() != null ? pending.getCustomerName() : "");

                    Cell amtCell = dataRow.createCell(2);
                    amtCell.setCellValue(pending.getAmount() != null ? pending.getAmount() : 0.0);
                    amtCell.setCellStyle(currencyStyle);

                    Cell pendCell = dataRow.createCell(3);
                    pendCell.setCellValue(pending.getPendingAmount() != null ? pending.getPendingAmount() : 0.0);
                    pendCell.setCellStyle(currencyStyle);

                    dataRow.createCell(4).setCellValue(pending.getPaymentStatus() != null ? pending.getPaymentStatus() : "");
                }
            }

            autoSizeColumns(catSheet, 5);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error generating Excel report: " + e.getMessage(), e);
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        return style;
    }

    private void autoSizeColumns(Sheet sheet, int numCols) {
        for (int i = 0; i < numCols; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}
