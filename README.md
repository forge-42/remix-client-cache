# remix-client-cache

![GitHub Repo stars](https://img.shields.io/github/stars/Code-Forge-Net/remix-client-cache?style=social)
![npm](https://img.shields.io/npm/v/remix-client-cache?style=plastic)
![GitHub](https://img.shields.io/github/license/Code-Forge-Net/remix-client-cache?style=plastic)
![npm](https://img.shields.io/npm/dy/remix-client-cache?style=plastic) 
![npm](https://img.shields.io/npm/dm/remix-client-cache?style=plastic) 
![GitHub top language](https://img.shields.io/github/languages/top/Code-Forge-Net/remix-client-cache?style=plastic) 

<img style="display: block; margin: 0 auto;" src="./assets/remix-cache.png" height="300px" align="middle" /> 


remix-client-cache is a powerful and lightweight library made for react-router v7 framework mode to cache your server loader data on the client using clientLoaders.

By default it uses the stale while revalidate strategy and hot swaps your stale info once loaded from the server. It also allows you to invalidate the cache for a specific key or multiple keys.

It allows you to pass in an adapter of your choice to cache your data. 

It comes with a default adapter that uses in memory storage to cache your data.

First party support for localStorage, sessionStorage and localforage packages. You can just provide them as the argument to `configureGlobalCache`.

# Important information

This library is now a part of the React Router ecosystem and runs on top of React Router. It should be compatible with remix.run but if you're having issues version
1.1.0 is the last version that will work with remix.run.

## Install

```bash
npm install remix-client-cache
```

## Basic usage

Here is an example usage of remix-client-cache with the default in memory adapter.

```tsx 
import type { Route } from "./+types/_index";
import { createClientLoaderCache, CacheRoute } from "remix-client-cache";

// Some slow server loader
export const loader = async ({ params }: Route.LoaderArgs) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${params.user}`
  );
  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { user: { ...user, description: Math.random() } };
};

// Caches the loader data on the client
export const clientLoader = createClientLoaderCache<Route.ClientLoaderArgs>(); 

  // The data is automatically cached for you and hot swapped when refetched
export default CacheRoute(function Index({ loaderData }: Route.LoaderData) {
  const { user } = loaderData; 
  return (
    <div>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description} 
    </div>
  );
})

```

## Cache adapters

The library exports an interface you need to implement in order to create your own cache adapter. The interface is called `CacheAdapter`.
It closely matches the interface of `Storage` and requires you to have the following methods:

- `getItem`: takes a key and returns a promise that resolves to the value stored at that key
- `setItem`: takes a key and a value and returns a promise that resolves when the value is stored
- `removeItem`: takes a key and returns a promise that resolves when the value is removed

The `cacheLoaderData` will use the default memory cache adapter that comes with the library. If you want an advanced use-case make sure that the adapter you provide implements the `CacheAdapter` interface.

```ts
// Inside your entry.client.tsx file 
import { HydratedRouter } from "react-router/dom"
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { configureGlobalCache } from "remix-client-cache";

// You can use the configureGlobalCache function to override the libraries default in-memory cache adapter
configureGlobalCache(() => localStorage); // uses localStorage as the cache adapter

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});

```

You can use the `configureGlobalCache` function to override the libraries default in-memory cache adapter. It will globally switch to whatever adapter you provide to it.

If you want to have a per route adapter you can use the `createCacheAdapter` to create an adapter and provide it to your hooks and functions.

```tsx

import { createCacheAdapter, useCachedLoaderData } from "remix-client-cache";
import type { Route } from "./+types/_index";

const { adapter } = createCacheAdapter(() => localStorage); // uses localStorage as the cache adapter

// Caches the loader data on the client
export const clientLoader = (args: Route.ClientLoaderArgs) => cacheClientLoader(args, { 
  // We pass our custom adapter to the clientLoader
  adapter
});
  
// make sure you turn this flag on
clientLoader.hydrate = true;

export default function Index() {
  const { user } = useCachedLoaderData<typeof loader>({ 
    // We use the adapter returned by the createCacheAdapter function
    adapter
  });

  return (
    <div>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description} 
    </div>
  );
} 

