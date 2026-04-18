import { TestBed } from '@angular/core/testing';
import { SqliteTaskService } from './sqlite-task.service';

describe('SqliteTaskService', () => {
  let service: SqliteTaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SqliteTaskService],
    });

    service = TestBed.inject(SqliteTaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
