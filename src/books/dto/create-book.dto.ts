export class CreateBookDto {
  isbn: string;
  title: string;
  author: string;
  genres?: string[];
  summary?: string;
  avgRating?: number;
  ratingCount?: number;
  imageUrl?: string;
  materialType?: string;
  level?: string;
}
