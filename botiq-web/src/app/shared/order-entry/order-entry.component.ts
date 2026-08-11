import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type PhotoCategory = 'Measurements' | 'Pattern' | 'Material';

interface OrderItem {
  name: string;
  icon: string;
  quantity: number;
  rate: number;
}

interface ReferenceCategory {
  name: PhotoCategory;
  count: number;
  image: string | null;
}

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-entry.component.html',
  styleUrl: './order-entry.component.scss'
})
export class OrderEntryComponent {
  detailsOpen = true;
  modalCategory: ReferenceCategory | null = null;
  status = 'In progress';
  advance = 5000;

  readonly garmentTypes = ['Kurta', 'Pant', 'Saree', 'Shirt', 'Suit', 'More'];

  items: OrderItem[] = [
    { name: 'Kurta', icon: '♟', quantity: 2, rate: 1000 },
    { name: 'Pant', icon: '✂', quantity: 2, rate: 1000 },
    { name: 'Saree', icon: '♟', quantity: 2, rate: 1000 },
    { name: 'Shirt', icon: '♜', quantity: 1, rate: 1500 },
    { name: 'Suit', icon: '♟', quantity: 1, rate: 1500 },
    { name: 'Tie', icon: '◆', quantity: 1, rate: 1500 }
  ];

  references: ReferenceCategory[] = [
    {
      name: 'Measurements',
      count: 2,
      image: 'linear-gradient(135deg,#4361a3 0%,#80c1d8 38%,#174153 39%,#112b35 100%)'
    },
    {
      name: 'Pattern',
      count: 2,
      image: 'linear-gradient(135deg,#99442d,#e8a062 48%,#65271d 49%,#321714)'
    },
    {
      name: 'Material',
      count: 1,
      image: 'linear-gradient(135deg,#174a70,#4da2a5 46%,#efd4a7 47%,#8b5d42)'
    }
  ];

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  }

  get balance(): number {
    return this.subtotal - this.advance;
  }

  changeQuantity(item: OrderItem, delta: number): void {
    item.quantity = Math.max(1, item.quantity + delta);
  }

  addGarment(name: string): void {
    if (name === 'More') return;
    const existing = this.items.find(item => item.name === name);
    if (existing) {
      existing.quantity++;
    } else {
      this.items.push({ name, icon: '●', quantity: 1, rate: 0 });
    }
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
  }

  openCategory(category: ReferenceCategory): void {
    this.modalCategory = category;
  }
}
