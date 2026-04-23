import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { ProgressBarModule } from 'primeng/progressbar';
import { RatingModule } from 'primeng/rating';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../components/services/message.service';

interface Lesson { title: string; duration: string; completed: boolean; }
interface Module { title: string; lessons: Lesson[]; }

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, TagModule, AccordionModule, ProgressBarModule, RatingModule],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent {

  constructor(private messageS: MessageService) {
    this.messageS.showBlocked(false);
  }

  private route = inject(ActivatedRoute);
  courseId = this.route.snapshot.paramMap.get('id') ?? '1';

  course = {
    id: this.courseId,
    title: 'Gestión eficaz de equipos',
    instructor: 'María López',
    cover: '🎯',
    level: 'Intermedio',
    duration: '6h',
    rating: 4.8,
    students: 231,
    description: 'Aprende técnicas prácticas para liderar equipos de alto desempeño, gestionar conflictos y potenciar el talento de tus colaboradores.',
    progress: 42,
  };

  modules: Module[] = [
    {
      title: '1. Fundamentos del liderazgo', lessons: [
        { title: 'Bienvenida y objetivos', duration: '8 min', completed: true },
        { title: 'Estilos de liderazgo', duration: '22 min', completed: true },
        { title: 'Autoconocimiento', duration: '15 min', completed: true },
      ]
    },
    {
      title: '2. Comunicación con tu equipo', lessons: [
        { title: 'Escucha activa', duration: '18 min', completed: true },
        { title: 'Retroalimentación efectiva', duration: '25 min', completed: false },
        { title: 'Reuniones productivas', duration: '20 min', completed: false },
      ]
    },
    {
      title: '3. Desempeño y resultados', lessons: [
        { title: 'OKRs y KPIs', duration: '30 min', completed: false },
        { title: 'Planes de mejora', duration: '18 min', completed: false },
      ]
    },
    {
      title: '4. Cierre y evaluación', lessons: [
        { title: 'Caso práctico', duration: '25 min', completed: false },
        { title: 'Evaluación final', duration: '20 min', completed: false },
      ]
    },
  ];
}
