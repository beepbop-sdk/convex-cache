## Introduction

A library for caching Convex queries on the client and server, providing supercharged performance for your Convex-powered applications.

## Features

- 🚀 **Client-side caching** - Cache query results in the browser using IndexedDb
- ⚡ **Server-side caching** - Cache query results in server components
- 🔄 **Automatic revalidation** - Smart cache invalidation and revalidation strategies
- 📄 **Paginated query support** - Built-in support for paginated queries
- ✅ **Type-safe** - Full TypeScript support with Zod schema validation
- 🛠️ **CLI tool** - Development tooling for generating schemas from Convex functions
- ⚛️ **React & Next.js adapters** - Easy integration with React and Next.js applications
- 🛠️ **Composable** - Easy extension for other frameworks not currently supported using adapters

## Installation

```bash
npm install convex-cache
# or
bun add convex-cache
# or
yarn add convex-cache
```

## How it works

`convex-cache` provides two caching strategies: client-side caching for instant page loads and server-side caching for optimized server rendering. Both strategies automatically revalidate when data changes on Convex. Devs can use either one or both simultaneously depending on their project requirements.

### Client Cache

The client cache stores query results in IndexedDb, enabling instant page loads. When a component requests data, the cache is checked first. If found, cached data is returned immediately while a background revalidation ensures freshness. On cache miss, data is fetched from Convex, validated against schemas, stored in IndexedDb, and returned to the component.

<a aria-label="Client Cache Flowchart" href="https://github.com/bigbang-sdk/convex-cache">
  <picture>
    <source srcset="https://raw.githubusercontent.com/bigbang-sdk/convex-cache/refs/heads/main/assets/flowchart/client-cache-dark.png" media="(prefers-color-scheme: dark)" />
    <source srcset="https://raw.githubusercontent.com/bigbang-sdk/convex-cache/refs/heads/main/assets/flowchart/client-cache-light.png" media="(prefers-color-scheme: light)" />
    <img src="https://raw.githubusercontent.com/bigbang-sdk/convex-cache/refs/heads/main/assets/flowchart/client-cache-light.png" alt="Client Cache Flowchart" referrerpolicy="no-referrer-when-downgrade" />
  </picture>
</a>

**Flow:**

1. User (in Singapore) requests `example.com` from Next.js
2. Next.js serves the page (without data) from the nearest edge location (Singapore - very fast)
3. Page requests and receives the data from local DB (ultra fast - on the same device)
4. Page connects to Convex (USA)
5. Convex streams changes
6. `convex-cache` automatically updates the cache in local DB

**Note:**

1. If a user is not connected to Convex at the time Convex data changes for a query, he will be served with stale data on next page visit (which will be instantly revalidated once the page connects to Convex again along with local DB cache)

### Server Cache

### Next.js

The server cache (with Next.js) leverages Next.js's native caching system, integrating seamlessly with Cache Components and Partial Pre-Rendering (PPR). Queries are preloaded in server components and cached at the Next.js level. When data changes on Convex, the Next.js cache is automatically revalidated, ensuring pages always serve fresh data.

<a aria-label="Server Cache Flowchart" href="https://github.com/bigbang-sdk/convex-cache">
  <picture>
    <source srcset="https://raw.githubusercontent.com/bigbang-sdk/convex-cache/refs/heads/main/assets/flowchart/server-cache-dark.png" media="(prefers-color-scheme: dark)" />
    <source srcset="https://raw.githubusercontent.com/bigbang-sdk/convex-cache/refs/heads/main/assets/flowchart/server-cache-light.png" media="(prefers-color-scheme: light)" />
    <img src="https://raw.githubusercontent.com/bigbang-sdk/convex-cache/refs/heads/main/assets/flowchart/server-cache-light.png" alt="Server Cache Flowchart" referrerpolicy="no-referrer-when-downgrade" />
  </picture>
</a>

**Flow:**

1. User (in Singapore) requests `example.com` from Next.js
2. Next.js serves the page (with cached data) from the nearest edge location (Singapore - very fast)
3. Page connects to Convex (USA)
4. Convex streams changes
5. `convex-cache` automatically updates the cache in local DB

**Note:**

1. In order for the Next.js cache to be revalidated, at least one user needs to be connected to Convex at the time when Convex data changes for a query. If at least one user is connected, the cache is updated for all subsequent users of that query.
2. In no user is connected to Convex at the time Convex data changes for a query, the next request will serve stale data on `preloadQuery` (which will be instantly revalidated once the page connects to Convex again along with Next.js cache).

