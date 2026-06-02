"use client";

import { useEffect, useState } from "react";

interface AnswerFeedbackProps {
  outcome: "correct" | "incorrect";
  correctMessages: string[];
  wrongMessages: string[];
  acceptedAnswers?: string[];
}

const CORRECT_COLOR = "#DCEFC8";
const WRONG_COLOR = "#FFD8D0";
const CORRECT_TEXT = "#1B1716";
const WRONG_TEXT = "#1B1716";

export default function AnswerFeedback({ outcome, correctMessages, wrongMessages, acceptedAnswers }: AnswerFeedbackProps) {
  const [showFlash, setShowFlash] = useState(true);
  const isCorrect = outcome === "correct";
  const bg = isCorrect ? CORRECT_COLOR : WRONG_COLOR;
  const fg = isCorrect ? CORRECT_TEXT : WRONG_TEXT;

  const messages = isCorrect ? correctMessages : wrongMessages;
  const [message] = useState(() => messages[Math.floor(Math.random() * messages.length)] ?? "");

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
        className="w-full overflow-hidden border-b-2 border-ink px-6 py-4 shadow-hard-sm"
        style={{
          backgroundColor: bg,
          animation: "slide-down 0.18s ease-out forwards",
        }}
      >
        <p className="font-fredoka text-2xl font-[700]" style={{ color: fg }}>
          {message}
        </p>
        {!isCorrect && acceptedAnswers && acceptedAnswers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {acceptedAnswers.map((ans, i) => (
              <span
                key={i}
                className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-manrope text-sm font-[700] shadow-hard-sm"
                style={{ color: fg }}
              >
                {ans}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
