import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true, unique: true })
  isbn: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  author: string;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop()
  summary?: string;

  @Prop({ type: Number, min: 0, max: 5, default: 0 })
  avgRating: number;

  @Prop({ type: Number, min: 0, default: 0 })
  ratingCount: number;

  @Prop()
  imageUrl?: string;

  // Niet op de ERD, maar aanwezig in de brondata (Leescatalogus) en nuttig
  // voor het matchen van leesmateriaal aan leesniveau.
  @Prop()
  materialType?: string;

  @Prop()
  level?: string;
}

export const BookSchema = SchemaFactory.createForClass(Book);
