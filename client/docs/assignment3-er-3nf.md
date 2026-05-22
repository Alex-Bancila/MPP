# Assignment 3 — ER Diagram & 3NF Normalisation

## 1. Entity-Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      User        │       │     Listing       │
├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK id            │
│    username      │       │ FK sellerId → User│
│    email (U)     │       │    title          │
│    passwordHash  │       │    description    │
│    avatarUrl     │       │    price          │
│    createdAt     │       │    category       │
│ FK roleId → Role │       │    photos (JSON)  │
└────────┬─────────┘       │    datePosted     │
         │                 │    status         │
         │                 └────────┬─────────┘
         │                          │
         │     ┌────────────────────┘
         │     │
         ▼     ▼
┌──────────────────┐       ┌──────────────────┐
│      Role        │       │    Review         │
├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK id            │
│    name (U)      │       │ FK listingId → L  │
│    description   │       │ FK userId → User   │
└────────┬─────────┘       │    rating         │
         │                 │    title          │
         │                 │    body           │
         │                 │    createdAt      │
         │                 │    updatedAt      │
         │                 └──────────────────┘
         │
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│   Permission     │       │   Favourite       │
├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK userId → User   │
│    name (U)      │       │ PK listingId → L   │
│    description   │       │    createdAt      │
└────────┬─────────┘       └──────────────────┘
         │
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│  RolePermission  │       │  Conversation     │
├──────────────────┤       ├──────────────────┤
│ PK,FK roleId → R │       │ PK id            │
│ PK,FK permId → P │       │ FK listingId → L  │
└──────────────────┘       │ FK partA → User    │
                           │ FK partB → User    │
                           │    createdAt      │
                           └────────┬─────────┘
                                    │
                                    │
                                    ▼
                           ┌──────────────────┐
                           │    Message        │
                           ├──────────────────┤
                           │ PK id            │
                           │ FK convId → Conv  │
                           │ FK senderId → U   │
                           │    body           │
                           │    createdAt      │
                           └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   ActionLog      │       │ SuspiciousUser    │
├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK id            │
│ FK userId → User │       │ FK userId → User  │
│ FK roleId → Role │       │ FK roleId → Role  │
│    action        │       │    reason         │
│    details       │       │    score          │
│    createdAt     │       │    createdAt      │
└──────────────────┘       │    updatedAt      │
                           │    resolvedAt (?) │
                           └──────────────────┘

