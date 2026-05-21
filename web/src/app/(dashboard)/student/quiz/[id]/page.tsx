'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Quiz, QuizQuestion } from '@/types';
import { getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = 'info' | 'taking' | 'result';

export default function QuizAttemptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('info');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const startedAt = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get(`/quizzes/${id}`)
      .then((r) => setQuiz(r.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function startQuiz() {
    setPhase('taking');
    setAnswers({});
    startedAt.current = new Date().toISOString();

    if (quiz?.time_limit_mins) {
      setTimeLeft(quiz.time_limit_mins * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  async function handleSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      }));
      const { data } = await api.post(`/quizzes/${id}/submit`, {
        answers: answersArray,
        startedAt: startedAt.current,
      });
      setResult(data.data);
      setPhase('result');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <><Header title="Quiz" /><LoadingSpinner /></>;
  if (!quiz) return <Header title="Quiz not found" />;

  /* ── Info screen ──────────────────────────────── */
  if (phase === 'info') {
    const { attemptsUsed = 0, maxAttempts = 3, canAttempt = true } = quiz.attemptInfo || {};
    return (
      <>
        <Header title={quiz.title} />
        <div className="p-8 max-w-xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
            {quiz.description && <p className="text-gray-500 text-sm mb-6">{quiz.description}</p>}

            <div className="grid grid-cols-3 gap-3 mb-8 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-900">{quiz.questions?.length ?? '?'}</p>
                <p className="text-xs text-gray-400 mt-1">Questions</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-900">{quiz.time_limit_mins ?? '∞'}</p>
                <p className="text-xs text-gray-400 mt-1">Minutes</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-900">{maxAttempts - attemptsUsed}</p>
                <p className="text-xs text-gray-400 mt-1">Attempts left</p>
              </div>
            </div>

            {canAttempt ? (
              <Button onClick={startQuiz} size="lg" className="w-full">Start Quiz</Button>
            ) : (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                Maximum attempts ({maxAttempts}) reached.
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ── Taking quiz ──────────────────────────────── */
  if (phase === 'taking') {
    const questions = quiz.questions || [];
    const answered = Object.keys(answers).length;
    return (
      <>
        <Header
          title={quiz.title}
          subtitle={`${answered}/${questions.length} answered`}
        />
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {/* Timer + progress */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
            <div className="flex-1 bg-gray-100 rounded-full h-2 mr-4">
              <div className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ width: `${(answered / questions.length) * 100}%` }} />
            </div>
            {timeLeft !== null && (
              <div className={cn('flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1 rounded-lg',
                timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-700')}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {/* Questions */}
          {questions.map((q: QuizQuestion, qi: number) => (
            <div key={q.id} className={cn('bg-white rounded-xl border shadow-sm p-6',
              answers[q.id] ? 'border-primary-200' : 'border-gray-100')}>
              <div className="flex items-start gap-3 mb-4">
                <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">{qi + 1}</span>
                <p className="text-gray-900 font-medium leading-relaxed">{q.question_text}</p>
                <span className="ml-auto text-xs text-gray-400 shrink-0">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              </div>

              <div className="space-y-2 ml-10">
                {q.options.map((opt) => (
                  <label key={opt.id}
                    className={cn('flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                      answers[q.id] === opt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    )}>
                    <input type="radio" name={q.id} value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                      className="text-primary-600 w-4 h-4" />
                    <span className="font-medium text-gray-500 text-sm w-5">{opt.label}.</span>
                    <span className="text-sm text-gray-700">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="sticky bottom-4 bg-white/80 backdrop-blur rounded-xl border border-gray-100 shadow-lg p-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">{questions.length - answered} question{questions.length - answered !== 1 ? 's' : ''} unanswered</p>
            <Button onClick={handleSubmit} loading={submitting} size="lg">Submit Quiz</Button>
          </div>
        </div>
      </>
    );
  }

  /* ── Result ──────────────────────────────────── */
  if (phase === 'result' && result) {
    return (
      <>
        <Header title="Quiz Result" />
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {/* Score card */}
          <div className={cn('rounded-2xl p-8 text-center text-white', result.isPassed ? 'bg-green-500' : 'bg-red-500')}>
            <div className="text-6xl font-bold mb-2">{result.percentage}%</div>
            <div className="text-lg font-semibold">{result.isPassed ? '🎉 Passed!' : '😔 Not Passed'}</div>
            <div className="text-sm opacity-90 mt-1">{result.score} / {result.maxScore} marks</div>
          </div>

          {/* Answer review */}
          <div className="space-y-4">
            {result.questions?.map((q: QuizQuestion, qi: number) => {
              const ans = result.answers?.find((a: any) => a.questionId === q.id);
              return (
                <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-3 mb-3">
                    {ans?.isCorrect
                      ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                    <p className="text-gray-900 font-medium text-sm leading-relaxed">{q.question_text}</p>
                  </div>

                  <div className="ml-8 space-y-1.5">
                    {q.options.map((opt) => {
                      const isSelected = ans?.selectedOptionId === opt.id;
                      const isCorrect = opt.isCorrect;
                      return (
                        <div key={opt.id} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                          isCorrect ? 'bg-green-50 text-green-700 font-medium'
                            : isSelected ? 'bg-red-50 text-red-700' : 'text-gray-600')}>
                          <span className="font-mono text-xs w-4">{opt.label}.</span>
                          <span>{opt.text}</span>
                          {isCorrect && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                          {isSelected && !isCorrect && <XCircle className="w-3.5 h-3.5 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 ml-8 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs">
                      <span className="font-semibold">Explanation: </span>{q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button onClick={() => router.back()} variant="outline" className="w-full">← Back to Course</Button>
        </div>
      </>
    );
  }

  return null;
}
