# Mongoose Cheatsheet

Voor dit project: `mongoose@9` + `@nestjs/mongoose@12`, NestJS 12, TypeScript, **ESM**.

> ESM-let op: dit project heeft `"type": "module"` in `package.json`. Relatieve imports moeten
> daarom altijd op `.js` eindigen (`./user.schema.js`), ook al is het bestand een `.ts`-bestand.

---

## 1. Verbinden

### Kaal Mongoose (zonder Nest)

```ts
import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/vrij-lezen');
await mongoose.disconnect();
```

### In NestJS (zo doe je het hier)

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/vrij-lezen'),
    UsersModule,
    BooksModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
```

Async variant (met ConfigModule):

```ts
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.getOrThrow<string>('MONGO_URI'),
    dbName: 'vrij-lezen',
  }),
});
```

Handige connectie-opties:

| Optie | Betekenis |
| --- | --- |
| `dbName` | Database los van de URI |
| `autoIndex` | Indexen automatisch aanmaken (`true` in dev, **`false` in productie**) |
| `serverSelectionTimeoutMS` | Hoe lang wachten op een server (default 30s) |
| `maxPoolSize` | Max aantal sockets in de pool |

---

## 2. Schema's

### Schema-eerst (plain Mongoose)

```ts
import { Schema, model, InferSchemaType, Types } from 'mongoose';

const bookSchema = new Schema(
  {
    title:      { type: String, required: true, trim: true },
    author:     { type: String, required: true },
    isbn:       { type: String, unique: true, index: true },
    ageMin:     { type: Number, min: 0, max: 18, default: 6 },
    genres:     [{ type: String, enum: ['fantasy', 'thriller', 'non-fictie'] }],
    ownerId:    { type: Schema.Types.ObjectId, ref: 'User' },
    meta:       { pages: Number, language: { type: String, default: 'nl' } },
  },
  { timestamps: true }, // voegt createdAt + updatedAt toe
);

type Book = InferSchemaType<typeof bookSchema>; // types gratis uit het schema
export const BookModel = model('Book', bookSchema);
```

### Decorator-stijl (`@nestjs/mongoose`) — de stijl voor dit project

```ts
// src/books/schemas/book.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;
}

export const BookSchema = SchemaFactory.createForClass(Book);
```

Registreren in de feature-module:

```ts
// src/books/books.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './schemas/book.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }])],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [MongooseModule], // nodig als een andere module dit model wil injecteren
})
export class BooksModule {}
```

Injecteren in de service:

```ts
// src/books/books.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './schemas/book.schema.js';

@Injectable()
export class BooksService {
  constructor(@InjectModel(Book.name) private readonly bookModel: Model<BookDocument>) {}

  async findAll(): Promise<Book[]> {
    return this.bookModel.find().lean().exec();
  }

  async findOne(id: string): Promise<Book> {
    const book = await this.bookModel.findById(id).exec();
    if (!book) throw new NotFoundException(`Boek ${id} niet gevonden`);
    return book;
  }
}
```

### SchemaTypes

`String` · `Number` · `Date` · `Boolean` · `Buffer` · `ObjectId` · `Array` · `Mixed` · `Map` · `Decimal128` · `BigInt` · `UUID`

### Veelgebruikte veld-opties

```ts
{
  type: String,
  required: true,                    // of: [true, 'Titel is verplicht']
  default: 'onbekend',               // mag ook een functie zijn: () => new Date()
  unique: true,                      // = index, GEEN validator
  index: true,
  sparse: true,                      // index slaat null/ontbrekende waarden over
  immutable: true,                   // niet meer wijzigbaar na aanmaken
  select: false,                     // standaard niet meegeven in queries (bv. wachtwoord)
  trim: true, lowercase: true, uppercase: true,
  minlength: 2, maxlength: 200,      // strings
  min: 0, max: 100,                  // numbers/dates
  enum: ['a', 'b'],
  match: /^[\w.-]+@[\w.-]+$/,
  validate: {
    validator: (v: string) => v.startsWith('978'),
    message: (props) => `${props.value} is geen geldig ISBN-13`,
  },
}
```

### Schema-opties

```ts
new Schema({ ... }, {
  timestamps: true,          // createdAt / updatedAt
  collection: 'books',       // anders pluraliseert Mongoose de modelnaam
  versionKey: false,         // haalt __v weg
  strict: true,              // onbekende velden worden niet opgeslagen
  strictQuery: false,        // onbekende velden in filters worden niet gestript
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  minimize: false,           // bewaar lege objecten
  id: false,                 // haalt de `id`-virtual weg
});
```

---

## 3. CRUD

### Create

```ts
const book = await BookModel.create({ title: 'Kruistocht in spijkerbroek', author: 'Beckman' });

