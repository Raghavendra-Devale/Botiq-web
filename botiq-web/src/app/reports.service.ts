import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  baseUrl = '';

  constructor(private http: HttpClient) {
    this.baseUrl = environment.apiUrl;
  }

  getDailyReport(date: any) {
    if (date == null) {
      return this.http.get<any>(this.baseUrl + "/reports/dailyReport");
    }

    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      // If it is already a YYYY-MM-DD string, return it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return this.http.get<any>(this.baseUrl + "/reports/dailyReport?date=" + date);
      }
      dateObj = new Date(date);
    } else {
      return this.http.get<any>(this.baseUrl + "/reports/dailyReport");
    }

    // Verify it is a valid date object
    if (isNaN(dateObj.getTime())) {
      return this.http.get<any>(this.baseUrl + "/reports/dailyReport");
    }

    // Format as YYYY-MM-DD in local time to avoid UTC day shift
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    return this.http.get<any>(this.baseUrl + "/reports/dailyReport?date=" + formattedDate);
  }

  getOperationalReport(startDate: string, endDate: string) {
    return this.http.get<any>(this.baseUrl + `/reports/operational?startDate=${startDate}&endDate=${endDate}`);
  }

  getOperationalReportExportUrl(format: 'CSV' | 'Excel' | 'PDF', startDate: string, endDate: string): string {
    const fmt = format.toLowerCase();
    return `${this.baseUrl}/reports/operational/export/${fmt}?startDate=${startDate}&endDate=${endDate}`;
  }

  downloadOperationalReportCsv(startDate: string, endDate: string) {
    return this.http.get(this.baseUrl + `/reports/operational/export/csv?startDate=${startDate}&endDate=${endDate}`, {
      responseType: 'blob',
    });
  }

  downloadOperationalReportExcel(startDate: string, endDate: string) {
    return this.http.get(this.baseUrl + `/reports/operational/export/excel?startDate=${startDate}&endDate=${endDate}`, {
      responseType: 'blob',
    });
  }

  downloadOperationalReportPdf(startDate: string, endDate: string) {
    return this.http.get(this.baseUrl + `/reports/operational/export/pdf?startDate=${startDate}&endDate=${endDate}`, {
      responseType: 'blob',
    });
  }
}