```

Here are some examples of how you can use the library with different global adapters.

```ts
configureGlobalCache(() => localStorage); // uses localStorage as the cache adapter
configureGlobalCache(() => sessionStorage); // uses sessionStorage as the cache adapter
configureGlobalCache(() => localforage); // uses localforage as the cache adapter
```

Also with different per route adapters:

```ts
const { adapter } = createCacheAdapter(() => localStorage); // uses localStorage as the cache adapter
const { adapter } = createCacheAdapter(() => sessionStorage); // uses sessionStorage as the cache adapter
const { adapter } = createCacheAdapter(() => localforage); // uses localforage as the cache adapter
```

Let's say you want to use a custom adapter that uses a database to store the data. 

You can do that by implementing the `CacheAdapter` interface and passing it to the `configureGlobalCache` or `createCacheAdapter` function.

```ts
class DatabaseAdapter implements CacheAdapter {
  async getItem(key: string) {
    // get the item from the database
  }

  async setItem(key: string, value: string) {
    // set the item in the database
  }

  async removeItem(key: string) {
    // remove the item from the database
  }
}

configureGlobalCache(() => new DatabaseAdapter()); // uses your custom adapter as the cache adapter globally
const { adapter } = createCacheAdapter(() => new DatabaseAdapter()); // uses your custom adapter as the cache adapter per route
```
 

## API's

### CacheRoute
Wrapper function that wraps your component and provides the loader data to it. It takes two arguments, the component that is wrapped as the first one, and the config options as the second (like the adapter to use). 

```tsx
import { CacheRoute, createClientLoaderCache } from "remix-client-cache";
import type { Route } from "./+types/_index";

// Caches the loader data on the client
export const clientLoader = createClientLoaderCache<Route.ClientLoaderArgs>(); 

// Wraps the component and provides the loader data to it that gets hot swapped behind the scenes
export default CacheRoute(function Index({ loaderData }: Route.LoaderData) {
  const { user } = loaderData; 
  return (
    <div>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description} 
    </div>
  );
})
```

### createCacheAdapter

Function that creates a cache adapter and returns it. It takes one argument, the `adapter` that is used to store the data. 

```ts
import { createCacheAdapter } from "remix-client-cache";

const { adapter } = createCacheAdapter(() => localStorage); // uses localStorage as the cache adapter
```

### configureGlobalCache

Function that configures the global cache adapter. It takes one argument, the `adapter` that is used to store the data. 

```ts
import { configureGlobalCache } from "remix-client-cache";

configureGlobalCache(() => localStorage); // uses localStorage as the cache adapter
```


### cacheClientLoader

Used to cache the data that is piped from the loader to your component using the `clientLoader` export. 

It takes two arguments, the first one is the `ClientLoaderFunctionArgs` object that is passed to the `clientLoader` function, the second one is an object with the following properties:

- `type` - that tells the client loader if it should use the normal caching mechanism where it stores the data and early returns that instead of refetching or if it should use the `staleWhileRevalidate` mechanism where it returns the cached data and refetches in the background. 
- `key` - key that is used to store the data in the cache. Defaults to the current route path including search params and hashes. (eg. /user/1?name=John#profile)
- `adapter` - the cache adapter that is used to store the data. Defaults to the in memory adapter that comes with the library.
 

```tsx
 
import { cacheClientLoader, useCachedLoaderData } from "remix-client-cache";
import type { Route } from "./+types/_index";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${params.user}`
  );
  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { user: { ...user, description: Math.random() } };
};

export const clientLoader = (args: Route.ClientLoaderArgs) => cacheClientLoader(args, {
  type: "swr", // default is swr, can also be set to normal
  key: "/user/1" // default is the current route path including search params and hashes
  adapter: () => localStorage // default is the in memory adapter, can be anything your wish
});
clientLoader.hydrate = true;

```

### createClientLoaderCache

Creates everything needed to cache the data via clientLoader, behind the scenes creates the clientLoader object with the correct hydrate flag and the adapter.

```tsx
import { createClientLoaderCache, cacheClientLoader } from "remix-client-cache";
import type { Route } from "./+types/_index";

export const clientLoader = createClientLoaderCache(); 

// above is equivalent to:
export const clientLoader = (args: Route.ClientLoaderArgs) => cacheClientLoader<Route.ClientLoaderArgs>(args);
clientLoader.hydrate = true;
```

### decacheClientLoader

Used to remove the data that is piped from the loader to your component using the `clientLoader` export. 

