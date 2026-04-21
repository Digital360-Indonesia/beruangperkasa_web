import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readFileSync as readFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = '/home/syanampro/Projects/beruangperkasa-astro';
const EXPORT_DIR = '/home/syanampro/Projects/beruangperkasa-exports';
const CONTENT_DIR = join(PROJECT_ROOT, 'src/content');
const UPLOADS_SRC = join(EXPORT_DIR, 'uploads');
const UPLOADS_DEST = join(PROJECT_ROOT, 'public/uploads');

// Load product images from DB export
const productImages = {};
const postImages = {};
try {
  const productData = readFileSync('/tmp/product-images.tsv', 'utf-8');
  const productLines = productData.split('\n').slice(1);
  for (const line of productLines) {
    const [slug, imagePath] = line.split('\t');
    if (slug && imagePath) {
      productImages[slug] = imagePath;
    }
  }
  const postData = readFileSync('/tmp/post-images.tsv', 'utf-8');
  const postLines = postData.split('\n').slice(1);
  for (const line of postLines) {
    const [slug, imagePath] = line.split('\t');
    if (slug && imagePath) {
      postImages[slug] = imagePath;
    }
  }
} catch (e) {
  console.log('Could not load images, continuing without them');
}

// Ensure directories exist
mkdirSync(CONTENT_DIR, { recursive: true });
mkdirSync(join(CONTENT_DIR, 'posts'), { recursive: true });
mkdirSync(join(CONTENT_DIR, 'products'), { recursive: true });
mkdirSync(join(CONTENT_DIR, 'pages'), { recursive: true });

// Copy uploads folder
if (existsSync(UPLOADS_SRC)) {
  console.log('Copying uploads folder...');
  cpSync(UPLOADS_SRC, UPLOADS_DEST, { recursive: true });
}

// Load JSON data
const pages = JSON.parse(readFileSync(join(EXPORT_DIR, 'pages.json'), 'utf-8'));
const posts = JSON.parse(readFileSync(join(EXPORT_DIR, 'posts.json'), 'utf-8'));
const products = JSON.parse(readFileSync(join(EXPORT_DIR, 'products.json'), 'utf-8'));

console.log(`Processing ${pages.length} pages, ${posts.length} posts, ${products.length} products...`);

// Convert HTML to clean content (strip Elementor/Revolution Slider shortcodes)
function cleanContent(html) {
  if (!html) return '';
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/<rs-module-wrap[\s\S]*?<\/rs-module-wrap>/gi, '') // Revolution Slider
    .replace(/<rs-module[\s\S]*?<\/rs-module>/gi, '')
    .replace(/<rs-slide[\s\S]*?<\/rs-slide>/gi, '')
    .replace(/<rs-layer[\s\S]*?<\/rs-layer>/gi, '')
    .replace(/<rs-progress[\s\S]*?<\/rs-progress>/gi, '')
    .replace(/<rs-bgvideo[\s\S]*?<\/rs-bgvideo>/gi, '')
    .replace(/<!--\s*START[\s\S]*?END\s*REVOLUTION SLIDER -->/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Scripts
    .replace(/<style[\s\S]*?<\/style>/gi, '') // Inline styles
    .replace(/\s*data-elementor-[a-z-]+="[^"]*"/gi, '') // Elementor data attributes
    .replace(/\s*data-[a-z-]+="[^"]*"/gi, '') // Generic data attributes (keep href, src, alt)
    .replace(/<div data-elementor-type="[\s\S]*?<\/div>/gi, '') // Elementor containers
    .replace(/<div class="elementor elementor-[^"]*"[\s\S]*?<\/div>/gi, '')
    .replace(/<link rel="stylesheet"[\s\S]*?>/gi, '') // External styles
    .replace(/<img src="[^"]*demoapus[^\"]*"/gi, '<img') // Demo images
    .replace(/srcset="[^"]*"/gi, '') // Remove srcset
    .replace(/\s{2,}/g, ' ') // Multiple spaces
    .trim();
}

// Clean excerpt
function cleanExcerpt(html) {
  if (!html) return '';
  return cleanContent(html).replace(/<[^>]+>/g, '').substring(0, 200).trim();
}

// Convert posts
let postCount = 0;
for (const post of posts) {
  const slug = post.post_name || `post-${post.ID}`;
  const filePath = join(CONTENT_DIR, 'posts', `${slug}.md`);
  const content = cleanContent(post.post_content);
  const imagePath = postImages[slug] || null;

  const frontmatter = `---
title: "${post.post_title.replace(/"/g, '\\"')}"
slug: "${slug}"
date: "${post.post_date}"
excerpt: "${cleanExcerpt(post.post_excerpt || post.post_content).replace(/"/g, '\\"')}"
wordpress_id: ${post.ID}${imagePath ? `\nimage: "/uploads/${imagePath}"` : ''}
---

${content}
`;

  writeFileSync(filePath, frontmatter);
  postCount++;
}

console.log(`Converted ${postCount} posts to Markdown`);

// Convert products
let productCount = 0;
for (const product of products) {
  const slug = product.post_name || `product-${product.ID}`;
  const filePath = join(CONTENT_DIR, 'products', `${slug}.md`);
  const content = cleanContent(product.post_content);
  const imagePath = productImages[slug] || null;

  const frontmatter = `---
title: "${product.post_title.replace(/"/g, '\\"')}"
slug: "${slug}"
excerpt: "${cleanExcerpt(product.post_excerpt || product.post_content).replace(/"/g, '\\"')}"
wordpress_id: ${product.ID}${imagePath ? `\nimage: "/uploads/${imagePath}"` : ''}
---

${content}
`;

  writeFileSync(filePath, frontmatter);
  productCount++;
}

console.log(`Converted ${productCount} products to Markdown`);

// Convert pages
let pageCount = 0;
for (const page of pages) {
  const slug = page.post_name || `page-${page.ID}`;
  const filePath = join(CONTENT_DIR, 'pages', `${slug}.md`);
  const content = cleanContent(page.post_content);

  const frontmatter = `---
title: "${page.post_title.replace(/"/g, '\\"')}"
slug: "${slug}"
excerpt: "${cleanExcerpt(page.post_excerpt || page.post_content).replace(/"/g, '\\"')}"
wordpress_id: ${page.ID}
---

${content}
`;

  writeFileSync(filePath, frontmatter);
  pageCount++;
}

console.log(`Converted ${pageCount} pages to Markdown`);

console.log('\nDone! Content files created in src/content/');
console.log('Public/uploads folder copied with all media');
