import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AssistantExpression, AssistantWidgetComponent } from './assistant-widget.component';

// [[[II ESC:032-02,032-03,032-04 DOC:docs/documents/2026-07-24-032-assistant-widget-mascota-natural.md#escenario-02
describe('AssistantWidgetComponent', () => {
  let component: AssistantWidgetComponent;
  let fixture: ComponentFixture<AssistantWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantWidgetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create with the clean mascot renderer by default', () => {
    const cleanMascot = fixture.nativeElement.querySelector('.assistant-mascot-clean');
    const baseImage = fixture.nativeElement.querySelector('.assistant-base') as HTMLImageElement;

    expect(component).toBeTruthy();
    expect(cleanMascot).toBeTruthy();
    expect(baseImage.src).toContain('/assets/assistant/assistant_logo_original.png');
  });

  it('should show talk while open and return to idle when closed', () => {
    component.toggle();

    expect(component.open()).toBeTrue();
    expect(component.mood()).toBe('talk');

    component.toggle();

    expect(component.open()).toBeFalse();
    expect(component.mood()).toBe('idle');
  });

  it('should expose every supported visual state', () => {
    const moods: AssistantExpression[] = ['idle', 'talk', 'think', 'notify', 'speed', 'yawning', 'look-left', 'look-right', 'look-up', 'look-down', 'confused', 'waiting', 'frightened', 'searching', 'working'];
    const fab = fixture.nativeElement.querySelector('.assistant-fab') as HTMLElement;

    moods.forEach((mood) => {
      component.setMood(mood, true);
      fixture.detectChanges();
      expect(fab.dataset['mood']).withContext(mood).toBe(mood);
      expect(component.moodLabel().length).withContext(mood).toBeGreaterThan(0);
    });
  });

  it('should show frightened when a delete control is clicked', () => {
    const deleteButton = document.createElement('button');
    const trashIcon = document.createElement('span');
    trashIcon.className = 'pi pi-trash';
    deleteButton.appendChild(trashIcon);
    fixture.nativeElement.appendChild(deleteButton);

    deleteButton.click();

    expect(component.mood()).toBe('frightened');
    expect(component.moodLabel()).toBe('¡Cuidado!');
  });

  it('should make pending agent work visibly progress', fakeAsync(() => {
    const httpTesting = TestBed.inject(HttpTestingController);
    component.draftControl.setValue('Busca el estado de mis activos');

    component.send();
    const request = httpTesting.expectOne('/api/assistant/chat');
    expect(component.mood()).toBe('think');

    tick(900);
    expect(component.mood()).toBe('searching');

    tick(1500);
    expect(component.mood()).toBe('working');

    request.flush({ respuesta: 'Búsqueda terminada.' });
    tick();
    expect(component.mood()).toBe('talk');
    fixture.destroy();
  }));

  it('should preserve custom static animation paths', () => {
    fixture.componentRef.setInput('animationPath', '/assets/assistant/icon-72.webp');
    fixture.detectChanges();

    const customImage = fixture.nativeElement.querySelector('.assistant-image') as HTMLImageElement;
    expect(component.useCustomAnimation()).toBeTrue();
    expect(component.isStaticImage()).toBeTrue();
    expect(customImage.src).toContain('/assets/assistant/icon-72.webp');
  });

  it('should use a reactive control and ignore blank messages', () => {
    component.draftControl.setValue('   ');
    component.send();

    expect(component.messages()).toEqual([]);
  });
});
// ]]]FI
