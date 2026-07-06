import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-setup-mpin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup-mpin.component.html',
  styleUrl: './setup-mpin.component.css'
})
export class SetupMpinComponent {

  mpin = '';
  confirmMpin = '';

  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  setupMpin() {

    this.error = '';

    if (this.mpin.length !== 6) {
      this.error = 'MPIN must be 6 digits';
      return;
    }

    if (this.mpin !== this.confirmMpin) {
      this.error = 'MPIN does not match';
      return;
    }

    this.loading = true;
    

    this.authService.registerDevice()
      .subscribe({

        next: () => {

          this.authService.setupMpin(this.mpin)
            .subscribe({

              next: () => {

                this.loading = false;

                this.router.navigate([
                  '/dashboard'
                ]);
              },

              error: (err) => {

                this.loading = false;

                this.error =
                  err?.error?.message ||
                  'Failed to setup MPIN';
              }
            });
        },

        error: (err) => {

          this.loading = false;

          this.error =
            err?.error?.message ||
            'Failed to register device';
        }
      });
  }
}