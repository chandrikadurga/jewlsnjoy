/**
 * Fallback product data for Jewels 'n' Joys.
 * 7 items with multiple high-definition photography angles per product.
 */

// Product 1: Emerald Luxe Tennis Necklace (3 angles)
import p1_1 from '../assets/products/1/1.jpeg';
import p1_2 from '../assets/products/1/2.jpeg';
import p1_3 from '../assets/products/1/3.jpeg';

// Product 2: Midnight Heart Pendant Necklace (5 angles)
import p2_1 from '../assets/products/2/1.jpeg';
import p2_2 from '../assets/products/2/2.jpeg';
import p2_3 from '../assets/products/2/3.jpeg';
import p2_4 from '../assets/products/2/4.jpeg';
import p2_5 from '../assets/products/2/5.jpeg';

// Product 3: Royal Crown Pink Crystal Necklace (5 angles)
import p3_1 from '../assets/products/3/1.jpeg';
import p3_2 from '../assets/products/3/2.jpeg';
import p3_3 from '../assets/products/3/3.jpeg';
import p3_4 from '../assets/products/3/4.jpeg';
import p3_5 from '../assets/products/3/5.jpeg';

// Product 4: Onyx Solitaire Medallion Necklace (5 angles)
import p4_1 from '../assets/products/4/1.jpeg';
import p4_2 from '../assets/products/4/2.jpeg';
import p4_3 from '../assets/products/4/3.jpeg';
import p4_4 from '../assets/products/4/4.jpeg';
import p4_5 from '../assets/products/4/5.jpeg';

// Product 5: Reversible Four-Leaf Clover Necklace (5 angles)
import p5_1 from '../assets/products/5/1.jpeg';
import p5_2 from '../assets/products/5/2.jpeg';
import p5_3 from '../assets/products/5/3.jpeg';
import p5_4 from '../assets/products/5/4.jpeg';
import p5_5 from '../assets/products/5/5.jpeg';

// Product 6: Emerald Square Layered Duo Necklace (5 angles)
import p6_1 from '../assets/products/6/1.jpeg';
import p6_2 from '../assets/products/6/2.jpeg';
import p6_3 from '../assets/products/6/3.jpeg';
import p6_4 from '../assets/products/6/4.jpeg';
import p6_5 from '../assets/products/6/5.jpeg';

// Product 7: Emerald Sovereign Herringbone Choker (4 angles)
import p7_1 from '../assets/products/7/1.jpeg';
import p7_2 from '../assets/products/7/2.jpeg';
import p7_3 from '../assets/products/7/3.jpeg';
import p7_4 from '../assets/products/7/4.jpeg';

