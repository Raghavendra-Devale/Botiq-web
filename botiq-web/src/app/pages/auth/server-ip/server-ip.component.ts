import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ServerIpService } from '../../../services/server-ip.service';

@Component({
  selector: 'app-server-ip',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './server-ip.component.html',
  styleUrl: './server-ip.component.css'
})
export class ServerIpComponent implements OnInit {
  serverIp: string = '';
  isSaving: boolean = false;
  isTesting: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  testStatus: 'none' | 'success' | 'error' = 'none';
  testStatusText: string = '';

  constructor(
    private serverIpService: ServerIpService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const existingIp = this.serverIpService.getServerIp();
    if (existingIp) {
      this.serverIp = existingIp;
    }
  }

  validateIp(): boolean {
    this.errorMessage = null;
    const ip = this.serverIp ? this.serverIp.trim() : '';

    if (!ip) {
      this.errorMessage = 'Please enter a valid Server IP address or hostname.';
      return false;
    }

    return true;
  }

  testConnection(): void {
    if (!this.validateIp()) return;

    this.isTesting = true;
    this.testStatus = 'none';
    this.testStatusText = 'Connecting to server...';
    this.errorMessage = null;
    this.successMessage = null;

    const formattedUrl = this.serverIpService.formatApiUrl(this.serverIp);
    const testEndpoint = `${formattedUrl}/getMasterByType?type=WORK_CATEGORY`;

    this.http.get(testEndpoint).subscribe({
      next: () => {
        this.isTesting = false;
        this.testStatus = 'success';
        this.testStatusText = 'Server reachable successfully!';
      },
      error: (err) => {
        this.isTesting = false;
        // Even if 401 or 404, server responds so network connection is OK
        if (err.status && err.status > 0) {
          this.testStatus = 'success';
          this.testStatusText = `Server responded (Status Code: ${err.status})`;
        } else {
          this.testStatus = 'error';
          this.testStatusText = 'Unable to connect to server. Check IP and Wi-Fi network.';
        }
      }
    });
  }

  onSave(): void {
    if (!this.validateIp()) return;

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const saved = this.serverIpService.saveServerIp(this.serverIp);
      if (saved) {
        this.successMessage = 'Server IP saved successfully! Connecting to application...';
        
        setTimeout(() => {
          this.isSaving = false;
          if (this.serverIpService.isAndroidPlatform()) {
            this.serverIpService.reloadApplication();
          } else {
            this.router.navigate(['/login']);
          }
        }, 1200);
      } else {
        this.isSaving = false;
        this.errorMessage = 'Failed to save server IP to local Android storage.';
      }
    } catch (e: any) {
      this.isSaving = false;
      this.errorMessage = e?.message || 'An error occurred while saving Server IP.';
    }
  }

  getFormattedPreview(): string {
    if (!this.serverIp || !this.serverIp.trim()) return '';
    return this.serverIpService.formatApiUrl(this.serverIp);
  }
}
