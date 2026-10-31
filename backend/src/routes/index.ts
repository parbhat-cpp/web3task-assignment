import express from "express";

import wordlistRouter from "./wordlist.route";

type Route = {
  path: string;
  router: express.Router;
};

const router = express.Router();

const routes: Route[] = [
  {
    path: "/wordlist",
    router: wordlistRouter,
  },
];

routes.forEach((route) => {
  router.use(route.path, route.router);
});

export default router;
