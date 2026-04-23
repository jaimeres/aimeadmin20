import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { MessageService } from '../../components/services/message.service';

interface TripResult {
  id: number;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  rating: number;
  tag?: string;
  image: string;
  meta: string;
}

type TripKind = 'hotels' | 'flights' | 'transport' | 'restaurants' | 'food' | 'local';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    SelectButtonModule,
    TagModule,
    RatingModule,
  ],
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.scss',
})
export class TripsComponent {

  constructor(private messageS: MessageService) {
    this.messageS.showBlocked(false);
  }

  categories = [
    { value: 'hotels', label: 'Hoteles', icon: 'pi pi-building' },
    { value: 'flights', label: 'Vuelos', icon: 'pi pi-send' },
    { value: 'transport', label: 'Transporte', icon: 'pi pi-car' },
    { value: 'restaurants', label: 'Restaurantes', icon: 'pi pi-shop' },
    { value: 'food', label: 'Comidas', icon: 'pi pi-apple' },
    { value: 'local', label: 'Local', icon: 'pi pi-map-marker' },
  ];

  active = signal<TripKind>('hotels');

  origin = '';
  destination = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  guests = 1;
  query = '';

  tripClass = 'economy';
  classOptions = [
    { label: 'Económica', value: 'economy' },
    { label: 'Ejecutiva', value: 'business' },
    { label: 'Primera', value: 'first' },
  ];

  private readonly mockData: Record<TripKind, TripResult[]> = {
    hotels: [
      { id: 1, title: 'Gran Hotel Central', subtitle: 'CDMX · Centro histórico', price: 1850, currency: 'MXN', rating: 4, tag: 'Promo', image: '🏨', meta: '2 huéspedes · desayuno incluido' },
      { id: 2, title: 'Casa Boutique Roma', subtitle: 'CDMX · Roma Norte', price: 2640, currency: 'MXN', rating: 5, image: '🏩', meta: 'Cancelación gratis' },
      { id: 3, title: 'Hotel Marina Bay', subtitle: 'Cancún · Zona hotelera', price: 3990, currency: 'MXN', rating: 5, tag: 'Top', image: '🏖️', meta: 'Todo incluido' },
    ],
    flights: [
      { id: 1, title: 'MEX → CUN', subtitle: 'Aeroméxico · Directo', price: 2450, currency: 'MXN', rating: 4, image: '✈️', meta: '2h 30m · equipaje 25kg' },
      { id: 2, title: 'MEX → MTY', subtitle: 'VivaAerobus · 1 escala', price: 1290, currency: 'MXN', rating: 3, tag: 'Barato', image: '🛫', meta: '4h 10m' },
      { id: 3, title: 'MEX → JFK', subtitle: 'Delta · Directo', price: 8650, currency: 'MXN', rating: 5, image: '🛬', meta: '5h 15m · equipaje 30kg' },
    ],
    transport: [
      { id: 1, title: 'UberX', subtitle: 'Llega en 3 min', price: 185, currency: 'MXN', rating: 5, image: '🚗', meta: '4 pasajeros · 18 min' },
      { id: 2, title: 'Didi Comfort', subtitle: 'Llega en 5 min', price: 210, currency: 'MXN', rating: 4, image: '🚙', meta: '4 pasajeros · 17 min' },
      { id: 3, title: 'Taxi local', subtitle: 'Sitio oficial', price: 160, currency: 'MXN', rating: 4, tag: 'Tarifa fija', image: '🚕', meta: '4 pasajeros · 22 min' },
    ],
    restaurants: [
      { id: 1, title: 'La Fonda de Ana', subtitle: 'Comida mexicana · $$', price: 320, currency: 'MXN', rating: 5, tag: 'Recomendado', image: '🍽️', meta: 'Mesa para 2 · 8:30 pm' },
      { id: 2, title: 'Sakura Sushi', subtitle: 'Japonés · $$$', price: 540, currency: 'MXN', rating: 4, image: '🍣', meta: 'Terraza disponible' },
      { id: 3, title: 'Trattoria Bella', subtitle: 'Italiano · $$', price: 410, currency: 'MXN', rating: 4, image: '🍝', meta: 'Reservable' },
    ],
    food: [
      { id: 1, title: 'Tacos El Güero', subtitle: 'Entrega en 25 min', price: 145, currency: 'MXN', rating: 5, tag: '2x1', image: '🌮', meta: 'Envío gratis' },
      { id: 2, title: 'Pizza Napoli', subtitle: 'Entrega en 35 min', price: 230, currency: 'MXN', rating: 4, image: '🍕', meta: 'Mínimo $180' },
      { id: 3, title: 'Poke Bar', subtitle: 'Entrega en 30 min', price: 189, currency: 'MXN', rating: 5, image: '🥗', meta: 'Saludable' },
    ],
    local: [
      { id: 1, title: 'Tour Teotihuacán', subtitle: 'Día completo · guía certificado', price: 990, currency: 'MXN', rating: 5, tag: 'Top', image: '🏛️', meta: 'Grupos pequeños' },
      { id: 2, title: 'Spa Urbano', subtitle: 'Masaje 60 min', price: 750, currency: 'MXN', rating: 4, image: '💆', meta: 'Centro histórico' },
      { id: 3, title: 'Renta de bici', subtitle: 'Día completo', price: 220, currency: 'MXN', rating: 4, image: '🚴', meta: 'Incluye casco' },
    ],
  };

  get results(): TripResult[] {
    const list = this.mockData[this.active()] ?? [];
    const q = this.query.trim().toLowerCase();
    if (!q) { return list; }
    return list.filter(r => (r.title + ' ' + r.subtitle).toLowerCase().includes(q));
  }

  setActive(kind: TripKind) {
    this.active.set(kind);
  }

  onSearch() {
    // Solo interfaz, no conecta con servidor.
  }

  onBook(_item: TripResult) {
    // Placeholder.
  }
}
