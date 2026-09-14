import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  author: string;

  @Prop({ unique: true, sparse: true })
  isbn?: string;

  @Prop({ type: Number, min: 0, max: 18, default: 6 })
  ageMin: number;

  @Prop({ type: [String], default: [] })
  genres: string[];
}

export const BookSchema = SchemaFactory.createForClass(Book);
