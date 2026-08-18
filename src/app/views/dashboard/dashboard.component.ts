import { Component, ElementRef, inject, viewChild, afterNextRender } from '@angular/core';
import { Chart, registerables } from 'chart.js';

import { AuthService } from '../../auth/auth.service';
import { AppIconName, IconComponent } from '../../icons/icon.component';

Chart.register(...registerables);

interface IStatCard {
  title: string;
  value: string;
  icon: AppIconName;
  bgClass: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [IconComponent]
})
export class DashboardComponent {
  readonly #authService = inject(AuthService);
  readonly user = this.#authService.user;

  private readonly chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  public statCards: IStatCard[] = [
    { title: 'Pedidos hoy', value: '42', icon: 'basket', bgClass: 'bg-blue-600' },
    { title: 'Ingresos del día', value: '$386.500', icon: 'dollar', bgClass: 'bg-emerald-600' },
    { title: 'Pedidos pendientes', value: '7', icon: 'notes', bgClass: 'bg-amber-500' },
    { title: 'Ticket promedio', value: '$9.200', icon: 'calculator', bgClass: 'bg-sky-600' }
  ];

  public recentOrders = [
    { id: 'SC-001', table: 'Mesa 3', items: '2 x Pasta', total: '$18.400', status: 'Entregado' },
    { id: 'SC-002', table: 'Mesa 1', items: '1 x Lomo', total: '$12.900', status: 'En preparación' },
    { id: 'SC-003', table: 'Mesa 5', items: '3 x Ensalada', total: '$21.300', status: 'Pendiente' },
    { id: 'SC-004', table: 'Mesa 2', items: '1 x Pizza', total: '$15.200', status: 'Entregado' }
  ];

  private chart: Chart | undefined;

  constructor() {
    afterNextRender(() => this.#createChart());
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'Pendiente':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
      case 'En preparación':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
    }
  }

  #createChart(): void {
    const canvas = this.chartCanvas().nativeElement;

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [
          {
            label: 'Pedidos',
            backgroundColor: '#4f5d73',
            data: [42, 55, 38, 61, 47, 70, 52]
          },
          {
            label: 'Ingresos (x $10.000)',
            backgroundColor: '#321fdb',
            data: [31, 44, 28, 52, 39, 63, 45]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        }
      }
    });
  }
}