export const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Emerald Luxe Tennis Necklace',
    slug: 'emerald-luxe-tennis-necklace',
    price: 799,
    original_price: 999,
    category: 'Necklaces',
    style: ['Elegant', 'Luxury'],
    short_description: 'A sophisticated gold-tone herringbone necklace accented with vivid square-cut green decorative stones.',
    description: 'A sophisticated gold-tone herringbone necklace accented with multiple vivid green square-cut decorative stones. The sleek flat chain combined with emerald-green accents creates an opulent statement suitable for both everyday styling and grand occasions.',
    image: p1_1,
    thumbnail: p1_1,
    images: [p1_1, p1_2, p1_3],
    variants: [],
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    rating: 4.9,
    review_count: 142,
    features: ['Anti-tarnish', 'Waterproof', 'PVD Plated', '18K Gold Plated'],
    specifications: {
      Material: 'Titanium Stainless Steel',
      Finish: '18K Gold Color Plated',
      Plating: 'Long-lasting PVD Plated',
      Stones: 'Emerald-Green Decorative Stones',
      Features: 'Anti-tarnish, Waterproof, Quality Guarantee',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
  {
    id: 2,
    name: 'Midnight Heart Pendant Necklace',
    slug: 'midnight-heart-pendant-necklace',
    price: 599,
    original_price: 749,
    category: 'Necklaces',
    style: ['Minimal', 'Romantic'],
    short_description: 'A minimalist gold-tone heart necklace featuring a glossy black heart centerpiece framed by polished gold.',
    description: 'A minimalist gold-tone heart necklace featuring a glossy black heart centerpiece framed by a polished gold heart bezel. Its sleek silhouette makes it effortless to style with casual outfits, evening wear, and everyday looks.',
    image: p2_1,
    thumbnail: p2_1,
    images: [p2_1, p2_2, p2_3, p2_4, p2_5],
    variants: [],
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    rating: 4.8,
    review_count: 98,
    features: ['Anti-tarnish', 'Waterproof', 'PVD Plated', 'Glossy Onyx Heart'],
    specifications: {
      Material: 'Titanium Stainless Steel',
      Finish: '18K Gold Color Plated',
      Plating: 'Long-lasting PVD Plated',
      Stones: 'Glossy Black Onyx Heart',
      Features: 'Anti-tarnish, Waterproof, Quality Guarantee',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
  {
    id: 3,
    name: 'Royal Crown Pink Crystal Necklace',
    slug: 'royal-crown-pink-crystal-necklace',
    price: 649,
    original_price: 799,
    category: 'Necklaces',
    style: ['Romantic', 'Statement'],
    short_description: 'An enchanting silver-tone necklace showcasing a regal crown perched atop a faceted pink heart zircon crystal.',
    description: 'An enchanting silver-tone necklace showcasing a regal crown accented with clear crystals perched atop a vivid faceted pink heart zircon. A delicate titanium steel chain ensures lasting brilliance and comfort for any royal occasion.',
    image: p3_1,
    thumbnail: p3_1,
    images: [p3_1, p3_2, p3_3, p3_4, p3_5],
    variants: [],
    in_stock: true,
    is_featured: true,
    is_bestseller: false,
    rating: 4.7,
    review_count: 76,
    features: ['Anti-tarnish', 'Waterproof', 'Rhodium Plated', 'Faceted Zircon'],
    specifications: {
      Material: 'Titanium Stainless Steel Chain, Copper Pendant',
      Finish: 'Rhodium Color Plated',
      Plating: 'Long-lasting PVD Plated',
      Stones: 'High Quality Pink Zircon Crystal',
      Features: 'Anti-tarnish, Waterproof, Quality Guarantee',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
  {
    id: 4,
    name: 'Onyx Solitaire Medallion Necklace',
    slug: 'onyx-solitaire-medallion-necklace',
    price: 699,
    original_price: 849,
    category: 'Necklaces',
    style: ['Vintage', 'Classic'],
    short_description: 'A vintage-inspired oval medallion necklace featuring a deep faceted onyx stone in a sunburst gold bezel setting.',
    description: 'A striking vintage-inspired oval medallion necklace featuring a deep faceted black stone set in an architectural sunburst gold bezel. Suspended on a durable gold cable chain with extender.',
    image: p4_1,
    thumbnail: p4_1,
    images: [p4_1, p4_2, p4_3, p4_4, p4_5],
    variants: [],
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    rating: 4.9,
    review_count: 64,
    features: ['316L Steel', 'Anti-tarnish', 'Waterproof', 'Faceted Onyx'],
    specifications: {
      Material: '316L Stainless Steel',
      Weight: '3.6g',
      Length: '40cm + 5cm extension',
      PendantSize: '1.2cm',
      Finish: '18K Gold Plated',
      Stones: 'Faceted Black Onyx Stone',
      Features: 'Anti-tarnish, Waterproof',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
  {
    id: 5,
    name: 'Reversible Four-Leaf Clover Necklace',
    slug: 'reversible-four-leaf-clover-necklace',
    price: 749,
    original_price: 899,
    category: 'Necklaces',
    style: ['Modern', 'Lucky', 'Versatile'],
    short_description: 'An iconic four-leaf clover pendant necklace featuring a reversible design with onyx black on one side and mother-of-pearl white on the other.',
    description: 'An iconic four-leaf clover pendant necklace featuring a reversible two-in-one design: onyx black on one side and iridescent mother-of-pearl white on the other, framed in a sparkling crystal pavé halo.',
    image: p5_1,
    thumbnail: p5_1,
    images: [p5_1, p5_2, p5_3, p5_4, p5_5],
    variants: [],
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    rating: 5.0,
    review_count: 185,
    features: ['Reversible 2-in-1', 'Anti-tarnish', 'Waterproof', 'Pavé Halo'],
    specifications: {
      Material: 'Titanium Stainless Steel',
      Finish: '18K Gold Color Plated',
      Plating: 'Long-lasting PVD Plated',
      Stones: 'Reversible Black/White Inlay & Pavé Zircons',
      Features: 'Reversible 2-in-1, Anti-tarnish, Waterproof, Quality Guarantee',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
  {
    id: 6,
    name: 'Emerald Square Layered Duo Necklace',
    slug: 'emerald-square-layered-duo-necklace',
    price: 849,
    original_price: 1049,
    category: 'Necklaces',
    style: ['Layered', 'Contemporary'],
    short_description: 'A curated two-strand necklace pairing a sleek herringbone chain with a crystal drop and a delicate cable chain holding an emerald halo pendant.',
    description: 'A perfectly curated two-strand necklace featuring a sleek herringbone chain accented with a round solitaire crystal, layered effortlessly with a delicate cable chain carrying a halo-framed square emerald pendant.',
    image: p6_1,
    thumbnail: p6_1,
    images: [p6_1, p6_2, p6_3, p6_4, p6_5],
    variants: [],
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    rating: 4.9,
    review_count: 110,
    features: ['Double Layer Chain', 'Anti-tarnish', 'Waterproof', 'Emerald Crystal'],
    specifications: {
      Material: '316L Stainless Steel',
      Finish: '18K Gold & Platinum Plated',
      Plating: 'Long-lasting PVD Plated',
      Stones: 'Square Cut Emerald Stone & Solitaire Crystal',
      Features: 'Double Layer Chain, Anti-tarnish, Waterproof, Quality Guarantee',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
  {
    id: 7,
    name: 'Emerald Sovereign Herringbone Choker',
    slug: 'emerald-sovereign-herringbone-choker',
    price: 899,
    original_price: 1099,
    category: 'Necklaces',
    style: ['Luxury', 'Statement'],
    short_description: 'A statement flat herringbone chain choker centered with a lavish oval emerald stone set in ribbed gold caps.',
    description: 'A statement flat herringbone chain choker centered with a lavish oval emerald green gemstone hugged by sculpted, ribbed gold end-caps. Crafted to sit flawlessly along the collarbone with liquid-gold movement.',
    image: p7_1,
    thumbnail: p7_1,
    images: [p7_1, p7_2, p7_3, p7_4],
    variants: [],
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    rating: 4.9,
    review_count: 135,
    features: ['Herringbone Choker', 'Anti-tarnish', 'Waterproof', 'Oval Emerald Stone'],
    specifications: {
      Material: 'Titanium Stainless Steel',
      Finish: '18K Gold Color Plated',
      Plating: 'Long-lasting PVD Plated',
      Stones: 'Oval Cut Emerald Stone',
      Features: 'Anti-tarnish, Waterproof, Quality Guarantee',
    },
    shipping: { standard: '3–5 business days', express: '1–2 business days', free_threshold: 999 },
    care_instructions: [
      'Avoid direct contact with harsh perfumes and chemicals.',
      'Store in the provided jewellery pouch when not in use.',
      'Clean gently with a soft dry cloth.',
    ],
  },
];
