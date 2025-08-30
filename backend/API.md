# QSAT LMS Backend API

Base URL
- Local: http://localhost:4000
- All endpoints are under the /api prefix unless noted.

Authentication
- JWT (Bearer) with HS256 using jose.
- Header: Authorization: Bearer <token>
- Token lifetime: JWT_EXPIRES_IN (default "7d")

Content Type
- Requests: application/json
- Responses: application/json
- Error shape:
  {
    "success": false,
    "message": "Human readable message"
  }

Health
- GET /api/health
  - 200: { "ok": true, "env": "development" }
- GET /
  - Friendly API metadata with endpoint hints.

Auth

1) POST /api/auth/register
- Body:
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "StrongP@ssw0rd!"
  }
- 201:
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": { "id": 1, "firstName": "John", "lastName": "Doe", "email": "john@example.com", "role": "student", "createdAt": "ISO" },
      "token": "JWT"
    }
  }

2) POST /api/auth/login
- Body:
  { "email": "john@example.com", "password": "StrongP@ssw0rd!" }
- 200:
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": { "id": 1, "firstName": "John", "lastName": "Doe", "email": "john@example.com", "role": "student" },
      "token": "JWT"
    }
  }

3) GET /api/auth/profile (requires auth)
- 200:
  {
    "success": true,
    "data": {
      "user": {
        "id": 1, "firstName": "John", "lastName": "Doe", "email": "john@example.com",
        "role": "student", "bio": null, "phone": null, "avatarUrl": null, "createdAt": "ISO", "lastLogin": "ISO"
      }
    }
  }

Users

1) GET /api/users/dashboard (requires auth)
- Aggregated stats and recent activity for the authenticated user.
- 200:
  {
    "success": true,
    "data": {
      "stats": {
        "enrollments": { "total": 3, "completed": 1, "active": 2, "avgProgress": 56.7 },
        "orders": { "total": 5, "delivered": 3, "pending": 1, "totalSpent": 1299.99 }
      },
      "recentActivity": {
        "enrollments": [
          { "enrolled_at": "ISO", "course_name": "Course A", "image_url": "..." }
        ],
        "orders": [
          { "created_at": "ISO", "kit_name": "Kit A", "image_url": "...", "status": "pending" }
        ]
      }
    }
  }

Kits

Entity summary
- Fields (selected): id, name (title), description, price (number), originalPrice, category, difficulty, duration, modules, imageUrl, features, specifications, whatIncludes, memberCount (also returned as members), tags[], images[], rating (computed), createdAt.

1) GET /api/kits
- Query params:
  - search: string (full‑text on name/description)
  - category: string | "All"
  - difficulty: "Beginner" | "Intermediate" | "Advanced" | "All"
  - sortBy: "popular" | "price_low" | "price_high" | "rating" | "newest"
  - page: number (default 1)
  - limit: number (default 12, max 50)
  - tags: comma-separated (e.g., "ai,web")
- 200:
  {
    "success": true,
    "data": {
      "kits": [
        {
          "id": 1, "name": "AI Starter Kit", "description": "...",
          "price": 99.0, "originalPrice": 129.0, "category": "ai",
          "difficulty": "Beginner", "duration": 180, "modules": 8,
          "imageUrl": "https://...", "features": ["..."],
          "rating": 4.6, "totalOrders": 12,
          "tags": ["ai", "starter"],
          "memberCount": 320, "members": 320,
          "createdAt": "ISO"
        }
      ],
      "pagination": { "currentPage": 1, "totalPages": 5, "totalItems": 60, "itemsPerPage": 12 }
    }
  }

2) GET /api/kits/meta/categories
- 200:
  { "success": true, "data": { "categories": [ { "category": "ai", "count": 12 } ] } }

3) GET /api/kits/:id
- 200:
  {
    "success": true,
    "data": {
      "kit": {
        "id": 1, "name": "AI Starter Kit", "description": "...",
        "price": 99.0, "originalPrice": 129.0,
        "category": "ai", "difficulty": "Beginner", "duration": 180, "modules": 8,
        "imageUrl": "https://...", "features": ["..."],
        "specifications": { ... }, "whatIncludes": ["..."],
        "rating": 4.6, "reviewCount": 23, "totalOrders": 12,
        "tags": ["ai","starter"], "memberCount": 320, "members": 320,
        "createdAt": "ISO"
      },
      "reviews": [
        { "id": 10, "rating": 5, "comment": "Great!", "createdAt": "ISO", "user": { "name": "Jane D", "avatarUrl": null } }
      ]
    }
  }

Courses

