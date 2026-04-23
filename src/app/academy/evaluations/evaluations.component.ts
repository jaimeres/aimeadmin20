import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { MessageService } from '../../components/services/message.service';

interface Evaluation { id: number; title: string; course: string; questions: number; duration: string; due: string; status: 'pendiente' | 'aprobado' | 'reprobado' | 'vencido'; score?: number; }

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TagModule, TableModule],
  templateUrl: './evaluations.component.html',
  styleUrl: './evaluations.component.scss',
})
export class EvaluationsComponent {

  constructor(private messageS: MessageService) {
    this.messageS.showBlocked(false);
  }

  evaluations: Evaluation[] = [
    { id: 1, title: 'Examen final de liderazgo', course: 'Gestión eficaz de equipos', questions: 20, duration: '30 min', due: '2025-02-15', status: 'pendiente' },
    { id: 2, title: 'Quiz Angular básico', course: 'Angular desde cero', questions: 15, duration: '20 min', due: '2025-02-10', status: 'aprobado', score: 92 },
    { id: 3, title: 'Prueba de ventas consultivas', course: 'Ventas consultivas', questions: 25, duration: '35 min', due: '2025-02-20', status: 'pendiente' },
    { id: 4, title: 'Evaluación de seguridad', course: 'Seguridad informática', questions: 30, duration: '45 min', due: '2025-01-28', status: 'vencido' },
    { id: 5, title: 'Quiz comunicación', course: 'Comunicación efectiva', questions: 10, duration: '15 min', due: '2025-02-05', status: 'reprobado', score: 58 },
  ];

  severity(status: Evaluation['status']): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'aprobado': return 'success';
      case 'pendiente': return 'warn';
      case 'vencido': return 'danger';
      case 'reprobado': return 'danger';
      default: return 'info';
    }
  }
}
