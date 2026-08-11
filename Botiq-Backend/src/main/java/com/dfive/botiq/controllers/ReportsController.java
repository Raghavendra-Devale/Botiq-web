package com.dfive.botiq.controllers;

import com.dfive.botiq.dto.report.OperationalReportResponse;
import com.dfive.botiq.entities.UserPrincipal;
import com.dfive.botiq.services.OperationalReportService;
import com.dfive.botiq.services.export.CsvReportExportService;
import com.dfive.botiq.services.export.ExcelReportExportService;
import com.dfive.botiq.services.export.PdfReportExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RequestMapping("/web/reports")
@RestController
public class ReportsController {

    @Autowired
    private OperationalReportService operationalReportService;

    @Autowired
    private CsvReportExportService csvReportExportService;

    @Autowired
    private ExcelReportExportService excelReportExportService;

    @Autowired
    private PdfReportExportService pdfReportExportService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UserPrincipal getUserPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) auth.getPrincipal();
        }
        throw new org.springframework.security.authentication.BadCredentialsException(
                "User session is invalid or expired");
    }

    @GetMapping("/dailyReport")
    public ResponseEntity<?> dailyReport(@RequestParam(required = false) String date) {
        UserPrincipal principal = getUserPrincipal();
        Integer orgId = principal.getOrgId();

        String reportsQuery = "SELECT * FROM botiq_order_w WHERE org_id = ? AND order_date = CAST(? AS date)";
        List<Map<String, Object>> reports = jdbcTemplate.queryForList(reportsQuery, orgId, date);
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/operational")
    public ResponseEntity<?> getOperationalReport(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            UserPrincipal principal = getUserPrincipal();
            OperationalReportResponse response = operationalReportService.generateOperationalReport(principal.getOrgId(), startDate, endDate);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error retrieving operational report: " + e.getMessage());
        }
    }

    @GetMapping("/operational/export/csv")
    public ResponseEntity<?> exportOperationalReportCsv(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            UserPrincipal principal = getUserPrincipal();
            OperationalReportResponse response = operationalReportService.generateOperationalReport(principal.getOrgId(), startDate, endDate);
            byte[] csvBytes = csvReportExportService.exportToCsv(response);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"operational_report.csv\"")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(csvBytes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error exporting operational report to CSV: " + e.getMessage());
        }
    }

    @GetMapping("/operational/export/excel")
    public ResponseEntity<?> exportOperationalReportExcel(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            UserPrincipal principal = getUserPrincipal();
            OperationalReportResponse response = operationalReportService.generateOperationalReport(principal.getOrgId(), startDate, endDate);
            byte[] excelBytes = excelReportExportService.exportToExcel(response);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"operational_report.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error exporting operational report to Excel: " + e.getMessage());
        }
    }

    @GetMapping("/operational/export/pdf")
    public ResponseEntity<?> exportOperationalReportPdf(
            @RequestParam String startDate,
            @RequestParam String endDate) {
        try {
            UserPrincipal principal = getUserPrincipal();
            OperationalReportResponse response = operationalReportService.generateOperationalReport(principal.getOrgId(), startDate, endDate);
            byte[] pdfBytes = pdfReportExportService.exportToPdf(response);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"operational_report.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error exporting operational report to PDF: " + e.getMessage());
        }
    }
}