// meerdere
await BookModel.create([{ title: 'A' }, { title: 'B' }]);
await BookModel.insertMany(docs, { ordered: false }); // sneller, sla fouten over
await BookModel.insertOne(doc);

// of via een document-instantie
const doc = new BookModel({ title: 'C' });
await doc.save();
```

### Read

```ts
await BookModel.find();                              // alles
await BookModel.find({ ageMin: { $lte: 10 } });      // met filter
await BookModel.findOne({ isbn: '9789...' });        // eerste treffer of null
await BookModel.findById(id);                        // op _id
await BookModel.exists({ isbn });                    // { _id } of null
await BookModel.countDocuments({ author: 'Beckman' });
await BookModel.estimatedDocumentCount();            // snel, hele collectie
await BookModel.distinct('author');
```

### Update

```ts
await BookModel.updateOne({ _id: id }, { $set: { title: 'Nieuw' } });
await BookModel.updateMany({ ageMin: { $lt: 6 } }, { $set: { ageMin: 6 } });

// geeft het document terug — vraag expliciet om de NIEUWE versie
const updated = await BookModel.findByIdAndUpdate(
  id,
  { $set: dto },
  { returnDocument: 'after', runValidators: true },
);

// upsert: maak aan als het niet bestaat
await BookModel.findOneAndUpdate({ isbn }, { $set: dto }, { upsert: true, returnDocument: 'after' });

// of via een geladen document
const doc = await BookModel.findById(id);
doc.title = 'Nieuw';
await doc.save(); // draait volledige validatie + middleware
```

> ⚠️ `findOneAndUpdate` / `findByIdAndUpdate` geven standaard het document **vóór** de update terug.
> Gebruik `returnDocument: 'after'` (moderne vorm van `new: true`).
> Validators draaien bij update-queries **niet** tenzij je `runValidators: true` meegeeft.

### Delete

```ts
await BookModel.deleteOne({ _id: id });        // { deletedCount }
await BookModel.deleteMany({ author: 'X' });
await BookModel.findByIdAndDelete(id);         // geeft het verwijderde document terug
await BookModel.findOneAndDelete({ isbn });
```

---

## 4. Queries bouwen

Een query is chainbaar en lui — hij draait pas bij `await` of `.exec()`.

```ts
const books = await BookModel
  .find({ genres: 'fantasy' })
  .where('ageMin').gte(8).lte(12)
  .select('title author ageMin -_id')   // '-veld' = uitsluiten
  .sort({ createdAt: -1, title: 1 })    // of '-createdAt title'
  .skip(20).limit(10)                   // paginering
  .populate('ownerId', 'name email')
  .lean()                               // plain objects i.p.v. documents (sneller)
  .exec();
