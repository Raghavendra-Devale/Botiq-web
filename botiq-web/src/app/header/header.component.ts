import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../data.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  constructor(private router: Router,
    private http: HttpClient,
    private dataService: DataService
  ) { }
  userName = '';
  businessName = '';
  data: any;
  ngOnInit() {
    this.fetchData();
  }

  fetchData() {

    this.dataService.getBasicData().subscribe((res: any) => {
      this.data = res;
      localStorage.setItem("owner_name", res.owner_name);
      localStorage.setItem("businessName", res.org_name);
      // localStorage.setItem("org_logo", res.org_logo);
      this.userName = localStorage.getItem("owner_name") || '';
      this.businessName = localStorage.getItem("businessName") || '';
      console.log("data from header :", res);

    });

  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}