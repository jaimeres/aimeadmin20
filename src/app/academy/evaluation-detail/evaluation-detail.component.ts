import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from '../../components/services/message.service';

interface Option { label: string; value: string; }
interface Question { id: number; text: string; options: Option[]; correct: string; }

@Component({
  selector: 'app-evaluation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, TagModule, RadioButtonModule, ProgressBarModule],
  templateUrl: './evaluation-detail.component.html',
  styleUrl: './evaluation-detail.component.scss',
})
export class EvaluationDetailComponent implements OnInit, OnDestroy {

  constructor(private messageS: MessageService) {
    this.messageS.showBlocked(false);
  }

  private route = inject(ActivatedRoute);
  evaluationId = this.route.snapshot.paramMap.get('id') ?? '1';

  title = 'Examen final de liderazgo';
  course = 'Gestión eficaz de equipos';

  questions: Question[] = [
    {
      id: 1, text: '¿Cuál es el principal rol de un líder en un equipo de alto desempeño?', options: [
        { label: 'Imponer decisiones', value: 'a' },
        { label: 'Facilitar el logro de objetivos comunes', value: 'b' },
        { label: 'Controlar cada tarea', value: 'c' },
        { label: 'Evitar los conflictos', value: 'd' },
      ], correct: 'b'
    },
    {
      id: 2, text: 'La escucha activa implica principalmente...', options: [
        { label: 'Responder rápidamente', value: 'a' },
        { label: 'Tomar notas constantemente', value: 'b' },
        { label: 'Comprender y validar al interlocutor', value: 'c' },
        { label: 'Interrumpir para aclarar', value: 'd' },
      ], correct: 'c'
    },
    {
      id: 3, text: 'Un OKR bien formulado debe ser:', options: [
        { label: 'Vago y aspiracional', value: 'a' },
        { label: 'Medible, con resultados clave', value: 'b' },
        { label: 'Confidencial', value: 'c' },
        { label: 'Anual e inamovible', value: 'd' },
      ], correct: 'b'
    },
    {
      id: 4, text: 'La retroalimentación efectiva debe ser:', options: [
        { label: 'Específica, oportuna y orientada al comportamiento', value: 'a' },
        { label: 'Genera, anual, pública', value: 'b' },
        { label: 'Solo positiva', value: 'c' },
        { label: 'Solo correctiva', value: 'd' },
      ], correct: 'a'
    },
  ];

  answers: Record<number, string> = {};
  current = signal(0);
  submitted = signal(false);
  score = signal(0);

  totalSeconds = 30 * 60;
  remaining = signal(this.totalSeconds);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.timer = setInterval(() => {
      const left = this.remaining() - 1;
      if (left <= 0) {
        this.remaining.set(0);
        this.submit();
      } else {
        this.remaining.set(left);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) { clearInterval(this.timer); }
  }

  get formattedTime(): string {
    const s = this.remaining();
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const r = (s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  }

  next() { if (this.current() < this.questions.length - 1) { this.current.update(v => v + 1); } }
  prev() { if (this.current() > 0) { this.current.update(v => v - 1); } }

  submit() {
    if (this.submitted()) { return; }
    let correct = 0;
    for (const q of this.questions) {
      if (this.answers[q.id] === q.correct) { correct++; }
    }
    this.score.set(Math.round((correct / this.questions.length) * 100));
    this.submitted.set(true);
    if (this.timer) { clearInterval(this.timer); }
  }

  get answered(): number { return Object.keys(this.answers).length; }
  get progress(): number { return Math.round((this.answered / this.questions.length) * 100); }
}