```

### Query-operatoren

| Categorie | Operatoren |
| --- | --- |
| Vergelijken | `$eq` `$ne` `$gt` `$gte` `$lt` `$lte` `$in` `$nin` |
| Logisch | `$and` `$or` `$nor` `$not` |
| Element | `$exists` `$type` |
| Array | `$all` `$elemMatch` `$size` |
| Tekst/regex | `$regex` `$options`, `$text: { $search: '...' }` |

```ts
await BookModel.find({
  $or: [{ author: 'Beckman' }, { genres: { $in: ['fantasy', 'thriller'] } }],
  title: { $regex: 'spijker', $options: 'i' },
  'meta.pages': { $exists: true, $gt: 100 },
});
```

### Update-operatoren

`$set` · `$unset` · `$inc` · `$mul` · `$rename` · `$min` · `$max` · `$currentDate`
Arrays: `$push` · `$pull` · `$addToSet` · `$pop` · `$each` · `$slice` · `$position`

```ts
await UserModel.updateOne(
  { _id: id },
  {
    $inc: { booksRead: 1 },
    $addToSet: { favoriteGenres: 'fantasy' }, // geen duplicaten
    $push: { history: { $each: [entry], $slice: -20 } }, // bewaar laatste 20
  },
);
```

---

## 5. Relaties & populate

```ts
// Recommendation verwijst naar User en Book
@Prop({ type: Types.ObjectId, ref: 'User', required: true })
userId: Types.ObjectId;

@Prop({ type: [{ type: Types.ObjectId, ref: 'Book' }], default: [] })
bookIds: Types.ObjectId[];
```

```ts
await RecommendationModel.findById(id)
  .populate('userId', 'name')                     // alleen `name` meenemen
  .populate({
    path: 'bookIds',
    select: 'title author',
    match: { ageMin: { $lte: 12 } },               // filter op de gepopuleerde docs
    options: { sort: { title: 1 }, limit: 5 },
  })
  .exec();
```

Virtual populate (geen array in de database bijhouden):

```ts
BookSchema.virtual('recommendations', {
  ref: 'Recommendation',
  localField: '_id',
  foreignField: 'bookIds',
});
BookSchema.set('toJSON', { virtuals: true });
```

**Embedden of refereren?** Embed wat altijd samen gelezen wordt en klein/begrensd is
(bv. `meta` in een boek). Refereer wat zelfstandig bestaat, groot wordt of door meerdere
documenten gedeeld wordt (User ↔ Book ↔ Recommendation).

---

## 6. Validatie & fouten

```ts
try {
  await BookModel.create(dto);
} catch (err) {
  if (err instanceof mongoose.Error.ValidationError) {
    // err.errors.title.message
  }
  if (err.code === 11000) {
    // duplicate key — unique index geschonden; err.keyValue toont het veld
  }
  if (err instanceof mongoose.Error.CastError) {
    // ongeldige ObjectId of verkeerd type
  }
}
```

Handmatig valideren zonder op te slaan: `await doc.validate()` of `doc.validateSync()`.

In NestJS: vertaal naar HTTP-fouten (`BadRequestException`, `ConflictException`,
`NotFoundException`) in je service of in een exception filter.

---

## 7. Middleware (hooks)

```ts
// Document-middleware — `this` is het document
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await hash(this.password, 10);
});

UserSchema.post('save', function (doc) {
  console.log('opgeslagen', doc._id);
});

// Query-middleware — `this` is de query
BookSchema.pre(/^find/, function () {
  this.where({ deletedAt: null }); // soft delete
});

// Fouten-hook
BookSchema.post('save', function (err, doc, next) {
  if (err.code === 11000) next(new Error('ISBN bestaat al'));
  else next(err);
});
```

Hooks die op `save` hangen draaien **niet** bij `updateOne` / `findOneAndUpdate` —
dat zijn query-hooks. Kies bewust.

---

## 8. Methods, statics, virtuals & indexen

```ts
// Instance method
UserSchema.methods.isAdult = function (): boolean {
  return this.age >= 18;
};

// Static
BookSchema.statics.findByAuthor = function (author: string) {
  return this.find({ author });
};

