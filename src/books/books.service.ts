import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';
import { Book, BookDocument } from './schemas/book.schema.js';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
  ) {}

  create(createBookDto: CreateBookDto) {
    return this.bookModel.create(createBookDto);
  }

  findAll() {
    return this.bookModel.find().lean().exec();
  }

  async findOne(id: string) {
    const book = await this.bookModel.findById(id).lean().exec();
    if (!book) throw new NotFoundException(`Boek ${id} niet gevonden`);
    return book;
  }

  async findAllByGenre(genre: string) {
    const book = await this.bookModel.find({ genres: genre }).lean().exec();
    if (!book) throw new NotFoundException(`genre ${genre} niet gevonden`);
    return book;
  }

  async findOneByGenre(genre: string) {
    const book = await this.bookModel.findOne({ genres: genre }).lean().exec();
    if (!book) throw new NotFoundException(`genre ${genre} niet gevonden`);
    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto) {
    const book = await this.bookModel
      .findByIdAndUpdate(
        id,
        { $set: updateBookDto },
        { returnDocument: 'after', runValidators: true },
      )
      .lean()
      .exec();
    if (!book) throw new NotFoundException(`Boek ${id} niet gevonden`);
    return book;
  }

  async remove(id: string) {
    const book = await this.bookModel.findByIdAndDelete(id).lean().exec();
    if (!book) throw new NotFoundException(`Boek ${id} niet gevonden`);
    return book;
  }
}
