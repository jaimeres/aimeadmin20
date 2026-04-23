import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { RatingModule } from 'primeng/rating';
import { MessageService } from '../../components/services/message.service';

interface Course { id: number; title: string; instructor: string; category: string; level: string; duration: string; rating: number; students: number; cover: string; price?: number; }

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, TagModule, InputTextModule, SelectModule, RatingModule],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.scss',
})
export class CoursesComponent {

  constructor(private messageS: MessageService) {
    this.messageS.showBlocked(false);
  }

  query = '';
  category = signal<string | null>(null);
  level = signal<string | null>(null);

  categoryOptions = [
    { label: 'Todas', value: null },
    { label: 'Liderazgo', value: 'Liderazgo' },
    { label: 'Ventas', value: 'Ventas' },
    { label: 'Tecnología', value: 'Tecnología' },
    { label: 'Finanzas', value: 'Finanzas' },
    { label: 'Soft skills', value: 'Soft skills' },
  ];

  levelOptions = [
    { label: 'Todos', value: null },
    { label: 'Principiante', value: 'Principiante' },
    { label: 'Intermedio', value: 'Intermedio' },
    { label: 'Avanzado', value: 'Avanzado' },
  ];

  private readonly data: Course[] = [
    { id: 1, title: 'Gestión eficaz de equipos', instructor: 'María López', category: 'Liderazgo', level: 'Intermedio', duration: '6h', rating: 4.8, students: 231, cover: '🎯' },
    { id: 2, title: 'Angular desde cero', instructor: 'Carlos Pérez', category: 'Tecnología', level: 'Principiante', duration: '12h', rating: 4.9, students: 540, cover: '🅰️' },
    { id: 3, title: 'Negociación estratégica', instructor: 'Ana Ramírez', category: 'Ventas', level: 'Avanzado', duration: '4h', rating: 4.6, students: 112, cover: '🤝' },
    { id: 4, title: 'Finanzas para no financieros', instructor: 'Luis Ortega', category: 'Finanzas', level: 'Principiante', duration: '5h', rating: 4.5, students: 98, cover: '📊' },
    { id: 5, title: 'Comunicación efectiva', instructor: 'Patricia Vega', category: 'Soft skills', level: 'Principiante', duration: '3h', rating: 4.7, students: 180, cover: '🗣️' },
    { id: 6, title: 'Seguridad informática', instructor: 'Jorge Salas', category: 'Tecnología', level: 'Intermedio', duration: '8h', rating: 4.4, students: 76, cover: '🛡️' },
    { id: 7, title: 'Liderazgo transformacional', instructor: 'Sofía Durán', category: 'Liderazgo', level: 'Avanzado', duration: '7h', rating: 4.9, students: 88, cover: '🚀' },
    { id: 8, title: 'Ventas consultivas', instructor: 'Roberto Núñez', category: 'Ventas', level: 'Intermedio', duration: '5h', rating: 4.5, students: 145, cover: '💼' },
  ];

  get filtered(): Course[] {
    const q = this.query.trim().toLowerCase();
    const cat = this.category();
    const lvl = this.level();
    return this.data.filter(c =>
      (!q || (c.title + ' ' + c.instructor).toLowerCase().includes(q)) &&
      (!cat || c.category === cat) &&
      (!lvl || c.level === lvl)
    );
  }
}
