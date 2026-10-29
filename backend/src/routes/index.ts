import express from "express";

type Route = {
    path: string;
    handler: (req: express.Request, res: express.Response) => void;
}

const router = express.Router();

const routes: Route[] = [];

routes.forEach((route) => {
    router.use(route.path, route.handler);
});

export default router;
