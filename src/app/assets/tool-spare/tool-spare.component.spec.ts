import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolSpareComponent } from './tool-spare.component';

describe('ToolSpareComponent', () => {
  let component: ToolSpareComponent;
  let fixture: ComponentFixture<ToolSpareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolSpareComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolSpareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
