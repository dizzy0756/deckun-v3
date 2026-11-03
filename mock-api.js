const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let pathname = parsedUrl.pathname;
  
  // Handle both with and without /api prefix
  if (pathname.startsWith('/api/')) {
    // keep as is
  } else if (pathname.startsWith('/catalogue/') || pathname === '/health') {
    pathname = '/api' + pathname;
  } else if (pathname.startsWith('/products') || pathname.startsWith('/categories')) {
    pathname = '/api/catalogue' + (pathname === '/products' ? '/products' : pathname);
  }
  
  if (pathname === '/api/health' || pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({status: 'ok'}));
    return;
  }
  
  if (pathname === '/api/catalogue/products' || pathname === '/catalogue/products') {
    res.writeHead(200);
    res.end(JSON.stringify([
      {id: 'e7a62f43-9b82-4d01-8c02-abcdef123456', slug: 'test-product', name: 'Test Product', description: 'A test product', base_price: 1000, discount_percent: 0, is_featured: true, category_id: 1, category_name: 'Outdoor', primary_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop', availability: 'in_stock', has_variants: false}
    ]));
    return;
  }
  
  if (pathname.startsWith('/api/catalogue/products/') || pathname.startsWith('/catalogue/products/')) {
    const slug = pathname.split('/').pop();
    res.writeHead(200);
    res.end(JSON.stringify({
      id: 'e7a62f43-9b82-4d01-8c02-abcdef123456',
      slug: slug,
      name: 'Test Product',
      description: 'A premium outdoor gear product',
      base_price: 1000,
      discount_percent: 0,
      is_featured: true,
      has_variants: false,
      category_id: 1,
      category_name: 'Outdoor',
      images: [],
      specifications: [],
      variants: [],
      effective_price: 1000,
      discount_amount: 0
    }));
    return;
  }
  
  if (pathname === '/api/catalogue/categories' || pathname === '/catalogue/categories') {
    res.writeHead(200);
    res.end(JSON.stringify([{id: 1, name: 'Outdoor', slug: 'outdoor', sort_order: 0, is_active: true, created_at: new Date().toISOString()}]));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({detail: 'Not found', path: pathname}));
});

server.listen(65433, '0.0.0.0', () => {
  console.log('Mock API server running on http://127.0.0.1:65433');
});