```tsx
import { decacheClientLoader, useCachedLoaderData } from "remix-client-cache";
import type { Route } from "./+types/_index";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${params.user}`
  );
  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { user: { ...user, description: Math.random() } };
};
// The data is cached here
export const clientLoader = createClientLoaderCache<Route.ClientLoaderArgs>();
clientLoader.hydrate = true;
// It is de-cached after a successful action submission via the clientAction export
export const clientAction = decacheClientLoader;

```

Accepts an optional object with the following properties:
- `key` - key that is used to store the data in the cache.
- `adapter` - the cache adapter that is used to store the data.



### useCachedLoaderData

Hook that can be used to get the cached data from the `clientLoader` export. Must be used together with `cacheClientLoader`  because the data returned from
the `cacheClientLoader` is augmented to work with `useCachedLoaderData` in mind and not the standard `useLoaderData` hook.

```tsx
import { useCachedLoaderData } from "remix-client-cache";
import type { Route } from "./+types/_index";

// Must be used together with cacheClientLoader
export const clientLoader = (args: Route.ClientLoaderArgs) => cacheClientLoader<Route.ClientLoaderArgs>(args, "swr");
clientLoader.hydrate = true;

export default function Index() {
  // The data is automatically cached for you and hot swapped when refetched
  const { user } = useCachedLoaderData<typeof loader>(); 

  return (
    <div>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description} 
    </div>
  );
}
``` 

Accepts an optional object with the following properties:
- `adapter` - the cache adapter that is used to store the data. Defaults to the in memory adapter that comes with the library.
 

 
### useSwrData

Hook used to get an SWR component that hot swaps the data for you. It takes one argument, loaderData returned by the `useCachedLoaderData` OR `useLoaderData` hook. 

```tsx
import { useCachedLoaderData, useSwrData } from "remix-client-cache";
import type { Route } from "./+types/_index";

export const clientLoader = (args: Route.ClientLoaderArgs) => cacheClientLoader<Route.ClientLoaderArgs>(args);
clientLoader.hydrate = true;

export default function Index() {
  // We do not destructure the data so we can pass in the object into the useSwrData hook
  const loaderData = useLoaderData<typeof loader>(); 
  // You can also use useCachedLoaderData hook with the useSwrData hook
  const loaderData = useCachedLoaderData<typeof loader>(); 
  // Pass the loader data into the hook and the component will handle everything else for you
  const SWR = useSwrData(loaderData);

  return (
    <SWR>
      {/** Hot swapped automatically */}
      {({ user }) => (
        <div>
          {data.name} <hr /> {data.email}
          <hr />
          {data.username}
          <hr />
          {data.website} <hr />
          {data.description} 
        </div>
      )}
    </SWR>
  );
}
```

### invalidateCache

Utility function that can be used to invalidate the cache for a specific key. It takes one argument, the `key` that is used to store the data in the cache. 
Can also be an array of keys

```ts
import { invalidateCache } from "remix-client-cache";

invalidateCache("/user/1"); // invalidates the cache for the /user/1 route
```

Keep in mind this can only be used on the client, so either in `clientLoader` or `clientAction` exports or the components themselves.

### useCacheInvalidator

Hook that returns a function that can be used to invalidate the cache for a specific key. It takes one argument, the `key` that is used to store the data in the cache. Can also be an array of keys

```tsx
import { useCacheInvalidator } from "remix-client-cache";

export default function Index() {
  const { invalidateCache } = useCacheInvalidator(); 

  return (
    <div>
      // invalidates the cache for the /user/1 route
      <button onClick={ () => invalidateCache("/user/1") }>Invalidate cache</button>
    </div>
  );
}
``` 

## Migration from v2 to v3

Some of the previous functions that didn't require type info now require `Route.ClientLoaderArgs` type info. Providing this info should be enough to get you up and running.

 


## Support 

If you like the project, please consider supporting us by giving a ⭐️ on Github.


## License

MIT

## Bugs

If you find a bug, please file an issue on [our issue tracker on GitHub](https://github.com/Code-Forge-Net/remix-client-cache/issues)


## Contributing

Thank you for considering contributing to remix-client-cache! We welcome any contributions, big or small, including bug reports, feature requests, documentation improvements, or code changes.

To get started, please fork this repository and make your changes in a new branch. Once you're ready to submit your changes, please open a pull request with a clear description of your changes and any related issues or pull requests.

Please note that all contributions are subject to our [Code of Conduct](https://github.com/Code-Forge-Net/remix-client-cache/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

We appreciate your time and effort in contributing to remix-client-cache and helping to make it a better tool for the community!

