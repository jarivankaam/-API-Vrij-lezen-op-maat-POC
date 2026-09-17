import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Book, BookSchema } from '../../books/schemas/book.schema.js';

const SEED_FILE = fileURLToPath(new URL('./books.seed.json', import.meta.url));

type BookSeed = Pick<
  Book,
  | 'isbn'
  | 'title'
  | 'author'
  | 'genres'
  | 'summary'
  | 'avgRating'
  | 'ratingCount'
  | 'imageUrl'
  | 'materialType'
  | 'level'
>;

async function seedBooks(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/vrij-lezen-op-maat';
  const raw = await readFile(SEED_FILE, 'utf-8');
  const books: BookSeed[] = JSON.parse(raw);

  await mongoose.connect(uri);
  const BookModel = mongoose.model(Book.name, BookSchema);

  const operations = books.map((book) => ({
    updateOne: {
      filter: { isbn: book.isbn },
      update: { $setOnInsert: book },
      upsert: true,
    },
  }));

  const result = await BookModel.bulkWrite(operations);
  console.log(
    `[seed:mongo] ${books.length} boeken verwerkt — ${result.upsertedCount} nieuw, ${books.length - result.upsertedCount} bestonden al.`,
  );

  await mongoose.disconnect();
}

seedBooks().catch((error: unknown) => {
  console.error('[seed:mongo] Seeden mislukt:', error);
  process.exitCode = 1;
});
