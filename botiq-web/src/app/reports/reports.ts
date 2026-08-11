import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportsService } from '../reports.service';
import * as echarts from 'echarts';

interface OrderRecord {
  orderId: string;
  date: string;
  customerName: string;
  category: string;
  partner: string;
  dueDate: string;
  status: 'Completed' | 'Pending' | 'In Progress' | 'Cancelled';
  amount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
}

interface PartnerWorkload {
  partnerName: string;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  successRate: number; // percentage
  revenueHandled: number;
}

interface CategorySummary {
  categoryName: string;
  totalOrders: number;
  percentage: number;
  totalValue: number;
}

interface OverdueOrder {
  orderId: string;
  customerName: string;
  dueDate: string;
  delayDays: number;
  amount: number;
}

interface PendingPayment {
  orderId: string;
  customerName: string;
  amount: number;
  pendingAmount: number;
  paymentStatus: 'Unpaid' | 'Partial';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  // Navigation Tabs state
  activeTab: 'order-status' | 'partner-workload' | 'category-summary' | 'alerts' = 'order-status';

  // Filters & Period State
  selectedReportType: 'daily' | 'weekly' | 'monthly' | 'custom' = 'monthly';
  reportTypes: ('daily' | 'weekly' | 'monthly' | 'custom')[] = [
    'daily', 'weekly', 'monthly', 'custom'
  ];
  customStartDate: string = '';
  customEndDate: string = '';
  
  // Table search & filter states
  searchQuery: string = '';
  statusFilter: string = 'All';
  paymentFilter: string = 'All';
  
  // Sorting & Pagination (for Order Status tab table)
  tableSortColumn: string = 'date';
  tableSortAscending: boolean = false;
  currentPage: number = 1;
  pageSize: number = 5;

  // System toast list state
  toasts: { id: number; message: string; type: string }[] = [];
  private toastIdCounter = 0;
  exportingFormat: string | null = null;
  chartInstance: echarts.ECharts | null = null;

  // Operational Summary Counters
  summary = {
    totalOrders: 0,
    completedOrders: 0,
    revenue: 0,
    overdueOrders: 0,
    pendingPayments: 0
  };

  // Active Loaded Lists
  tableData: OrderRecord[] = [];
  partnerWorkload: PartnerWorkload[] = [];
  categorySummary: CategorySummary[] = [];
  overdueOrdersList: OverdueOrder[] = [];
  pendingPaymentsList: PendingPayment[] = [];



  constructor(private reportsService: ReportsService) {}

  ngOnInit() {
    this.updateReportData();
  }

  // Reload lists when filter or report types change
  updateReportData() {
    let startDate = '';
    let endDate = '';
    const today = new Date();

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (this.selectedReportType === 'daily') {
      startDate = formatDate(today);
      endDate = formatDate(today);
    } else if (this.selectedReportType === 'weekly') {
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = formatDate(lastWeek);
      endDate = formatDate(today);
    } else if (this.selectedReportType === 'monthly') {
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = formatDate(lastMonth);
      endDate = formatDate(today);
    } else if (this.selectedReportType === 'custom') {
      if (!this.customStartDate || !this.customEndDate) {
        return; // wait for custom dates
      }
      startDate = this.customStartDate;
      endDate = this.customEndDate;
    }

    this.reportsService.getOperationalReport(startDate, endDate).subscribe({
      next: (res: any) => {
        if (res) {
          this.summary = res.summary || { totalOrders: 0, completedOrders: 0, revenue: 0, overdueOrders: 0, pendingPayments: 0 };
          this.tableData = res.tableData || [];
          this.partnerWorkload = res.partnerWorkload || [];
          this.categorySummary = res.categorySummary || [];
          this.overdueOrdersList = res.overdueOrdersList || [];
          this.pendingPaymentsList = res.pendingPaymentsList || [];
          setTimeout(() => this.initOrUpdateChart(), 0);
        }
      },
      error: (err) => {
        console.error('Error fetching operational report:', err);
        this.showToast('Failed to retrieve operational reports from the server.', 'danger');
        
        // Reset properties to empty values on connection error
        this.summary = { totalOrders: 0, completedOrders: 0, revenue: 0, overdueOrders: 0, pendingPayments: 0 };
        this.tableData = [];
        this.partnerWorkload = [];
        this.categorySummary = [];
        this.overdueOrdersList = [];
        this.pendingPaymentsList = [];
        setTimeout(() => this.initOrUpdateChart(), 0);
      }
    });

    // Reset pagination to page 1
    this.currentPage = 1;
  }

 

  initOrUpdateChart() {
    const chartDom = document.getElementById('operationalTrendChart');
    if (!chartDom) return;

    if (!this.chartInstance) {
      this.chartInstance = echarts.init(chartDom);
    }

    const chartOptions = this.generateChartOptions();
    this.chartInstance.setOption(chartOptions);
  }