MongoDB Collection (non-relational):
┌──────────────────┐
│  chat_messages   │
├──────────────────┤
│    id            │
│    conversationId│
│    senderId      │
│    recipientId   │
│    listingId     │
│    body          │
│    createdAt     │
└──────────────────┘
```

### Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| User → Listing | 1 : N | Cascade delete on user removal |
| User → Review | 1 : N | Cascade delete |
| User → Favourite | 1 : N | Cascade delete |
| User → Message | 1 : N | Cascade delete |
| User → ActionLog | 1 : N | Cascade delete |
| User → SuspiciousUser | 1 : N | Cascade delete |
| User → Conversation (A) | 1 : N | Cascade delete |
| User → Conversation (B) | 1 : N | Cascade delete |
| Listing → Review | 1 : N | Cascade delete |
| Listing → Favourite | 1 : N | Cascade delete |
| Listing → Conversation | 1 : N | Cascade delete |
| Role → User | 1 : N | Restrict delete (cannot remove role while users reference it) |
| Role → RolePermission | 1 : N | Cascade delete |
| Permission → RolePermission | 1 : N | Cascade delete |
| Role → ActionLog | 1 : N | Cascade delete |
| Role → SuspiciousUser | 1 : N | Cascade delete |
| Conversation → Message | 1 : N | Cascade delete |
| RolePermission | N : M | Junction table between Role and Permission |
| Favourite | N : M | Junction table between User and Listing (composite PK) |

---

## 2. Third Normal Form (3NF) Analysis

A relation is in **3NF** when:
1. It is in **2NF** (no partial dependencies on a composite key).
2. It has **no transitive dependencies** (non-key attributes depend only on the primary key, not on other non-key attributes).

### 2.1 User

**Schema:** `(id, username, email, passwordHash, avatarUrl, createdAt, roleId)`
- **PK:** `id`
- **FDs:** `id → {username, email, passwordHash, avatarUrl, createdAt, roleId}`
- **Analysis:** All non-key attributes depend solely on `id`. `email` has a unique constraint but is not a determinant for other attributes. **3NF ✓**

### 2.2 Listing

**Schema:** `(id, sellerId, title, description, price, category, photos, datePosted, status)`
- **PK:** `id`
- **FDs:** `id → {sellerId, title, description, price, category, photos, datePosted, status}`
- **Analysis:** All attributes depend on `id`. `photos` is stored as JSON (a single atomic value from the relational perspective). **3NF ✓**

### 2.3 Review

**Schema:** `(id, listingId, userId, rating, title, body, createdAt, updatedAt)`
- **PK:** `id`
- **FDs:** `id → {listingId, userId, rating, title, body, createdAt, updatedAt}`
- **Analysis:** Each review is a unique entity. `listingId` and `userId` are foreign keys; no transitive dependency exists. **3NF ✓**

### 2.4 Favourite

**Schema:** `(userId, listingId, createdAt)`
- **PK:** `(userId, listingId)` — composite key
- **FDs:** `(userId, listingId) → {createdAt}`
- **Analysis:** `createdAt` depends on the full composite key. No partial or transitive dependencies. **3NF ✓**

### 2.5 Role

**Schema:** `(id, name, description)`
- **PK:** `id`
- **FDs:** `id → {name, description}`; `name → {description}` (name is unique)
- **Analysis:** `name` is an alternate key. `description` depends on `name` which is a candidate key, not a non-key attribute. **3NF ✓**

### 2.6 Permission

**Schema:** `(id, name, description)`
- **PK:** `id`
- **FDs:** `id → {name, description}`; `name → {description}` (name is unique)
- **Analysis:** Same reasoning as Role. **3NF ✓**

### 2.7 RolePermission

**Schema:** `(roleId, permissionId)`
- **PK:** `(roleId, permissionId)` — composite key
- **FDs:** None beyond the key itself
- **Analysis:** Pure junction table with no non-key attributes. **3NF ✓**

### 2.8 Conversation

**Schema:** `(id, listingId, participantAId, participantBId, createdAt)`
- **PK:** `id`
- **FDs:** `id → {listingId, participantAId, participantBId, createdAt}`
- **Analysis:** All attributes depend on the surrogate key `id`. Participant IDs are foreign keys to User. **3NF ✓**

### 2.9 Message

**Schema:** `(id, conversationId, senderId, body, createdAt)`
- **PK:** `id`
- **FDs:** `id → {conversationId, senderId, body, createdAt}`
- **Analysis:** All attributes depend on `id`. Foreign keys reference Conversation and User. **3NF ✓**

### 2.10 ActionLog

**Schema:** `(id, userId, roleId, action, details, createdAt)`
- **PK:** `id`
- **FDs:** `id → {userId, roleId, action, details, createdAt}`
- **Analysis:** `userId` and `roleId` are foreign keys. No transitive dependencies. **3NF ✓**

### 2.11 SuspiciousUser

**Schema:** `(id, userId, roleId, reason, score, createdAt, updatedAt, resolvedAt)`
- **PK:** `id`
- **FDs:** `id → {userId, roleId, reason, score, createdAt, updatedAt, resolvedAt}`
- **Analysis:** All non-key attributes depend on `id`. `resolvedAt` is nullable. **3NF ✓**

### 2.12 MongoDB: chat_messages

**Schema:** `(id, conversationId, senderId, recipientId, listingId, body, createdAt)`
- **PK:** `id` (ObjectId)
- **Analysis:** Document collection. Each document is self-contained. The `recipientId` and `listingId` are denormalised for query performance (avoiding joins in MongoDB). This is an intentional design choice for a NoSQL store where read patterns favour embedded context over strict normalisation. **Appropriate for document model ✓**

---

## 3. Design Decisions

### 3.1 Surrogate Keys
All tables use UUID-based surrogate primary keys (`id`) rather than natural keys. This avoids key changes propagating through foreign keys and simplifies distributed ID generation.

### 3.2 Role-Permission Many-to-Many
The `RolePermission` junction table enables flexible permission assignment. Each role can have multiple permissions and each permission can belong to multiple roles, without duplicating permission definitions.

### 3.3 Conversation Participant Modelling
`Conversation` stores `participantAId` and `participantBId` as separate columns (not an array) to enforce the two-party constraint at the schema level and enable efficient indexing on each participant.

### 3.4 MongoDB for Chat
Real-time chat messages are stored in MongoDB rather than PostgreSQL because:
- Chat messages are append-only with no update requirements.
- MongoDB's document model allows embedding `recipientId` and `listingId` directly, avoiding joins for message retrieval.
- High write throughput suits the insert-heavy chat workload.
- The PostgreSQL `Message` table remains for seeded/demo data; live chat flows through MongoDB.

### 3.5 photos as JSON
`Listing.photos` is stored as a PostgreSQL `JSON` column (array of URL strings). This avoids a separate `Photo` table since photos have no independent identity or metadata beyond the URL.

### 3.6 Audit Tables
`ActionLog` and `SuspiciousUser` both reference `roleId` in addition to `userId` to capture the role context at time of action/detection, enabling historical audit queries even if a user's role changes.
