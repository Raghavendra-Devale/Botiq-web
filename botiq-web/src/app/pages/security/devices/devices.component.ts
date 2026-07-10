import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-devices',
    imports: [CommonModule],
    templateUrl: './devices.component.html',
    styleUrl: './devices.component.css'
})
export class DevicesComponent implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);

  devices: any[] = [];
  currentDeviceId: number | null = null;
  
  loading = false;
  error = '';
  success = '';
  
  confirmingRevokeId: number | null = null;

  ngOnInit() {
    this.loadDevices();
  }

  loadDevices() {
    this.loading = true;
    this.error = '';
    this.success = '';
    
    this.authService.getDeviceStatus().subscribe({
      next: (statusRes: any) => {
        this.currentDeviceId = statusRes?.deviceId || null;
        
        this.authService.getDevices().subscribe({
          next: (data: any) => {
            this.devices = data;
            this.loading = false;
          },
          error: (err) => {
            console.error('Failed to load devices', err);
            this.error = err?.error?.message || 'Failed to load registered devices';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Failed to load device status', err);
        this.error = 'Failed to load device status';
        this.loading = false;
      }
    });
  }

  startRevoke(id: number) {
    this.confirmingRevokeId = id;
    this.success = '';
    this.error = '';
  }

  cancelRevoke() {
    this.confirmingRevokeId = null;
  }

  confirmRevoke() {
    if (this.confirmingRevokeId === null) return;
    
    const idToRevoke = this.confirmingRevokeId;
    this.confirmingRevokeId = null;
    this.loading = true;

    this.authService.deleteDevice(idToRevoke).subscribe({
      next: () => {
        this.success = 'Device access revoked successfully';
        
        if (idToRevoke === this.currentDeviceId) {
          this.authService.logout().then(() => {
            this.router.navigate(['/login']);
          });
        } else {
          this.loadDevices();
        }
      },
      error: (err) => {
        console.error('Failed to revoke device', err);
        this.error = err?.error?.message || 'Failed to revoke device access';
        this.loading = false;
      }
    });
  }
}