Entity summary
- Fields (selected): id, name, description, price, category, difficulty, duration, modules, imageUrl, isPremium, whatYouLearn, requirements, tags[], rating (computed), instructor, enrollments count, createdAt.

1) GET /api/courses
- Query params:
  - search, category, difficulty ("Beginner"|"Intermediate"|"Advanced"|"All"), sortBy ("popular"|"price_low"|"price_high"|"rating"|"newest"),
  - page (default 1), limit (default 12), tags (comma-separated)
- 200: same pagination envelope as kits; items include rating and totalEnrollments.

2) GET /api/courses/meta/categories
- 200: { "success": true, "data": { "categories": [ { "category": "web", "count": 7 } ] } }

3) GET /api/courses/:id
- 200:
  {
    "success": true,
    "data": {
      "course": {
        "id": 1, "name": "Web 101", "description": "...",
        "price": 49.0, "category": "web", "difficulty": "Beginner",
        "duration": 240, "modules": 10, "imageUrl": "https://...",
        "isPremium": false, "whatYouLearn": ["..."], "requirements": ["..."],
        "rating": 4.7, "reviewCount": 12, "totalEnrollments": 120,
        "instructor": { "name": "Alex M", "bio": "...", "avatarUrl": null },
        "tags": ["web","intro"], "createdAt": "ISO"
      },
      "modules": [
        { "id": 1, "title": "Intro", "description": "...", "duration": 20, "videoUrl": null, "orderIndex": 1, "isFree": true }
      ],
      "reviews": [
        { "id": 4, "rating": 5, "comment": "Solid", "createdAt": "ISO", "user": { "name": "Sam T", "avatarUrl": null } }
      ]
    }
  }

Orders

Entity summary
- Fields: id, userId, kitId, quantity, subtotal, tax, shipping, total, status ("pending"|"confirmed"|"shipped"|"delivered"|"cancelled"), shippingAddress{}, trackingNumber?, createdAt, updatedAt.

1) POST /api/orders (requires auth)
- Body:
  {
    "kitId": 1,
    "quantity": 1,
    "shippingAddress": {
      "street": "1 Main St", "city": "NYC", "state": "NY", "zipCode": "10001", "country": "US"
    }
  }
- 201:
  {
    "success": true,
    "message": "Order created successfully",
    "data": {
      "order": {
        "id": 42, "kitId": 1, "kitName": "AI Starter Kit",
        "quantity": 1, "subtotal": 99, "tax": 17.82, "shipping": 150, "total": 266.82,
        "status": "pending",
        "shippingAddress": { ... },
        "createdAt": "ISO"
      }
    }
  }

2) GET /api/orders (requires auth)
- Query: page (default 1), limit (default 10), status (optional)
- 200: pagination envelope; orders include basic kit info if available.

3) GET /api/orders/:id (requires auth)
- 200: detailed order including kit description (if kit exists).

Curl examples

Register:
curl -X POST http://localhost:4000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{ \"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"password\":\"StrongP@ssw0rd!\" }"

Login:
curl -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{ \"email\":\"john@example.com\",\"password\":\"StrongP@ssw0rd!\" }"

Profile (replace TOKEN):
curl http://localhost:4000/api/auth/profile -H "Authorization: Bearer TOKEN"

List kits:
curl "http://localhost:4000/api/kits?search=ai&tags=ai,starter&page=1&limit=12&sortBy=popular"

Kit detail:
curl http://localhost:4000/api/kits/1

Create order (replace TOKEN):
curl -X POST http://localhost:4000/api/orders ^
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" ^
  -d "{ \"kitId\":1, \"quantity\":1, \"shippingAddress\": { \"street\":\"1 Main St\",\"city\":\"NYC\",\"state\":\"NY\",\"zipCode\":\"10001\",\"country\":\"US\" } }"

Pagination and filtering
- Pagination uses page (1-based) and limit (max 50).
- Filtering by category/difficulty and tags (comma-separated).
- Sorting options:
  - "popular" (proxy via counts and recency), "price_low", "price_high", "rating" (computed client-side), "newest".

Status codes
- 200 OK, 201 Created, 204 No Content
- 400 Bad Request (validation)
- 401 Unauthorized (missing/invalid token)
- 403 Forbidden (insufficient permission)
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity (validation details)
- 500 Internal Server Error

Environment variables (excerpt)
- PORT=4000
- DATABASE_URL=postgresql://...
- JWT_SECRET=...
- JWT_EXPIRES_IN=7d
- CORS_ORIGIN=http://localhost:3000,http://localhost:5173
- DEBUG_PRISMA=false

Notes
- Prices are returned as numbers (Prisma Decimal converted).
- Kits return memberCount and a members alias for compatibility.
- Health endpoints: /health and /api/health.
