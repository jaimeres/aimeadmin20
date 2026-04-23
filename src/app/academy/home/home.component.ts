import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from '../../components/services/message.service';

interface Category { name: string; icon: string; courses: number; }
interface FeaturedCourse { id: number; title: string; instructor: string; duration: string; level: string; rating: number; students: number; cover: string; tag?: string; progress?: number; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TagModule, ProgressBarModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {

  constructor(private messageS: MessageService) {
    this.messageS.showBlocked(false);
  }

  categories: Category[] = [
    { name: 'Liderazgo', icon: '🧭', courses: 12 },
    { name: 'Ventas', icon: '📈', courses: 9 },
    { name: 'Tecnología', icon: '💻', courses: 18 },
    { name: 'Finanzas', icon: '💰', courses: 7 },
    { name: 'Seguridad', icon: '🛡️', courses: 5 },
    { name: 'Soft skills', icon: '🤝', courses: 14 },
  ];

  featured: FeaturedCourse[] = [
    { id: 1, title: 'Gestión eficaz de equipos', instructor: 'María López', duration: '6h', level: 'Intermedio', rating: 4.8, students: 231, cover: '🎯', tag: 'Nuevo' },
    { id: 2, title: 'Angular desde cero', instructor: 'Carlos Pérez', duration: '12h', level: 'Principiante', rating: 4.9, students: 540, cover: '🅰️', tag: 'Popular' },
    { id: 3, title: 'Negociación estratégica', instructor: 'Ana Ramírez', duration: '4h', level: 'Avanzado', rating: 4.6, students: 112, cover: '🤝' },
  ];

  inProgress: FeaturedCourse[] = [
    { id: 10, title: 'Finanzas para no financieros', instructor: 'Luis Ortega', duration: '5h', level: 'Básico', rating: 4.5, students: 98, cover: '📊', progress: 65 },
    { id: 11, title: 'Comunicación efectiva', instructor: 'Patricia Vega', duration: '3h', level: 'Básico', rating: 4.7, students: 180, cover: '🗣️', progress: 30 },
  ];

  stats = { totalCourses: 65, completed: 8, hoursLearned: 42, certificates: 5 };
}
