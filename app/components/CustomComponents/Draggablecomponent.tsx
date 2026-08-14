"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  UniqueIdentifier,
  useDraggable,
  DragOverEvent,
} from "@dnd-kit/core";

import { Droppable, Draggable, DraggableOverlay } from "..";
import dynamic from "next/dynamic";
import { useStore } from "../../store/store";
import { shallow } from "zustand/shallow";
import TextToSpeech from "./TextToSpeech";

const DraggableOverlaytWithNoSSR = dynamic(
  () => Promise.resolve(DraggableOverlay),
  {
    ssr: false,
  }
);
type DraggableComponentProps = {
  containers: string[]; // Annotate the type of 'containers' as an array of strings
  draggableItems: any[]; // Adjust the type according to your data structure
  sentence: string;
  word: string;
  bundle: string;
};

const DraggableComponent: React.FC<DraggableComponentProps> = ({
  containers,
  draggableItems,
  sentence,
  word,
  bundle,
}) => {
  const colors = ["bg-success", "bg-orange-100"];
  const [isDragging, setIsDragging] = useState(false);
  const [highlight, setHighlight] = useState<string>(colors[1]);
  const [state, setState] = useState<string>("unsolved");

  const draggableComponents = draggableItems.map((item) => (
    <DraggableItem
      key={item.id_outer}
      label={item.label}
      id_outer={item.id_outer}
    />
  ));

  const idOuterValues = draggableComponents.map(
    (component) => component.props.id_outer
  );
  const inputLength = idOuterValues.length;
  const parentStates = Array.from({ length: inputLength }, () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState<UniqueIdentifier | null>(null)
  );

  const parents = parentStates.map(([parent]) => parent);
  const parentSetters = parentStates.map(([_, setParent]) => setParent);
  const dropTargets = parents;
  const dropTargetsSet = parentSetters;

  useEffect(() => {
    setBoxHighlight();
  }, [parents, state, highlight]);

  interface DraggableProps {
    label?: string;
    id_outer: UniqueIdentifier;
  }
  function DraggableItem({ label, id_outer }: DraggableProps) {
    const { isDragging, setNodeRef, listeners } = useDraggable({
      id: id_outer,
    });
    return (
      <Draggable
        dragging={isDragging}
        ref={setNodeRef}
        listeners={listeners}
        label={label}
        handle={false}
        style={{
          opacity: isDragging ? 0 : undefined,
        }}
      />
    );
  }
  function handleDragEnd(event: DragOverEvent) {
    const { over, active } = event;

    for (let i = 0; i < idOuterValues.length; i++) {
      if (active.id === idOuterValues[i]) {
        let newValue = null;
        for (let j = 0; j < idOuterValues.length; j++) {
          if (!dropTargets.includes(idOuterValues[j])) {
            newValue = idOuterValues[j];
            break; // exit inner loop once a non-duplicate value is found
          }
        }
        dropTargetsSet[i](
          over && active.id === idOuterValues[i] ? over.id : newValue
        );
        break; // exit outer loop once parent is assigned
      }
    }
  }

  function droppableSet(id: string, dragging: boolean) {
    const idOuterValues = draggableComponents.map(
      (component) => component.props.id_outer
    );

    return (
      <Droppable key={id} id={id} dragging={dragging}>
        {draggableComponents.map((component, index) => {
          if (
            dropTargets[index] === id &&
            component.props.id_outer === idOuterValues[index]
          ) {
            return component;
          } else {
            return null;
          }
        })}
        {dropTargets.includes(id) ? null : (
          <span className="text-sm">drop zone</span>
        )}
      </Droppable>
    );
  }

  const puzzle = useStore((store) =>
    store.wordPuzzles.find((puzzle) => puzzle.word == word)
  );

  const addPuzzle = useStore((store) => store.addPuzzle, shallow);

  useEffect(() => {
    if (puzzle == null) {
      addPuzzle({ word: word, state: "unsolved", bundle: bundle });
    }
  }, [word, puzzle]);

  useEffect(() => {
    if (puzzle != null && puzzle.state == "solved") {
      solve();
    }
  }, [word, puzzle]);

  const updatePuzzleState = useStore(
    (store) => store.updatePuzzleState,
    shallow
  );

  useEffect(() => {
    updatePuzzleState({ word: word, state: state, bundle: bundle });
  }, [state]);

  function setBoxHighlight() {
    // Filtering the object and retrieving property2 based on property1 conditions
    const filteredVariables = parents
      .map((parents) => {
        const matchingVariable = Object.entries(draggableItems).find(
          ([key, value]) => value.id_outer === parents
        );
        return matchingVariable ? matchingVariable[1].label : null;
      })
      .filter((label) => label !== null);
    const solvedOrdered = draggableItems.map((item) => {
      return item.label;
    });
    if (
      filteredVariables.toString() === solvedOrdered.toString() ||
      state === "solved"
    ) {
      setHighlight(colors[0]);
      setState("solved");
    } else {
      setHighlight(colors[1]);
      setState("unsolved");
    }
  }
  // Shuffle function
  function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Shuffled indices
  const shuffledIndices = useMemo(
    () => shuffleArray([...Array(draggableComponents.length).keys()]),
    []
  );

  function solve() {
    for (let i = 0; i < idOuterValues.length; i++) {
      dropTargetsSet[i](idOuterValues[i]);
    }
    setState("solved");
  }
  function unsolve() {
    for (let i = 0; i < idOuterValues.length; i++) {
      dropTargetsSet[i](null);
    }
    setState("unsolved");
  }

  return (
    <DndContext
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col m-3">
        <div>
          <p className="mx-2 text-center font-black text-xl">{word}</p>
          <p className="mx-2 font-bold">{sentence}</p>
          <TextToSpeech text={sentence} />
        </div>
        <div className="divider divider-vertical "></div>

        <p className="mx-2 font-bold text-center">
          Drag to complete the translation:
        </p>
        <div className={`${highlight}`} style={{ backgroundColor: highlight }}>
          <div className="flex justify-around flex-wrap m-3">
            {shuffledIndices.map((index) => {
              const component = draggableComponents[index];
              if (
                dropTargets[index] === null &&
                component.props.id_outer === idOuterValues[index]
              ) {
                return component;
              } else {
                return null;
              }
            })}
          </div>
        </div>

        <div className="flex justify-center flex-wrap m-3 ">
          {containers.map((container, index) => (
            <div key={index}>{droppableSet(container, isDragging)}</div>
          ))}
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => solve()}
            className="btn btn-success btn-outline m-1"
          >
            Solve
          </button>
          <button
            onClick={() => unsolve()}
            className="btn btn-info btn-outline m-1"
          >
            Reset
          </button>
        </div>
      </div>
      <DraggableOverlaytWithNoSSR />
    </DndContext>
  );
};

export default DraggableComponent;
