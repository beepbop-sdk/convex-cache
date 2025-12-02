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

1. If a user isn’t connected to Convex when the data for a query changes, their next visit will show stale data (from their local DB). However, it is immediately revalidated once the page connects to Convex.

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
5. `convex-cache` automatically revalidates the cache in Next.js's native cache using an internal server action

**Note:**

1. The Next.js cache only revalidates if at least one user is connected to Convex when a query’s data changes. If someone is connected, all later users get fresh data.
2. If no users are connected when the data changes, the next `preloadQuery` will return stale data. However, it will be revalidated instantly once the page connects to Convex.

### Other frameworks for server caching

`convex-cache` currently includes adapter for Next.js. However, custom adapters can be built for other frameworks / patterns by leveraging code from the `core` folder in `convex-cache` source code.

## Setup

### Generate Schema Map

Use `convex-cache dev` instead of `convex dev` to generate a schema map from your Convex functions:

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

If you prefer using Zod schemas instead of Convex validators, you can set up Convex with Zod. This allows you to define your query schemas using Zod's validation library and works seamlessly with `convex-cache`. See the [Zod Validation documentation](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md#zod-validation) for setup instructions.

## License

MIT
