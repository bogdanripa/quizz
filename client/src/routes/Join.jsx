import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from "../lib/api";

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `p-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

const PLACEHOLDERS = {
  explorer:
    "Shows how AI explores a market, including which brands, companies, and solutions it mentions.",
  introspector:
    "Explains how AI understands your brand, including positioning, strengths, and weaknesses.",
  comparer:
    "Shows how AI compares your brand with competitors and highlights key differences.",
  recommender:
    "Explains when, why, and in what situations AI recommends your brand.",
};

export default function Join() {
  const { quizzId } = useParams();
  const storageKey = useMemo(
    () => `quizz-participant-${quizzId}`,
    [quizzId]
  );
  const stateKey = useMemo(() => `quizz-state-${quizzId}`, [quizzId]);
  const [participantId, setParticipantId] = useState("");
  const [answers, setAnswers] = useState({
    explorer: "",
    introspector: "",
    comparer: "",
    recommender: "",
  });
  const [stage, setStage] = useState("step1");
  const [statusMessage, setStatusMessage] = useState("");
  const [explorerAnswers, setExplorerAnswers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [introspectorAnswers, setIntrospectorAnswers] = useState([]);
  const [selectedIntrospector, setSelectedIntrospector] = useState(new Set());
  const [voteSubmitted2, setVoteSubmitted2] = useState(false);
  const [comparerAnswers, setComparerAnswers] = useState([]);
  const [selectedComparer, setSelectedComparer] = useState(new Set());
  const [voteSubmitted3, setVoteSubmitted3] = useState(false);
  const [recommenderAnswers, setRecommenderAnswers] = useState([]);
  const [selectedRecommender, setSelectedRecommender] = useState(new Set());
  const [voteSubmitted4, setVoteSubmitted4] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  const hasSubmittedAnswers =
    answers.explorer.trim() ||
    answers.introspector.trim() ||
    answers.comparer.trim() ||
    answers.recommender.trim();

  const apiFetch = (path, options) => fetch(apiUrl(path), options);

  const resolveStageForStatus = (statusValue) => {
    if (statusValue === "collecting") {
      return hasSubmittedAnswers ? "waiting" : "step1";
    }
    if (statusValue === "results1") return "results1";
    if (statusValue === "voting1") {
      return voteSubmitted ? "waiting-results" : "vote1";
    }
    if (statusValue === "results2") return "results2";
    if (statusValue === "voting2") {
      return voteSubmitted2 ? "waiting-results2" : "vote2";
    }
    if (statusValue === "results3") return "results3";
    if (statusValue === "voting3") {
      return voteSubmitted3 ? "waiting-results3" : "vote3";
    }
    if (statusValue === "results4") return "results4";
    if (statusValue === "voting4") {
      return voteSubmitted4 ? "waiting-results4" : "vote4";
    }
    if (statusValue === "finish") return "finished";
    return "step1";
  };

  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      setParticipantId(existing);
      return;
    }

    const created = generateId();
    localStorage.setItem(storageKey, created);
    setParticipantId(created);
  }, [storageKey]);

  useEffect(() => {
    const stored = localStorage.getItem(stateKey);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (parsed.answers) {
        setAnswers(parsed.answers);
      }
      if (parsed.stage) {
        setStage(parsed.stage);
      }
      if (parsed.selected) {
        setSelected(new Set(parsed.selected));
      }
      if (parsed.voteSubmitted) {
        setVoteSubmitted(parsed.voteSubmitted);
      }
      if (parsed.selectedIntrospector) {
        setSelectedIntrospector(new Set(parsed.selectedIntrospector));
      }
      if (parsed.voteSubmitted2) {
        setVoteSubmitted2(parsed.voteSubmitted2);
      }
      if (parsed.selectedComparer) {
        setSelectedComparer(new Set(parsed.selectedComparer));
      }
      if (parsed.voteSubmitted3) {
        setVoteSubmitted3(parsed.voteSubmitted3);
      }
      if (parsed.selectedRecommender) {
        setSelectedRecommender(new Set(parsed.selectedRecommender));
      }
      if (parsed.voteSubmitted4) {
        setVoteSubmitted4(parsed.voteSubmitted4);
      }
    } catch (error) {
      localStorage.removeItem(stateKey);
    }
  }, [stateKey]);

  useEffect(() => {
    localStorage.setItem(
      stateKey,
      JSON.stringify({
        answers,
        stage,
        selected: Array.from(selected),
        voteSubmitted,
        selectedIntrospector: Array.from(selectedIntrospector),
        voteSubmitted2,
        selectedComparer: Array.from(selectedComparer),
        voteSubmitted3,
        selectedRecommender: Array.from(selectedRecommender),
        voteSubmitted4,
      })
    );
  }, [
    answers,
    stage,
    selected,
    voteSubmitted,
    selectedIntrospector,
    voteSubmitted2,
    selectedComparer,
    voteSubmitted3,
    selectedRecommender,
    voteSubmitted4,
    stateKey,
  ]);

  useEffect(() => {
    let active = true;

    async function syncStageWithStatus() {
      try {
        const response = await apiFetch(`/api/quizz/${quizzId}/status`);
        if (!response.ok) {
          throw new Error(`Status check failed (${response.status})`);
        }
        const data = await response.json();
        if (!active) {
          return;
        }
        setStage(resolveStageForStatus(data.status));
        setIsSyncing(false);
      } catch (error) {
        if (active) {
          setStatusMessage(error.message);
          setIsSyncing(false);
        }
      }
    }

    if (quizzId) {
      syncStageWithStatus();
    }

    return () => {
      active = false;
    };
  }, [
    quizzId,
    answers,
    voteSubmitted,
    voteSubmitted2,
    voteSubmitted3,
    voteSubmitted4,
  ]);

  useEffect(() => {
    if (
      ![
        "waiting",
        "waiting-results",
        "vote1",
        "results1",
        "vote2",
        "waiting-results2",
        "results2",
        "vote3",
        "waiting-results3",
        "results3",
        "vote4",
        "waiting-results4",
        "results4",
        "finished",
      ].includes(stage)
    ) {
      return;
    }

    let active = true;
    const interval = setInterval(async () => {
      try {
        const response = await apiFetch(`/api/quizz/${quizzId}/status`);
        if (!response.ok) {
          throw new Error(`Status check failed (${response.status})`);
        }
        const data = await response.json();
        if (!active) {
          return;
        }

        setStage(resolveStageForStatus(data.status));
      } catch (error) {
        if (active) {
          setStatusMessage(error.message);
        }
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    stage,
    quizzId,
    answers,
    voteSubmitted,
    voteSubmitted2,
    voteSubmitted3,
    voteSubmitted4,
  ]);

  useEffect(() => {
    if (stage !== "vote1") {
      return;
    }

    let active = true;

    async function loadExplorer() {
      try {
        const response = await apiFetch(`/api/quizz/${quizzId}/explorer`);
        if (!response.ok) {
          throw new Error(`Load failed (${response.status})`);
        }
        const data = await response.json();
        const shuffled = [...(data.explorer || [])].sort(
          () => Math.random() - 0.5
        );
        if (active) {
          setExplorerAnswers(shuffled);
        }
      } catch (error) {
        if (active) {
          setStatusMessage(error.message);
        }
      }
    }

    loadExplorer();

    return () => {
      active = false;
    };
  }, [stage, quizzId]);

  useEffect(() => {
    if (stage !== "vote2") {
      return;
    }

    let active = true;

    async function loadIntrospector() {
      try {
        const response = await apiFetch(`/api/quizz/${quizzId}/introspector`);
        if (!response.ok) {
          throw new Error(`Load failed (${response.status})`);
        }
        const data = await response.json();
        const shuffled = [...(data.introspector || [])].sort(
          () => Math.random() - 0.5
        );
        if (active) {
          setIntrospectorAnswers(shuffled);
        }
      } catch (error) {
        if (active) {
          setStatusMessage(error.message);
        }
      }
    }

    loadIntrospector();

    return () => {
      active = false;
    };
  }, [stage, quizzId]);

  useEffect(() => {
    if (stage !== "vote3") {
      return;
    }

    let active = true;

    async function loadComparer() {
      try {
        const response = await apiFetch(`/api/quizz/${quizzId}/comparer`);
        if (!response.ok) {
          throw new Error(`Load failed (${response.status})`);
        }
        const data = await response.json();
        const shuffled = [...(data.comparer || [])].sort(
          () => Math.random() - 0.5
        );
        if (active) {
          setComparerAnswers(shuffled);
        }
      } catch (error) {
        if (active) {
          setStatusMessage(error.message);
        }
      }
    }

    loadComparer();

    return () => {
      active = false;
    };
  }, [stage, quizzId]);

  useEffect(() => {
    if (stage !== "vote4") {
      return;
    }

    let active = true;

    async function loadRecommender() {
      try {
        const response = await apiFetch(`/api/quizz/${quizzId}/recommender`);
        if (!response.ok) {
          throw new Error(`Load failed (${response.status})`);
        }
        const data = await response.json();
        const shuffled = [...(data.recommender || [])].sort(
          () => Math.random() - 0.5
        );
        if (active) {
          setRecommenderAnswers(shuffled);
        }
      } catch (error) {
        if (active) {
          setStatusMessage(error.message);
        }
      }
    }

    loadRecommender();

    return () => {
      active = false;
    };
  }, [stage, quizzId]);

  if (isSyncing) {
    return (
      <section className="card">
        <h2>Loading...</h2>
        <p>Syncing your session.</p>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage("");

    try {
      const response = await apiFetch(`/api/quizz/${quizzId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, answers }),
      });

      if (!response.ok) {
        throw new Error(`Submit failed (${response.status})`);
      }

      setStage("waiting");
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  if (stage === "waiting") {
    return (
      <section className="card">
        <h2>Waiting for others to answer</h2>
        <p>Please hold for the others to type in their answers.</p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
      </section>
    );
  }

  if (stage === "vote1") {
    return (
      <section className="card">
        <h2>Vote on Explorer scenarios</h2>
        <p className="helper">
          Select the Explorer scenarios you find most valuable.
        </p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
        <div className="vote-list">
          {explorerAnswers.map((answer) => {
            const isSelected = selected.has(answer.id);
            return (
              <button
                key={answer.id}
                className={`vote-item ${isSelected ? "is-selected" : ""}`}
                type="button"
                onClick={() => {
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(answer.id)) {
                      next.delete(answer.id);
                    } else {
                      next.add(answer.id);
                    }
                    return next;
                  });
                }}
              >
                {answer.text}
              </button>
            );
          })}
          {explorerAnswers.length === 0 && (
            <p className="helper">No Explorer responses yet.</p>
          )}
        </div>
        <button
          className="results-button"
          type="button"
          disabled={!participantId || voteSubmitted}
          onClick={async () => {
            setStatusMessage("");
            try {
              const response = await apiFetch(
                `/api/quizz/${quizzId}/votes/explorer`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    voterId: participantId,
                    selections: Array.from(selected),
                  }),
                }
              );
              if (!response.ok) {
                throw new Error(`Vote failed (${response.status})`);
              }
              setVoteSubmitted(true);
              setStage("waiting-results");
            } catch (error) {
              setStatusMessage(error.message);
            }
          }}
        >
          Cast your vote
        </button>
      </section>
    );
  }

  if (stage === "waiting-results") {
    return (
      <section className="card">
        <h2>Waiting for results</h2>
        <p>Please hold. The host will share results shortly.</p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
      </section>
    );
  }

  if (stage === "results1") {
    return (
      <section className="card">
        <h2>Brainstorming</h2>
        <p>We are brainstorming together in the room.</p>
      </section>
    );
  }

  if (stage === "vote2") {
    return (
      <section className="card">
        <h2>Vote on Introspector scenarios</h2>
        <p className="helper">
          Select the Introspector scenarios you find most valuable.
        </p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
        <div className="vote-list">
          {introspectorAnswers.map((answer) => {
            const isSelected = selectedIntrospector.has(answer.id);
            return (
              <button
                key={answer.id}
                className={`vote-item ${isSelected ? "is-selected" : ""}`}
                type="button"
                onClick={() => {
                  setSelectedIntrospector((current) => {
                    const next = new Set(current);
                    if (next.has(answer.id)) {
                      next.delete(answer.id);
                    } else {
                      next.add(answer.id);
                    }
                    return next;
                  });
                }}
              >
                {answer.text}
              </button>
            );
          })}
          {introspectorAnswers.length === 0 && (
            <p className="helper">No Introspector responses yet.</p>
          )}
        </div>
        <button
          className="results-button"
          type="button"
          disabled={!participantId || voteSubmitted2}
          onClick={async () => {
            setStatusMessage("");
            try {
              const response = await apiFetch(
                `/api/quizz/${quizzId}/votes/introspector`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    voterId: participantId,
                    selections: Array.from(selectedIntrospector),
                  }),
                }
              );
              if (!response.ok) {
                throw new Error(`Vote failed (${response.status})`);
              }
              setVoteSubmitted2(true);
              setStage("waiting-results2");
            } catch (error) {
              setStatusMessage(error.message);
            }
          }}
        >
          Cast your vote
        </button>
      </section>
    );
  }

  if (stage === "waiting-results2") {
    return (
      <section className="card">
        <h2>Waiting for results</h2>
        <p>Please hold. The host will share results shortly.</p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
      </section>
    );
  }

  if (stage === "results2") {
    return (
      <section className="card">
        <h2>Brainstorming</h2>
        <p>We are brainstorming together in the room.</p>
      </section>
    );
  }

  if (stage === "vote3") {
    return (
      <section className="card">
        <h2>Vote on Comparer scenarios</h2>
        <p className="helper">
          Select the Comparer scenarios you find most valuable.
        </p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
        <div className="vote-list">
          {comparerAnswers.map((answer) => {
            const isSelected = selectedComparer.has(answer.id);
            return (
              <button
                key={answer.id}
                className={`vote-item ${isSelected ? "is-selected" : ""}`}
                type="button"
                onClick={() => {
                  setSelectedComparer((current) => {
                    const next = new Set(current);
                    if (next.has(answer.id)) {
                      next.delete(answer.id);
                    } else {
                      next.add(answer.id);
                    }
                    return next;
                  });
                }}
              >
                {answer.text}
              </button>
            );
          })}
          {comparerAnswers.length === 0 && (
            <p className="helper">No Comparer responses yet.</p>
          )}
        </div>
        <button
          className="results-button"
          type="button"
          disabled={!participantId || voteSubmitted3}
          onClick={async () => {
            setStatusMessage("");
            try {
              const response = await apiFetch(
                `/api/quizz/${quizzId}/votes/comparer`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    voterId: participantId,
                    selections: Array.from(selectedComparer),
                  }),
                }
              );
              if (!response.ok) {
                throw new Error(`Vote failed (${response.status})`);
              }
              setVoteSubmitted3(true);
              setStage("waiting-results3");
            } catch (error) {
              setStatusMessage(error.message);
            }
          }}
        >
          Cast your vote
        </button>
      </section>
    );
  }

  if (stage === "waiting-results3") {
    return (
      <section className="card">
        <h2>Waiting for results</h2>
        <p>Please hold. The host will share results shortly.</p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
      </section>
    );
  }

  if (stage === "results3") {
    return (
      <section className="card">
        <h2>Brainstorming</h2>
        <p>We are brainstorming together in the room.</p>
      </section>
    );
  }

  if (stage === "vote4") {
    return (
      <section className="card">
        <h2>Vote on Recommender scenarios</h2>
        <p className="helper">
          Select the Recommender scenarios you find most valuable.
        </p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
        <div className="vote-list">
          {recommenderAnswers.map((answer) => {
            const isSelected = selectedRecommender.has(answer.id);
            return (
              <button
                key={answer.id}
                className={`vote-item ${isSelected ? "is-selected" : ""}`}
                type="button"
                onClick={() => {
                  setSelectedRecommender((current) => {
                    const next = new Set(current);
                    if (next.has(answer.id)) {
                      next.delete(answer.id);
                    } else {
                      next.add(answer.id);
                    }
                    return next;
                  });
                }}
              >
                {answer.text}
              </button>
            );
          })}
          {recommenderAnswers.length === 0 && (
            <p className="helper">No Recommender responses yet.</p>
          )}
        </div>
        <button
          className="results-button"
          type="button"
          disabled={!participantId || voteSubmitted4}
          onClick={async () => {
            setStatusMessage("");
            try {
              const response = await apiFetch(
                `/api/quizz/${quizzId}/votes/recommender`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    voterId: participantId,
                    selections: Array.from(selectedRecommender),
                  }),
                }
              );
              if (!response.ok) {
                throw new Error(`Vote failed (${response.status})`);
              }
              setVoteSubmitted4(true);
              setStage("waiting-results4");
            } catch (error) {
              setStatusMessage(error.message);
            }
          }}
        >
          Cast your vote
        </button>
      </section>
    );
  }

  if (stage === "waiting-results4") {
    return (
      <section className="card">
        <h2>Waiting for results</h2>
        <p>Please hold. The host will share results shortly.</p>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
      </section>
    );
  }

  if (stage === "results4") {
    return (
      <section className="card">
        <h2>Brainstorming</h2>
        <p>We are brainstorming together in the room.</p>
      </section>
    );
  }

  if (stage === "finished") {
    return (
      <section className="card">
        <h2>Thanks for voting!</h2>
        <p>The host is reviewing the final results.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>What's your idea of a perfect scenario?</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-title">Explorer</span>
          <span className="field-help">{PLACEHOLDERS.explorer}</span>
          <textarea
            rows={4}
            value={answers.explorer}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                explorer: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-title">Introspector</span>
          <span className="field-help">{PLACEHOLDERS.introspector}</span>
          <textarea
            rows={4}
            value={answers.introspector}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                introspector: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-title">Comparer</span>
          <span className="field-help">{PLACEHOLDERS.comparer}</span>
          <textarea
            rows={4}
            value={answers.comparer}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                comparer: event.target.value,
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-title">Recommender</span>
          <span className="field-help">{PLACEHOLDERS.recommender}</span>
          <textarea
            rows={4}
            value={answers.recommender}
            onChange={(event) =>
              setAnswers((current) => ({
                ...current,
                recommender: event.target.value,
              }))
            }
          />
        </label>
        {statusMessage && (
          <p className="message message--error">{statusMessage}</p>
        )}
        <button className="primary-button" type="submit">
          Next
        </button>
      </form>
    </section>
  );
}
