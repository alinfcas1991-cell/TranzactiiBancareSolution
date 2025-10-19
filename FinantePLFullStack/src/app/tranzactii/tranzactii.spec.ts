import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tranzactii } from './tranzactii';

describe('Tranzactii', () => {
  let component: Tranzactii;
  let fixture: ComponentFixture<Tranzactii>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tranzactii]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tranzactii);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
