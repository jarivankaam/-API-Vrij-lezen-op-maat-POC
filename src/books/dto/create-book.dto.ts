export class CreateBookDto {
  title: string;
  author: string;
  isbn?: string;
  ageMin?: number;
  genres?: string[];
}
