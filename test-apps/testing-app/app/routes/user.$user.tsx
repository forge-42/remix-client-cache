import { type LoaderFunctionArgs, data } from "react-router";
import {
  type ClientLoaderFunctionArgs,
  Link,
  useLoaderData,
  useNavigate,
} from "react-router";

import {
  CacheRoute,
  cacheClientLoader,
  createCacheAdapter,
  useCachedLoaderData,
  useSwrData,
} from "remix-client-cache";
import type { Route } from "./+types/user.$user";

const { adapter } = createCacheAdapter(() => localStorage);

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${params.user}`,
  );
  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return data({ user: { ...user, description: Math.random() } });
};

// Caches the loader data into memory
export const clientLoader = async (args: ClientLoaderFunctionArgs) =>
  cacheClientLoader<Route.ClientLoaderArgs>(args, {
    adapter,
  });

// make sure you turn this flag on
clientLoader.hydrate = true;

export default CacheRoute(function Index({ loaderData }: Route.ComponentProps) {
  // The data is automatically cached for you and hot swapped
  const { user } = loaderData;
  const SWR = useSwrData<Route.ComponentProps["loaderData"]>(loaderData);
  const navigate = useNavigate();

  return (
    <div>
      <Link to="/">Home</Link>
      <SWR>
        {(data) => {
          return (
            <div>
              {data.user.name} <hr /> {data.user.email}
              <hr />
              {data.user.username}
              <hr />
              {data.user.website} <hr />
              {data.user.description}
              {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
              <button
                onClick={() =>
                  navigate(`/user/${Math.round(Math.random() * 10) + 1}`)
                }
              >
                Go to new user
              </button>
            </div>
          );
        }}
      </SWR>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description}
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
      <button
        onClick={() => navigate(`/user/${Math.round(Math.random() * 10) + 1}`)}
      >
        Go to new user
      </button>
    </div>
  );
});
