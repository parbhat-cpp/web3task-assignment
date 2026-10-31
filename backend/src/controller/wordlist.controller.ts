import type { Request, Response } from "express";
import wordList from "../data/wordlist.json";

export const getWordList = async (req: Request, res: Response) => {
  try {
    res.status(200).json(wordList);
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: "Internal Server Error" });
  }
};
