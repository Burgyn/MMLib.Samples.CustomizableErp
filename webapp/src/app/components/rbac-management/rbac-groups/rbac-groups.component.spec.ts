import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RbacGroupsComponent } from './rbac-groups.component';

describe('RbacGroupsComponent', () => {
  let component: RbacGroupsComponent;
  let fixture: ComponentFixture<RbacGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RbacGroupsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RbacGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