// Virtual (niet opgeslagen)
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexen
BookSchema.index({ author: 1, title: 1 });          // samengesteld
BookSchema.index({ title: 'text', author: 'text' }); // full-text search
BookSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // TTL
```

Met de decorator-stijl hang je deze onder `SchemaFactory.createForClass(...)`:

```ts
export const BookSchema = SchemaFactory.createForClass(Book);
BookSchema.index({ author: 1, title: 1 });
BookSchema.methods.summary = function () { return `${this.title} — ${this.author}`; };
```

---

## 9. Aggregation

```ts
const perAuthor = await BookModel.aggregate([
  { $match: { ageMin: { $lte: 12 } } },
  { $group: { _id: '$author', aantal: { $sum: 1 }, gem: { $avg: '$meta.pages' } } },
  { $sort: { aantal: -1 } },
  { $limit: 10 },
  { $project: { _id: 0, author: '$_id', aantal: 1 } },
]);

// join
{ $lookup: { from: 'books', localField: 'bookIds', foreignField: '_id', as: 'books' } },
{ $unwind: '$books' },
```

Aggregation slaat casting en middleware over — je krijgt plain objects terug.

---

## 10. Transacties

```ts
const session = await connection.startSession();
try {
  await session.withTransaction(async () => {
    await UserModel.updateOne({ _id: userId }, { $inc: { booksRead: 1 } }, { session });
    await RecommendationModel.create([{ userId, bookIds }], { session });
  });
} finally {
  await session.endSession();
}
```

Vereist een replica set (MongoDB Atlas, of lokaal `mongod --replSet`). Injecteer de
connectie in Nest met `@InjectConnection() private readonly connection: Connection`.

---

## 11. Typing (TypeScript)

```ts
import { HydratedDocument, Model, Types, InferSchemaType } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;   // document mét _id en save()
type Raw = InferSchemaType<typeof bookSchema>;       // types uit een plain schema

// Model met eigen statics
interface BookModelType extends Model<BookDocument> {
  findByAuthor(author: string): Promise<BookDocument[]>;
}
```

- `.lean()` geeft een plain object terug (geen `save()`, geen virtuals) — gebruik het voor
  read-only endpoints, het scheelt flink in performance.
- `Types.ObjectId` is het type voor id's; `Types.ObjectId.isValid(id)` checkt een string.
- Nest heeft `ParseObjectIdPipe` / `IsObjectIdPipe` uit `@nestjs/mongoose` voor route-params:

```ts
@Get(':id')
findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) { ... }
```

---

## 12. Testen (Vitest, zoals in dit project)

Mock het model via zijn injection-token:

```ts
import { getModelToken } from '@nestjs/mongoose';

const module = await Test.createTestingModule({
  providers: [
    BooksService,
    {
      provide: getModelToken(Book.name),
      useValue: {
        find: vi.fn().mockReturnValue({ lean: () => ({ exec: () => [] }) }),
        findById: vi.fn(),
        create: vi.fn(),
      },
    },
  ],
}).compile();
```

Voor integratietests: `mongodb-memory-server` + `MongooseModule.forRoot(uri)`.

---

## 13. Valkuilen

- **Mongoose 9**: `Model.count()`, `Model.update()` en `Model.remove()` bestaan niet meer —
  gebruik `countDocuments()`, `updateOne()`/`updateMany()`, `deleteOne()`/`deleteMany()`.
- Callbacks bestaan niet meer; alles is een Promise.
- `unique: true` is een **index**, geen validator: bij een duplicaat krijg je een
  `E11000`-fout, geen `ValidationError`.
- Zet `autoIndex: false` in productie en beheer indexen expliciet met `syncIndexes()`.
- Vergeet `returnDocument: 'after'` niet bij `findOneAndUpdate` als je het nieuwe document wilt.
- Vergeet `runValidators: true` niet bij update-queries.
- Bij het wijzigen van een `Mixed`- of genest veld: `doc.markModified('meta')` vóór `save()`.
- Vermijd `populate()` in een loop — dat is N+1. Populate op de lijst-query zelf.

---

## Referentie

- Docs: https://mongoosejs.com/docs/
- Migratie naar 9: https://mongoosejs.com/docs/migrating_to_9.html
- NestJS + Mongoose: https://docs.nestjs.com/techniques/mongodb
