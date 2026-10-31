"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

let interval: any;

type Card = {
  id: number;
  name: string;
  designation: React.ReactNode;
  content: React.ReactNode;
};

export const CardStack = ({
  items,
  offset,
  scaleFactor,
  size = "h-60 w-60 md:h-60 md:w-96",
  visible = 3,
}: {
  items: Card[];
  offset?: number;
  scaleFactor?: number;
  /** Tailwind size classes for the stack and each card (BrandPulse addition). */
  size?: string;
  /** How many cards show in the stack; the rest wait behind (BrandPulse addition). */
  visible?: number;
}) => {
  const CARD_OFFSET = offset || 10;
  const SCALE_FACTOR = scaleFactor || 0.06;
  const [cards, setCards] = useState<Card[]>(items);

  useEffect(() => {
    startFlipping();

    return () => clearInterval(interval);
  }, []);
  const startFlipping = () => {
    interval = setInterval(() => {
      setCards((prevCards: Card[]) => {
        const newArray = [...prevCards]; // create a copy of the array
        newArray.unshift(newArray.pop()!); // move the last element to the front
        return newArray;
      });
    }, 5000);
  };

  return (
    <div className={`relative ${size}`}>
      {cards.map((card, index) => {
        return (
          <motion.div
            key={card.id}
            className={`absolute bg-white ${size} rounded-3xl p-4 shadow-xl border border-neutral-200  shadow-black/[0.1] flex flex-col justify-between`}
            style={{
              transformOrigin: "top center",
            }}
            animate={{
              top: Math.min(index, visible - 1) * -CARD_OFFSET,
              scale: 1 - index * SCALE_FACTOR, // decrease scale for cards that are behind
              zIndex: cards.length - index, //  decrease z-index for the cards that are behind
              opacity: index < visible ? 1 : 0,
            }}
          >
            <div className="font-normal text-neutral-700">
              {card.content}
            </div>
            <div>
              <p className="text-neutral-500 font-medium">
                {card.name}
              </p>
              <p className="text-neutral-400 font-normal">
                {card.designation}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