### Other frameworks for server caching

`convex-cache` currently offers adapter for Next.js. However, custom adapters can be built for other frameworks / patterns by leveraging code from the `core` folder in `convex-cache` source code.

## Setup

### Step 1: Setup Convex Queries with Schema Support

Create a utility file to wrap your Convex queries with schema support. You can use either `vQuery` (for Convex validators) or `zQuery` (for Zod schemas). See the [Zod Support](#zod-support) section for `zQuery` setup instructions.

#### Using vQuery (Convex Validators)

Create a `convex/utils/vQuery.ts` file:

```typescript
import { NoOp, customQuery } from "convex-helpers/server/customFunctions";
import { query } from "../_generated/server";
import { vQueryImpl } from "convex-cache/convex";

export const baseVQuery = customQuery(query, NoOp);

export const vQuery = vQueryImpl(baseVQuery);
```

Then use it in your queries:

```typescript
import { vQuery } from "./utils/vQuery";
import { v } from "convex/values";

export const getUser = vQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    id: v.id("users"),
    name: v.string(),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
```

When you wrap your queries with `vQuery`, it becomes eligible to be added to the schema map. If a query is written without the `vQuery` or `zQuery` wrapper, it will be skipped from schema generation and won't be eligible to be used with `convex-cache` hooks. However, they can still be used with Convex's native hooks.

### Step 2: Generate Schema Map

Use the CLI tool to generate a schema map from your Convex functions:

```bash
npx convex-cache dev
# or
bunx convex-cache dev
```

This watches your Convex directory, runs `convex dev`, and automatically generates Zod schemas when functions change. The schema map will be available at `convex/_generated/schemaMap.ts` (or `.js` for JavaScript projects).

The schema map ensures that if you change the shape of the data returned from your queries, existing caches with previous shape do not cause errors for clients.

## How to Use

### Client Cache

Client-side caching stores query results in IndexedDb, providing **supercharged** performance. With client-side caching enabled, the first page load is instant. The cache is automatically revalidated when data changes on Convex.

#### Step 1: Setup React Provider

Wrap your app with `ConvexCacheProvider`:

```typescript
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexCacheProvider } from "convex-cache/react";
import { schemaMap } from "./convex/_generated/schemaMap";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function App({ children }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexCacheProvider schemaMap={schemaMap}>
        {children}
      </ConvexCacheProvider>
    </ConvexProvider>
  );
}
```

#### Step 2: Use Cached Queries in React

```typescript
import { useCachedQueryClient } from "convex-cache/react";
import { api } from "./convex/_generated/api";

function UserProfile({ userId }) {
  const user = useCachedQueryClient({
    query: api.queries.getUser,
    args: { userId },
  });

  if (!user) return <div>Loading...</div>;

  return <div>{user.name}</div>;
}
```

### Server Cache

Server-side caching allows you to preload queries in Next.js server components and cache them for improved performance. `preloadQuery` caches query results in Next.js's native cache and works seamlessly with Cache Components and Partial Pre-Rendering (PPR). The cache on Next.js servers and edge is automatically revalidated when data changes on Convex.

#### Step 1: Setup Preloader

Create a preloader function using `buildPreloader`:

```typescript
import { buildPreloader } from "convex-cache/next/server";
import { schemaMap } from "./convex/_generated/schemaMap";

const preloadQuery = buildPreloader(schemaMap);
```

#### Step 2: Preload Queries in Server Components

```typescript
import { preloadQuery } from "./path/to/preloader";
import { useCachedQueryServer } from "convex-cache/next";
import { api } from "./convex/_generated/api";

export default async function UserPage({ params }) {
  const preloadedData = await preloadQuery({
    query: api.queries.getUser,
    args: { userId: params.userId },
  });

  return <UserProfile preloadedData={preloadedData} />;
}

function UserProfile({ preloadedData }) {
  const user = useCachedQueryServer({
    query: api.queries.getUser,
    args: { userId: params.userId },
    preloadedData,
  });

  return <div>{user.name}</div>;
}
```

## API Reference

### Client Cache Hooks (`convex-cache/react`)

#### `useCachedQueryClient`

Hook for using cached queries in React client components. Results are cached in IndexedDb and automatically revalidated when data changes on Convex.

```typescript
import { useCachedQueryClient } from "convex-cache/react";
import { api } from "./convex/_generated/api";

function UserProfile({ userId }) {
  const user = useCachedQueryClient({
    query: api.queries.getUser,
    args: { userId },
  });

  if (!user) return <div>Loading...</div>;

  return <div>{user.name}</div>;
}
```

**Parameters:**

- `query`: The Convex query function reference
- `args`: The query arguments object

**Returns:** The query result, or `undefined` while loading

#### `useCachedPaginatedQueryClient`

Hook for using cached paginated queries in React client components.

```typescript
import { useCachedPaginatedQueryClient } from "convex-cache/react";
import { api } from "./convex/_generated/api";

function UserList() {
  const { results, status, loadMore } = useCachedPaginatedQueryClient({
    query: api.queries.listUsers,
    args: { filter: "active" },
    options: { initialNumItems: 10 },
  });

  if (status === "LoadingFirstPage") return <div>Loading...</div>;

  return (
    <div>
      {results.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
      <button onClick={loadMore}>Load More</button>
    </div>
  );
}
```

**Parameters:**

- `query`: The Convex paginated query function reference
- `args`: The query arguments object (excluding pagination options)
- `options`: Pagination options
  - `initialNumItems`: Number of items to load initially

**Returns:** An object with:

- `results`: Array of paginated results
- `status`: Loading status (`"LoadingFirstPage"` | `"CanLoadMore"` | `"Exhausted"`)
- `loadMore`: Function to load the next page
- `isLoading`: Boolean indicating if more items are being loaded

### Server Cache Hooks (`convex-cache/next`)

#### `useCachedQueryServer`

Hook for using cached queries in Next.js server components. Requires preloaded data from `preloadQuery` and automatically revalidates the Next.js cache when data changes.

```typescript
import { useCachedQueryServer } from "convex-cache/next";
import { api } from "./convex/_generated/api";

function UserProfile({ preloadedData, userId }) {
  const user = useCachedQueryServer({
    query: api.queries.getUser,
    args: { userId },
    preloadedData,
  });

  return <div>{user.name}</div>;
}
```

**Parameters:**

- `query`: The Convex query function reference
- `args`: The query arguments object
- `preloadedData`: Preloaded data from `preloadQuery`

**Returns:** The query result

#### `useCachedPaginatedQueryServer`

Hook for using cached paginated queries in Next.js server components. Requires preloaded data and supports pagination with automatic cache revalidation.

```typescript
import { useCachedPaginatedQueryServer } from "convex-cache/next";
import { api } from "./convex/_generated/api";

function UserList({ preloadedData }) {
  const { results, status, loadMore } = useCachedPaginatedQueryServer({
    query: api.queries.listUsers,
    args: { filter: "active" },
    options: { initialNumItems: 10 },
    preloadedData,
  });

  return (
    <div>
      {results.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
      {status === "CanLoadMore" && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

**Parameters:**

- `query`: The Convex paginated query function reference
- `args`: The query arguments object (excluding pagination options)
- `options`: Pagination options
  - `initialNumItems`: Number of items to load initially
- `preloadedData`: Preloaded data from `preloadQuery`

**Returns:** An object with:

- `results`: Array of paginated results
- `status`: Loading status (`"LoadingFirstPage"` | `"CanLoadMore"` | `"Exhausted"`)
- `loadMore`: Function to load the next page
- `isLoading`: Boolean indicating if more items are being loaded

## Zod Support

If you prefer using Zod schemas instead of Convex validators, you can use `zQuery` instead of `vQuery`. This allows you to define your query schemas using Zod's validation library.

### Setup zQuery

Create a `convex/utils/zQuery.ts` file:

```typescript
import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomQuery } from "convex-helpers/server/zod4";
import { query } from "../_generated/server";
import { zQueryImpl } from "convex-cache/convex";

export const baseZQuery = zCustomQuery(query, NoOp);

export const zQuery = zQueryImpl(baseZQuery);
```

### Using zQuery in Your Queries

Once set up, you can use `zQuery` with Zod schemas:

```typescript
import { zQuery } from "./utils/zQuery";
import { z } from "zod";

export const getUser = zQuery({
  args: { userId: z.string() },
  returns: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().int().min(0).optional(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
```

Both `vQuery` and `zQuery` work seamlessly with `convex-cache`. The CLI tool automatically generates the appropriate schemas regardless of which approach you choose.

## License

MIT
