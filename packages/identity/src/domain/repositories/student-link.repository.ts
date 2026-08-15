import type { StudentLinkEntity } from '../entities/student-link.entity';

export interface StudentLinkRepository {
  create(link: StudentLinkEntity): Promise<StudentLinkEntity>;
  findById(id: string): Promise<StudentLinkEntity | null>;
  findByChildProfileId(childProfileId: string): Promise<StudentLinkEntity[]>;
  findByChildProfileAndStudent(childProfileId: string, studentId: string): Promise<StudentLinkEntity | null>;
  delete(id: string): Promise<void>;
}
