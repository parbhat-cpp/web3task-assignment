import { API_URL } from "../config";

const WORDLIST_URL = `${API_URL}/api/wordlist`;
const WORDLIST_CACHE_KEY = "wordlist";

export type WordListCategory = {
  id: string;
  name: string;
  words: string[];
};

export type WordList = {
  categories: WordListCategory[];
};

let wordListRequest: Promise<WordList> | null = null;

const isWordList = (value: unknown): value is WordList => {
  if (!value || typeof value !== "object" || !("categories" in value)) {
    return false;
  }

  const categories = value.categories;
  return (
    Array.isArray(categories) &&
    categories.every(
      (category) =>
        typeof category === "object" &&
        category !== null &&
        "id" in category &&
        "name" in category &&
        "words" in category &&
        typeof category.id === "string" &&
        typeof category.name === "string" &&
        Array.isArray(category.words) &&
        category.words.every((word) => typeof word === "string"),
    )
  );
};

export const getCachedWordList = (): WordList | null => {
  const cachedWordList = localStorage.getItem(WORDLIST_CACHE_KEY);
  if (!cachedWordList) return null;

  try {
    const parsedWordList: unknown = JSON.parse(cachedWordList);
    return isWordList(parsedWordList) ? parsedWordList : null;
  } catch (error) {
    console.error("Unable to read cached word list", error);
    return null;
  }
};

export const preloadWordList = (): Promise<WordList> => {
  if (wordListRequest) return wordListRequest;

  wordListRequest = fetch(WORDLIST_URL)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Word list request failed with status ${response.status}`);
      }

      const wordList: unknown = await response.json();
      if (!isWordList(wordList)) {
        throw new Error("Word list response has an invalid format");
      }

      localStorage.setItem(WORDLIST_CACHE_KEY, JSON.stringify(wordList));
      return wordList;
    })
    .finally(() => {
      wordListRequest = null;
    });

  return wordListRequest;
};
