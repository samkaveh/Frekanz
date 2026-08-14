import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

const storage =
  typeof window !== "undefined"
    ? createJSONStorage(() => localStorage)
    : undefined;

type Puzzle = {
  word: string;
  state: string;
  bundle: string;
};
type PuzzleStore = {
  wordPuzzles: Puzzle[];
  addPuzzle: (puzzle: Puzzle) => void;
  updatePuzzleState: (puzzle: Puzzle) => void;
};

export const useStore = create<PuzzleStore>()(
  persist(
    (set) => ({
      wordPuzzles: [{ word: "start", state: "unsolved", bundle: "0" }],
      addPuzzle: ({ word, state, bundle }) =>
        set((store) => {
          // Check if the word already exists in the array
          const existingIndex = store.wordPuzzles.findIndex(
            (p) => p.word === word
          );

          if (existingIndex !== -1) {
            // If the word already exists, update its state
            const updatedPuzzles = [...store.wordPuzzles];
            updatedPuzzles[existingIndex].state = state;
            return { wordPuzzles: updatedPuzzles };
          } else {
            // If the word doesn't exist, add it to the array
            return {
              wordPuzzles: [...store.wordPuzzles, { word, state, bundle }],
            };
          }
        }),
      updatePuzzleState: ({ word, state, bundle }) =>
        set((store) => ({
          wordPuzzles: store.wordPuzzles.map((puzzle) =>
            puzzle.word === word ? { ...puzzle, state: state } : puzzle
          ),
        })),
    }),
    { name: "puzzleStore", storage }
  )
);
