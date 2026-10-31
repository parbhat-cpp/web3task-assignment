import express from "express";

import { getWordList } from "../controller/wordlist.controller.js";

const router = express.Router();

router.get("/", getWordList);

export default router;
