import React, { useState, useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function QuizOverlay() {
  const quizData   = useGameStore((s) => s.quizData);
  const quizResult = useGameStore((s) => s.quizResult);
  const quizPenalty = useGameStore((s) => s.quizPenalty);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  // Countdown timer
  useEffect(() => {
    if (!quizData) return;
    setSelected(null);
    setTimeLeft(Math.ceil(quizData.duration / 1000));
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [quizData]);

  if (!quizData) return null;

  function answer(idx) {
    if (selected !== null) return;
    setSelected(idx);
    socket.emit('quiz_answer', { answer: idx });
  }

  const showResult = quizResult !== null;
  const correct = showResult && quizResult.correct;

  return (
    <div className="quiz-overlay">
      <div className="quiz-box">
        <div className="quiz-header">
          <span className="quiz-bomb-icon">🧩</span>
          <span className="quiz-title">QUIZ BOMB!</span>
          <span className={`quiz-timer${timeLeft <= 5 ? ' urgent' : ''}`}>{timeLeft}s</span>
        </div>

        <div className="quiz-question">{quizData.question}</div>

        <div className="quiz-options">
          {quizData.options.map((opt, i) => {
            let cls = 'quiz-option';
            if (selected === i) cls += ' selected';
            if (showResult && i === quizResult.correctIndex) cls += ' correct';
            if (showResult && selected === i && !correct) cls += ' wrong';
            return (
              <button
                key={i}
                className={cls}
                onClick={() => answer(i)}
                disabled={selected !== null}
              >
                <span className="quiz-option-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className={`quiz-feedback ${correct ? 'correct' : 'wrong'}`}>
            {correct ? '✅ Correct!' : `❌ Wrong! -${15}s penalty`}
          </div>
        )}

        {quizPenalty && (
          <div className="quiz-penalty-banner">
            ⏱️ {quizPenalty.wrongCount} wrong answer{quizPenalty.wrongCount > 1 ? 's' : ''} = -{quizPenalty.totalPenalty}s!
          </div>
        )}
      </div>
    </div>
  );
}