  generateChartOptions() {
    const groupedData: { [key: string]: { revenue: number; count: number } } = {};
    const sortedOrders = [...this.tableData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedOrders.forEach(order => {
      let key = '';
      if (!order.date) return;
      
      const dateObj = new Date(order.date);
      if (isNaN(dateObj.getTime())) return;

      if (this.selectedReportType === 'daily') {
        const hours = dateObj.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHour = (hours % 12 || 12) + ' ' + ampm;
        key = formattedHour;
      } else if (this.selectedReportType === 'weekly') {
        key = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        key = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      }

      if (!groupedData[key]) {
        groupedData[key] = { revenue: 0, count: 0 };
      }
      groupedData[key].revenue += order.amount || 0;
      groupedData[key].count += 1;
    });

    let categories = Object.keys(groupedData);
    let revenues = categories.map(cat => groupedData[cat].revenue);
    let counts = categories.map(cat => groupedData[cat].count);

    if (categories.length === 0) {
      categories = ['No Data'];
      revenues = [0];
      counts = [0];
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
      },
      series: [
        {
          name: 'Revenue (₹)',
          type: 'bar',
          data: revenues,
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    };
  }

  // Triggers updates for custom date inputs
  onCustomDatesChanged() {
    if (this.selectedReportType === 'custom' && this.customStartDate && this.customEndDate) {
      this.updateReportData();
      this.showToast(`Custom range applied: ${this.customStartDate} to ${this.customEndDate}`, 'success');
    }
  }

  // Switch tabs
  switchTab(tab: 'order-status' | 'partner-workload' | 'category-summary' | 'alerts') {
    this.activeTab = tab;
    this.currentPage = 1;
    this.searchQuery = '';
    this.statusFilter = 'All';
    this.paymentFilter = 'All';
  }

  // Filtered detailed order records for table
  getFilteredData(): OrderRecord[] {
    let result = [...this.tableData];

    // 1. Text Search Filter (Customer name, Order ID, Partner name, Category)
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(r =>
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.partner.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }

    // 2. Order Status Filter
    if (this.statusFilter !== 'All') {
      result = result.filter(r => r.status === this.statusFilter);
    }

    // 3. Payment Status Filter
    if (this.paymentFilter !== 'All') {
      result = result.filter(r => r.paymentStatus === this.paymentFilter);
    }

    // 4. Sorting logic
    result.sort((a: any, b: any) => {
      let valA = a[this.tableSortColumn];
      let valB = b[this.tableSortColumn];

      if (this.tableSortColumn === 'amount') {
        return this.tableSortAscending ? valA - valB : valB - valA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return this.tableSortAscending ? -1 : 1;
      if (valA > valB) return this.tableSortAscending ? 1 : -1;
      return 0;
    });

    return result;
  }

  getPaginatedData(): OrderRecord[] {
    const filtered = this.getFilteredData();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  getTotalPages(): number {
    const totalRecords = this.getFilteredData().length;
    return Math.ceil(totalRecords / this.pageSize) || 1;
  }

  setSort(column: string) {
    if (this.tableSortColumn === column) {
      this.tableSortAscending = !this.tableSortAscending;
    } else {
      this.tableSortColumn = column;
      this.tableSortAscending = true;
    }
    this.currentPage = 1;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  getDateRange(): { startDate: string; endDate: string } {
    let startDate = '';
    let endDate = '';
    const today = new Date();

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (this.selectedReportType === 'daily') {
      startDate = formatDate(today);
      endDate = formatDate(today);
    } else if (this.selectedReportType === 'weekly') {
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = formatDate(lastWeek);
      endDate = formatDate(today);
    } else if (this.selectedReportType === 'monthly') {
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = formatDate(lastMonth);
      endDate = formatDate(today);
    } else if (this.selectedReportType === 'custom') {
      startDate = this.customStartDate;
      endDate = this.customEndDate;
    }
    return { startDate, endDate };
  }

  // Export functions (Uses real backend export APIs and Android DownloadManager integration)
  triggerExport(format: 'Excel' | 'PDF' | 'CSV') {
    if (this.exportingFormat) return;

    const { startDate, endDate } = this.getDateRange();
    if (!startDate || !endDate) {
      this.showToast('Please select valid start and end dates before exporting.', 'danger');
      return;
    }

    this.exportingFormat = format;
    this.showToast(`Preparing ${format} download...`, 'info');

    const mimeMap: { [key: string]: string } = {
      CSV: 'text/csv',
      Excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      PDF: 'application/pdf'
    };

    // If running in Android WebView, call native AndroidBridge directly
    const win = window as any;
    if (win.AndroidBridge && typeof win.AndroidBridge.downloadFile === 'function') {
      const exportUrl = this.reportsService.getOperationalReportExportUrl(format, startDate, endDate);
      win.AndroidBridge.downloadFile(exportUrl, mimeMap[format] || '');
      setTimeout(() => {
        this.exportingFormat = null;
        this.showToast(`${format} report download initiated!`, 'success');
      }, 1000);
    } else {
      // Use HttpClient blob download so auth headers are included
      let download$;
      if (format === 'PDF') {
        download$ = this.reportsService.downloadOperationalReportPdf(startDate, endDate);
      } else if (format === 'Excel') {
        download$ = this.reportsService.downloadOperationalReportExcel(startDate, endDate);
      } else {
        download$ = this.reportsService.downloadOperationalReportCsv(startDate, endDate);
      }

      download$.subscribe({
        next: (blob: Blob) => {
          const ext = format === 'Excel' ? 'xlsx' : format.toLowerCase();
          const fileName = `Botiq_Operational_Report_${this.selectedReportType}_${new Date().toISOString().slice(0, 10)}.${ext}`;
          const url = window.URL.createObjectURL(new Blob([blob], { type: mimeMap[format] }));
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.exportingFormat = null;
          this.showToast(`${format} report downloaded successfully!`, 'success');
        },
        error: (err: any) => {
          console.error(`Error downloading ${format} report:`, err);
          this.exportingFormat = null;
          this.showToast(`Failed to download ${format} report. Please try again.`, 'danger');
        }
      });
    }
  }

  // Declarative Toast Alert Actions
  showToast(message: string, type: string = 'success') {
    const id = this.toastIdCounter++;
    this.toasts.push({ id, message, type });
    
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 4000);
  }

  closeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
