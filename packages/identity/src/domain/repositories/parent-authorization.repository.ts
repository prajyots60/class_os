export interface AuthorizedStudentContext {
  studentId: string;
  instituteId: string;
  childProfileId?: string;
  relationshipPath: 'student_link' | 'institute_parent';
}

export interface ParentChildProfile {
  id: string;
  parentIdentityId: string;
  name: string;
  avatar: string | null;
}

export interface ParentStudentLink {
  id: string;
  childProfileId: string;
  studentId: string;
  instituteId: string;
  parentIdentityId: string;
}

export interface ParentAuthorizationRepository {
  findChildProfile(childProfileId: string): Promise<ParentChildProfile | null>;
  findStudentLink(studentLinkId: string): Promise<ParentStudentLink | null>;
  resolveParentStudentRelationship(
    parentIdentityId: string,
    studentId: string,
  ): Promise<AuthorizedStudentContext | null>;
}
