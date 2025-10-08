import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import Material from '@primeuix/themes/material';
import { definePreset } from '@primeuix/themes';
import { TokenAccessInterceptor } from './app/auth/interceptors/token-access.interceptor';
import { provideLottieOptions } from 'ngx-lottie';
export function playerFactory() { return import('lottie-web'); }

const MyPreset = definePreset(Material, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      }),
      withEnabledBlockingInitialNavigation()
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        TokenAccessInterceptor
      ])
    ),
    provideAnimationsAsync(),
    provideLottieOptions({ player: playerFactory }),
    providePrimeNG({
      ripple: true,
      inputStyle: 'filled', //outlined
      theme: { preset: MyPreset, options: { darkModeSelector: '.app-dark' } },
      translation: {

        startsWith: 'Empieza con',
        contains: 'Contiene',
        notContains: 'No contiene',
        endsWith: 'Termina con',
        equals: 'Igual a',
        notEquals: 'Distinto de',
        noFilter: 'Sin filtro',

        lt: 'Menor que',
        lte: 'Menor o igual que',
        gt: 'Mayor que',
        gte: 'Mayor o igual que',

        dateIs: 'La fecha es',
        dateIsNot: 'La fecha no es',
        dateBefore: 'Fecha anterior a',
        dateAfter: 'Fecha posterior a',

        clear: 'Limpiar',
        apply: 'Aplicar',
        matchAll: 'Coincidir con todas',
        matchAny: 'Coincidir con cualquiera',
        addRule: 'Agregar regla',
        removeRule: 'Eliminar regla',

        accept: 'Aceptar',
        reject: 'Rechazar',
        choose: 'Seleccionar',
        upload: 'Subir',
        cancel: 'Cancelar',
        completed: 'Completado',
        pending: 'Pendiente',

        fileSizeTypes: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],

        dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
        dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
        dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],

        monthNames: [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ],
        monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],

        chooseYear: 'Seleccionar año',
        chooseMonth: 'Seleccionar mes',
        chooseDate: 'Seleccionar fecha',

        prevDecade: 'Década anterior',
        nextDecade: 'Década siguiente',
        prevYear: 'Año anterior',
        nextYear: 'Año siguiente',
        prevMonth: 'Mes anterior',
        nextMonth: 'Mes siguiente',
        prevHour: 'Hora anterior',
        nextHour: 'Hora siguiente',
        prevMinute: 'Minuto anterior',
        nextMinute: 'Minuto siguiente',
        prevSecond: 'Segundo anterior',
        nextSecond: 'Segundo siguiente',

        am: 'a. m.',
        pm: 'p. m.',
        today: 'Hoy',
        weekHeader: 'Sem',
        firstDayOfWeek: 0,          // Domingo (MX)
        dateFormat: 'dd/mm/yy',

        weak: 'Débil',
        medium: 'Medio',
        strong: 'Fuerte',
        passwordPrompt: 'Ingresa una contraseña',

        emptyFilterMessage: 'No se encontraron resultados',
        searchMessage: '{0} resultados disponibles',
        selectionMessage: '{0} elementos seleccionados',
        emptySelectionMessage: 'Ningún elemento seleccionado',
        emptySearchMessage: 'Sin resultados',
        emptyMessage: 'No hay opciones disponibles',

        aria: {
          trueLabel: 'Verdadero',
          falseLabel: 'Falso',
          nullLabel: 'No seleccionado',
          star: '1 estrella',
          stars: '{star} estrellas',
          selectAll: 'Todos los elementos seleccionados',
          unselectAll: 'Todos los elementos deseleccionados',
          close: 'Cerrar',
          previous: 'Anterior',
          next: 'Siguiente',
          navigation: 'Navegación',
          scrollTop: 'Ir arriba',
          moveTop: 'Mover al inicio',
          moveUp: 'Mover arriba',
          moveDown: 'Mover abajo',
          moveBottom: 'Mover al final',
          moveToTarget: 'Mover al destino',
          moveToSource: 'Mover al origen',
          moveAllToTarget: 'Mover todo al destino',
          moveAllToSource: 'Mover todo al origen',
          pageLabel: 'Página {page}',
          firstPageLabel: 'Primera página',
          lastPageLabel: 'Última página',
          nextPageLabel: 'Página siguiente',
          prevPageLabel: 'Página anterior',
          rowsPerPageLabel: 'Filas por página',
          jumpToPageDropdownLabel: 'Menú de ir a página',
          jumpToPageInputLabel: 'Ir a página',
          selectRow: 'Fila seleccionada',
          unselectRow: 'Fila deseleccionada',
          expandRow: 'Fila expandida',
          collapseRow: 'Fila contraída',
          showFilterMenu: 'Mostrar menú de filtros',
          hideFilterMenu: 'Ocultar menú de filtros',
          filterOperator: 'Operador de filtro',
          filterConstraint: 'Condición de filtro',
          editRow: 'Editar fila',
          saveEdit: 'Guardar edición',
          cancelEdit: 'Cancelar edición',
          listView: 'Vista de lista',
          gridView: 'Vista de cuadrícula',
          slide: 'Diapositiva',
          slideNumber: 'Diapositiva {slideNumber}',
          zoomImage: 'Acercar imagen',
          zoomIn: 'Acercar',
          zoomOut: 'Alejar',
          rotateRight: 'Girar a la derecha',
          rotateLeft: 'Girar a la izquierda'
        }


      }
    })
  ]
};
