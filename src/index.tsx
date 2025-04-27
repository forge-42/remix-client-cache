import { useEffect, useState } from "react";
import React from "react";
import {
  Await,
  type ClientActionFunctionArgs,
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from "react-router";

const map = new Map();

export type ExtendedComponentProps<T> = CachedLoaderDataReturn & T;

export const CacheRoute =
  (
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    Component: (props: any) => JSX.Element,
    settings?: CachedLoaderDataProps,
  ) =>
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (props: any) => {
    const { cacheKey, invalidate, ...rest } = useCachedLoaderData(settings);
    return (
      <Component
        {...props}
        loaderData={rest}
        invalidate={invalidate}
        cacheKey={cacheKey}
      />
    );
  };
export interface CacheAdapter {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  getItem: (key: string) => any | Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  setItem: (key: string, value: any) => Promise<any> | any;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  removeItem: (key: string) => Promise<any> | any;
}
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export let cache: CacheAdapter = {
  getItem: async (key) => map.get(key),
  setItem: async (key, val) => map.set(key, val),
  removeItem: async (key) => map.delete(key),
};

const augmentStorageAdapter = (storage: Storage) => {
  return {
    getItem: async (key: string) => {
      try {
        const item = JSON.parse(storage.getItem(key) || "");

        return item;
      } catch (e) {
        return storage.getItem(key);
      }
    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    setItem: async (key: string, val: any) =>
      storage.setItem(key, JSON.stringify(val)),
    removeItem: async (key: string) => storage.removeItem(key),
  };
};

export const createCacheAdapter = (adapter: () => CacheAdapter) => {
  if (typeof document === "undefined") return { adapter: undefined };
  const adapterInstance = adapter();
  if (adapterInstance instanceof Storage) {
    return {
      adapter: augmentStorageAdapter(adapterInstance),
    };
  }
  return {
    adapter: adapter(),
  };
};

export const configureGlobalCache = (
  newCacheInstance: () => CacheAdapter | Storage,
) => {
  if (typeof document === "undefined") return;
  const newCache = newCacheInstance();
  if (newCache instanceof Storage) {
    cache = augmentStorageAdapter(newCache);
    return;
  }
  if (newCache) {
    cache = newCache;
  }
};

export const decacheClientLoader = async (
  { request, serverAction }: ClientActionFunctionArgs,
  {
    key = constructKey(request),
    adapter = cache,
  }: { key?: string; adapter?: CacheAdapter },
) => {
  const data = await serverAction();
  await adapter.removeItem(key);
  return data;
};

type CacheClientLoaderArgs = {
  type?: "swr" | "normal";
  key?: string;
  adapter?: CacheAdapter;
};

export const cacheClientLoader = async <
  T extends ClientLoaderFunctionArgs,
  TServerLoaderReturn = Awaited<ReturnType<T["serverLoader"]>>,
>(
  { request, serverLoader }: ClientLoaderFunctionArgs,
  {
    type = "swr",
    key = constructKey(request),
    adapter = cache,
  }: CacheClientLoaderArgs = {
    type: "swr",
    key: constructKey(request),
    adapter: cache,
  },
): Promise<
  Prettify<
    TServerLoaderReturn & {
      serverData: TServerLoaderReturn;
      deferredServerData: Promise<TServerLoaderReturn> | undefined;
      key: string;
    }
  >
> => {
  const existingData = await adapter.getItem(key);

  if (type === "normal" && existingData) {
    return {
      ...existingData,
      serverData: existingData,
      deferredServerData: undefined,
      key,
    };
  }
  const data: TServerLoaderReturn = existingData
    ? existingData
    : await serverLoader();

  await adapter.setItem(key, data);
  const deferredServerData = existingData ? serverLoader() : undefined;
  const dataToReturn: TServerLoaderReturn = data ?? existingData;
  // @ts-expect-error
  return {
    ...dataToReturn,
    serverData: data,
    deferredServerData,
    key,
  };
};

interface ClientLoaderFunctionArgs extends LoaderFunctionArgs {
  serverLoader: () => unknown;
}
export const createClientLoaderCache = <U extends ClientLoaderFunctionArgs>(
  props?: CacheClientLoaderArgs,
) => {
  const clientLoader = (args: U) => cacheClientLoader<U>(args, props);
  clientLoader.hydrate = true;
  return clientLoader;
};

interface CachedLoaderDataProps {
  adapter?: CacheAdapter;
}

interface CachedLoaderDataReturn {
  cacheKey?: string;
  invalidate: () => Promise<void>;
}

export function useCachedLoaderData<T>(
  { adapter = cache }: CachedLoaderDataProps = { adapter: cache },
) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const loaderData = useLoaderData() as any;
  const navigate = useNavigate();
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const [freshData, setFreshData] = useState<any>({
    ...("serverData" in loaderData ? loaderData.serverData : loaderData),
  });

  // Unpack deferred data from the server
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    let isMounted = true;
    if (loaderData.deferredServerData) {
      loaderData.deferredServerData
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .then((newData: any) => {
          if (isMounted) {
            adapter.setItem(loaderData.key, newData);
            setFreshData(newData);
          }
        })
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        .catch((e: any) => {
          const res = e instanceof Response ? e : undefined;
          if (res && res.status === 302) {
            const to = res.headers.get("Location");
            to && navigate(to);
          } else {
            throw e;
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [loaderData]);

  // Update the cache if the data changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (
      loaderData.serverData &&
      JSON.stringify(loaderData.serverData) !== JSON.stringify(freshData)
    ) {
      setFreshData(loaderData.serverData);
    }
  }, [loaderData?.serverData]);

  return {
    ...loaderData,
    ...freshData,
    cacheKey: loaderData.key,
    invalidate: () => invalidateCache(loaderData.key),
  } as T & CachedLoaderDataReturn;
}

const constructKey = (request: Request) => {
  const url = new URL(request.url);
  return url.pathname + url.search + url.hash;
};

export const invalidateCache = async (key: string | string[]) => {
  const keys = Array.isArray(key) ? key : [key];
  for (const k of keys) {
    await cache.removeItem(k);
  }
};

export const useCacheInvalidator = () => ({
  invalidateCache,
});
export function useSwrData<T>({
  serverData,
  deferredServerData,
  ...args
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
}: any) {
  return function SWR({
    children,
  }: {
    children: (data: T) => React.ReactElement;
  }) {
    return (
      <>
        {deferredServerData ? (
          <React.Suspense fallback={children(serverData)}>
            {/* biome-ignore lint/suspicious/noExplicitAny: <explanation> */}
            <Await resolve={deferredServerData}>{children as any}</Await>
          </React.Suspense>
        ) : (
          children(serverData ?? (args as T))
        )}
      </>
    );
  };
}
