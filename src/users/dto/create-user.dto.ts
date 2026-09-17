export interface AccountRole {
  permissions: string[];
  studentTypes: string[];
}

export interface BookReadEntry {
  bookId: string;
  rating: number;
  readAt: string;
}

export interface UserPreferences {
  genres: string[];
  authors: string[];
  questions: string[];
}

export class CreateUserDto {
  email: string;
  name: string;
  passwordHash: string;
  accountRole?: AccountRole;
  booksRead?: BookReadEntry[];
  readerProfile?: Record<string, unknown>;
  preferences?: UserPreferences;
}
