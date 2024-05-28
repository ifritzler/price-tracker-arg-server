import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  numeric,
  date,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
})

export const supermarkets = pgTable('supermarkets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
})

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').unique('idx_url_constraint').notNull(),
  imageUrl: text('image_url').notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  supermarketId: integer('supermarket_id')
    .references(() => supermarkets.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  available: boolean('available').default(true),
  ean: text('ean')
})

export const productDailyPrices = pgTable('product_daily_prices', {
  id: serial('id'),
  productId: integer('product_id')
    .references(() => products.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  hasDiscount: boolean('has_discount').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  discountPrice: numeric('discount_price', { precision: 12, scale: 2 }).notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  diffPercentage: numeric('diff_percentage', { precision: 12, scale: 2 }).notNull(),
  minimunQuantity: integer('minimun_quantity')
}, (t) => ({
  compositePk: primaryKey({columns: [t.date, t.productId], name: 'product_date_pk'}),
}))

export const productDailyPricesRelations = relations(
  productDailyPrices,
  ({ one }) => ({
    product: one(products, {
      fields: [productDailyPrices.productId],
      references: [products.id],
    }),
  }),
)

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const supermarketRelations = relations(supermarkets, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  supermarket: one(supermarkets, {
    fields: [products.supermarketId],
    references: [supermarkets.id],
    relationName: 'supermarket',
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
    relationName: 'category',
  }),
  productDailyPrices: many(productDailyPrices),
}))
