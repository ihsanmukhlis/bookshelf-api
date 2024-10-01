const db = require('../config/dbConfig');
const Joi = require('joi');

const bookSchema = Joi.object({
  name: Joi.string().required(),
  year: Joi.number().integer().min(0).max(new Date().getFullYear()),
  author: Joi.string(),
  summary: Joi.string(),
  publisher: Joi.string(),
  pageCount: Joi.number().integer().min(0).required(),
  readPage: Joi.number().integer().min(0).required().custom((value, helpers) => {
    const { pageCount } = helpers.state.ancestors[0];
    if (value > pageCount) {
      return helpers.error('any.invalid');
    }
    return value;
  }),
  reading: Joi.boolean(),
}).messages({
  'any.invalid': 'Gagal menambahkan buku. readPage tidak boleh lebih besar dari pageCount',
});

const addBookHandler = async (request, h) => {
  const { error } = bookSchema.validate(request.payload);
  if (error) {
    return h.response({
      status: 'fail',
      message: error.details[0].message,
    }).code(400);
  }

  const {
    name, year, author, summary, publisher, pageCount, readPage, reading
  } = request.payload;
  const finished = pageCount === readPage;

  const result = await db.query(
    'INSERT INTO books (name, year, author, summary, publisher, page_count, read_page, reading, finished) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
    [name, year, author, summary, publisher, pageCount, readPage, reading, finished]
  );

  const bookId = result.rows[0].id;

  return h.response({
    status: 'success',
    message: 'Buku berhasil ditambahkan',
    data: { bookId },
  }).code(201);
};

const getAllBooksHandler = async (request, h) => {
  const { name, reading, finished } = request.query;

  let query = 'SELECT * FROM books';
  const params = [];

  if (name) {
    query += ' WHERE LOWER(name) LIKE LOWER($1)';
    params.push(`%${name}%`);
  }

  if (reading !== undefined) {
    const isReading = reading === '1';
    query += params.length ? ' AND reading = $2' : ' WHERE reading = $1';
    params.push(isReading);
  }

  if (finished !== undefined) {
    const isFinished = finished === '1';
    query += params.length ? ' AND finished = $3' : ' WHERE finished = $1';
    params.push(isFinished);
  }

  const result = await db.query(query, params);
  const booksList = result.rows.map(({ id, name, publisher }) => ({ id, name, publisher }));

  return h.response({
    status: 'success',
    data: {
      books: booksList,
    },
  }).code(200);
};

const getBookByIdHandler = async (request, h) => {
  const { id } = request.params;
  const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);

  if (result.rows.length) {
    return h.response({
      status: 'success',
      data: { book: result.rows[0] },
    }).code(200);
  }

  return h.response({
    status: 'fail',
    message: 'Buku tidak ditemukan',
  }).code(404);
};

const editBookByIdHandler = async (request, h) => {
  const { id } = request.params;

  const { error } = bookSchema.validate(request.payload);
  if (error) {
    return h.response({
      status: 'fail',
      message: error.details[0].message,
    }).code(400);
  }

  const {
    name, year, author, summary, publisher, pageCount, readPage, reading
  } = request.payload;
  const finished = pageCount === readPage;
  const updatedAt = new Date().toISOString();

  const result = await db.query(
    'UPDATE books SET name = $1, year = $2, author = $3, summary = $4, publisher = $5, page_count = $6, read_page = $7, reading = $8, finished = $9, updated_at = $10 WHERE id = $11',
    [name, year, author, summary, publisher, pageCount, readPage, reading, finished, updatedAt, id]
  );

  if (result.rowCount === 0) {
    return h.response({
      status: 'fail',
      message: 'Gagal memperbarui buku. Id tidak ditemukan',
    }).code(404);
  }

  return h.response({
    status: 'success',
    message: 'Buku berhasil diperbarui',
  }).code(200);

};

const deleteBookByIdHandler = async (request, h) => {
  const { id } = request.params;
  const result = await db.query('DELETE FROM books WHERE id = $1', [id]);

  if (result.rowCount === 0) {
    return h.response({
      status: 'fail',
      message: 'Buku gagal dihapus. Id tidak ditemukan',
    }).code(404);
  }

  return h.response({
    status: 'success',
    message: 'Buku berhasil dihapus',
  }).code(200);
};

module.exports = {
  addBookHandler,
  getAllBooksHandler,
  getBookByIdHandler,
  editBookByIdHandler,
  deleteBookByIdHandler,
};