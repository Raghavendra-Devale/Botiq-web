import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServerIpService {

  constructor() {
    if (this.isAndroidPlatform()) {
      this.applyStoredIp();
    }
  }

  isAndroidPlatform(): boolean {
    return typeof window !== 'undefined' && !!window.AndroidBridge;
  }

  hasServerIp(): boolean {
    if (!this.isAndroidPlatform()) {
      return true; // Web platform does not use Android server IP setup
    }
    const bridge = typeof window !== 'undefined' ? window.AndroidBridge : undefined;
    if (bridge && typeof bridge.hasServerIp === 'function') {
      try {
        return bridge.hasServerIp();
      } catch (e) {
        console.error('[ServerIpService] Error calling AndroidBridge.hasServerIp():', e);
      }
    }
    return false;
  }

  getServerIp(): string {
    if (!this.isAndroidPlatform()) {
      return '';
    }
    const bridge = typeof window !== 'undefined' ? window.AndroidBridge : undefined;
    if (bridge && typeof bridge.getServerIp === 'function') {
      try {
        const ip = bridge.getServerIp();
        if (ip) return ip;
      } catch (e) {
        console.error('[ServerIpService] Error calling AndroidBridge.getServerIp():', e);
      }
    }
    return '';
  }

  saveServerIp(ip: string): boolean {
    if (!this.isAndroidPlatform()) {
      return false;
    }
    const cleanIp = ip ? ip.trim() : '';
    if (!cleanIp) return false;

    let nativeSaved = false;

    const bridge = typeof window !== 'undefined' ? window.AndroidBridge : undefined;
    if (bridge && typeof bridge.saveServerIp === 'function') {
      try {
        nativeSaved = bridge.saveServerIp(cleanIp);
        console.log('[ServerIpService] AndroidBridge.saveServerIp result:', nativeSaved);
      } catch (e) {
        console.error('[ServerIpService] Error calling AndroidBridge.saveServerIp():', e);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('server_ip', cleanIp);
    }

    // Immediately update in-memory API URL
    const formattedUrl = this.formatApiUrl(cleanIp);
    environment.apiUrl = formattedUrl;
    console.log('[ServerIpService] environment.apiUrl updated to:', environment.apiUrl);

    return nativeSaved;
  }

  reloadApplication(): void {
    const bridge = typeof window !== 'undefined' ? window.AndroidBridge : undefined;
    if (bridge && typeof bridge.reloadApplication === 'function') {
      try {
        console.log('[ServerIpService] Calling AndroidBridge.reloadApplication()');
        bridge.reloadApplication();
        return;
      } catch (e) {
        console.error('[ServerIpService] Error calling AndroidBridge.reloadApplication():', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  formatApiUrl(rawIp: string): string {
    if (!rawIp) return environment.apiUrl;
    let ip = rawIp.trim();

    // Check if protocol is specified
    if (!ip.startsWith('http://') && !ip.startsWith('https://')) {
      ip = 'http://' + ip;
    }

    // Parse URL parts
    try {
      const urlObj = new URL(ip);
      let host = urlObj.hostname;
      let port = urlObj.port;
      let pathname = urlObj.pathname;

      if (!port) {
        port = '8080';
      }

      if (!pathname || pathname === '/') {
        pathname = '/web';
      } else if (!pathname.endsWith('/web')) {
        pathname = pathname.replace(/\/$/, '') + '/web';
      }

      return `${urlObj.protocol}//${host}:${port}${pathname}`;
    } catch (e) {
      // Fallback simple string format if URL parsing fails
      if (!rawIp.includes(':8080')) {
        return `http://${rawIp.replace(/^https?:\/\//, '').replace(/\/web.*$/, '')}:8080/web`;
      }
      return `http://${rawIp.replace(/^https?:\/\//, '')}/web`;
    }
  }

  applyStoredIp(): void {
    const storedIp = this.getServerIp();
    if (storedIp) {
      const formattedUrl = this.formatApiUrl(storedIp);
      environment.apiUrl = formattedUrl;
      console.log('[ServerIpService] Loaded stored IP and updated environment.apiUrl:', environment.apiUrl);
    }
  }
}
