import { createHashRouter } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Home from "./routes/Home";
import NewGame from "./routes/NewGame";
import Play from "./routes/Play";
import Join from "./routes/Join";

// Hash routing keeps the static build deployable to any host with zero rewrite config.
export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/new", element: <NewGame /> },
      { path: "/play", element: <Play /> },
      { path: "/join/:code", element: <Join /> },
    ],
  },
]);
