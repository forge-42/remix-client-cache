import {
  ClientLoaderFunctionArgs,
  data,
  redirect,
  useNavigate,
} from "react-router";
import type { MetaFunction } from "react-router";
import {
  CacheRoute,
  type ExtendedComponentProps,
  cacheClientLoader,
  createClientLoaderCache,
  decacheClientLoader,
  useCachedLoaderData,
} from "remix-client-cache";
import type { Route } from "./+types/_index";
export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/users/2");

  const user = await response.json();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { user: { ...user, description: Math.random() } };
};

export const clientLoader = createClientLoaderCache<Route.ClientLoaderArgs>();

export const clientAction = decacheClientLoader;

export default CacheRoute(function Index(
  props: ExtendedComponentProps<Route.ComponentProps>,
) {
  console.log("Index", props);
  const { user } = props.loaderData;
  const navigate = useNavigate();

  return (
    <div>
      {user.name} <hr /> {user.email}
      <hr />
      {user.username}
      <hr />
      {user.website} <hr />
      {user.description}
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
      <button onClick={() => navigate("/test")}>Test</button>
    </div>
  );
});
