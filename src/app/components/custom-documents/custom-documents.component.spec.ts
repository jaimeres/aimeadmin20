import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDocumentsComponent } from './custom-documents.component';

describe('CustomDocumentsComponent', () => {
  let component: CustomDocumentsComponent;
  let fixture: ComponentFixture<CustomDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDocumentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
