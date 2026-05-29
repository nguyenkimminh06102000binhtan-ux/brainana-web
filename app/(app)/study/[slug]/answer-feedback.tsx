"use client";

import { useEffect, useRef, useState } from "react";

interface AnswerFeedbackProps {
  outcome: "correct" | "incorrect";
  correctMessages: string[];
  wrongMessages: string[];
}

const CORRECT_COLOR = "#9EFF00";
const WRONG_COLOR = "#FF0054";
const CORRECT_TEXT = "#FF0054";
const WRONG_TEXT = "#9EFF00";

export default function AnswerFeedback({ outcome, correctMessages, wrongMessages }: AnswerFeedbackProps) {
  const [showFlash, setShowFlash] = useState(true);
  const isCorrect = outcome === "correct";
  const bg = isCorrect ? CORRECT_COLOR : WRONG_COLOR;
  const fg = isCorrect ? CORRECT_TEXT : WRONG_TEXT;

  const messages = isCorrect ? correctMessages : wrongMessages;
  // Pick once at mount and keep stable
  const message = useRef(messages[Math.floor(Math.random() * messages.length)] ?? "").current;

  useEffect(() => {
    const t = setTimeout(() => setShowFlash(false), 550);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Fullscreen flash */}
      {showFlash && (
        <div
          className="pointer-events-none fixed inset-0 z-50"
          style={{
            backgroundColor: bg,
            animation: "flash-fade 0.55s ease-out forwards",
          }}
        />
      )}

      {/* Feedback bar — inline, sits right below the progress bar */}
      <div
        className="w-full overflow-hidden px-6 py-4"
        style={{
          backgroundColor: bg,
          animation: "slide-down 0.18s ease-out forwards",
        }}
      >
        <p className="font-fredoka text-2xl font-[700]" style={{ color: fg }}>
          {message}
        </p>
      </div>
    </>
  );
}
