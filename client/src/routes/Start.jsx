import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { apiUrl } from "../lib/api";

const PHASES = [
  "collecting",
  "voting1",
  "results1",
  "voting2",
  "results2",
  "voting3",
  "results3",
  "voting4",
  "results4",
  "finish",
];

export default function Start() {
  const { quizzId: routeQuizzId, phase: routePhase } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("loading");
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [quizzId, setQuizzId] = useState(routeQuizzId || "");
  const [phase, setPhase] = useState(
    PHASES.includes(routePhase) ? routePhase : "collecting"
  );
  const [results, setResults] = useState([]);
  const [finalResults, setFinalResults] = useState({
    explorer: [],
    introspector: [],
    comparer: [],
    recommender: [],
  });
  const normalizedPhase = useMemo(
    () => (PHASES.includes(routePhase) ? routePhase : "collecting"),
    [routePhase]
  );
  const [voteSummary, setVoteSummary] = useState({
    participantsCount: 0,
    votesCount: 0,
  });
  const [participantSummary, setParticipantSummary] = useState({
    participantsCount: 0,
    submittedCount: 0,
  });

  const apiFetch = (path, options) => fetch(apiUrl(path), options);
  useEffect(() => {
    if (!routeQuizzId) {
      return;
    }

    setQuizzId(routeQuizzId);
    setPhase(normalizedPhase);
    setLink(`${window.location.origin}/go/${routeQuizzId}`);
    setStatus("ready");
  }, [routeQuizzId, normalizedPhase]);

  useEffect(() => {
    let active = true;

    async function createQuizz() {
      try {
        const response = await apiFetch("/api/quizz", { method: "POST" });
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const data = await response.json();
        const url = `${window.location.origin}/go/${data.quizzId}`;
        if (active) {
          setLink(url);
          setQuizzId(data.quizzId);
          setStatus("ready");
          navigate(`/start/${data.quizzId}/collecting`, { replace: true });
        }
      } catch (error) {
        if (active) {
          setLink(error.message);
          setStatus("error");
        }
      }
    }

    if (!routeQuizzId) {
      createQuizz();
    }

    return () => {
      active = false;
    };
  }, [navigate, routeQuizzId]);

  useEffect(() => {
    if (!quizzId || !["results1", "results2", "results3", "results4"].includes(phase)) {
      return;
    }

    let active = true;

    async function loadResults() {
      const endpoint =
        phase === "results1"
          ? `/api/quizz/${quizzId}/explorer/results`
          : phase === "results2"
            ? `/api/quizz/${quizzId}/introspector/results`
            : phase === "results3"
              ? `/api/quizz/${quizzId}/comparer/results`
              : `/api/quizz/${quizzId}/recommender/results`;

      try {
        const resultsResponse = await apiFetch(endpoint);
        if (!resultsResponse.ok) {
          throw new Error(`Request failed with ${resultsResponse.status}`);
        }
        const data = await resultsResponse.json();
        if (active) {
          setResults(data.results || []);
        }
      } catch (error) {
        if (active) {
          setLink(error.message);
          setStatus("error");
        }
      }
    }

    loadResults();

    return () => {
      active = false;
    };
  }, [phase, quizzId]);

  useEffect(() => {
    if (!quizzId || phase !== "finish") {
      return;
    }

    let active = true;

    async function loadFinalResults() {
      try {
        const endpoints = [
          `/api/quizz/${quizzId}/explorer/results`,
          `/api/quizz/${quizzId}/introspector/results`,
          `/api/quizz/${quizzId}/comparer/results`,
          `/api/quizz/${quizzId}/recommender/results`,
        ];
        const responses = await Promise.all(
          endpoints.map((endpoint) => apiFetch(endpoint))
        );
        for (const response of responses) {
          if (!response.ok) {
            throw new Error(`Request failed with ${response.status}`);
          }
        }
        const [explorer, introspector, comparer, recommender] = await Promise.all(
          responses.map((response) => response.json())
        );
        if (active) {
          setFinalResults({
            explorer: explorer.results || [],
            introspector: introspector.results || [],
            comparer: comparer.results || [],
            recommender: recommender.results || [],
          });
        }
      } catch (error) {
        if (active) {
          setLink(error.message);
          setStatus("error");
        }
      }
    }

    loadFinalResults();

    return () => {
      active = false;
    };
  }, [phase, quizzId]);

  useEffect(() => {
    if (!quizzId || !["voting1", "voting2", "voting3", "voting4"].includes(phase)) {
      return;
    }

    let active = true;

    async function loadSummary() {
      const endpoint =
        phase === "voting1"
          ? `/api/quizz/${quizzId}/votes/explorer/summary`
          : phase === "voting2"
            ? `/api/quizz/${quizzId}/votes/introspector/summary`
            : phase === "voting3"
              ? `/api/quizz/${quizzId}/votes/comparer/summary`
              : `/api/quizz/${quizzId}/votes/recommender/summary`;

      try {
        const response = await apiFetch(endpoint);
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const data = await response.json();
        if (active) {
          setVoteSummary({
            participantsCount: data.participantsCount ?? 0,
            votesCount: data.votesCount ?? 0,
          });
        }
      } catch (error) {
        if (active) {
          setLink(error.message);
          setStatus("error");
        }
      }
    }

    loadSummary();
    const interval = setInterval(loadSummary, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [phase, quizzId]);

  useEffect(() => {
    if (!quizzId || phase !== "collecting") {
      return;
    }

    let active = true;

    async function loadParticipantSummary() {
      try {
        const response = await apiFetch(
          `/api/quizz/${quizzId}/participants/summary`
        );
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const data = await response.json();
        if (active) {
          setParticipantSummary({
            participantsCount: data.participantsCount ?? 0,
            submittedCount: data.submittedCount ?? 0,
          });
        }
      } catch (error) {
        if (active) {
          setLink(error.message);
          setStatus("error");
        }
      }
    }

    loadParticipantSummary();
    const interval = setInterval(loadParticipantSummary, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [phase, quizzId]);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (phase === "voting1" || phase === "voting2" || phase === "voting3" || phase === "voting4") {
      setSecondsLeft(120);
    }
  }, [phase]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  const setPhaseAndNavigate = (nextPhase) => {
    setPhase(nextPhase);
    if (quizzId) {
      navigate(`/start/${quizzId}/${nextPhase}`);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          {phase === "results1"
            ? "Explorer results"
            : phase === "results2"
              ? "Introspector results"
              : phase === "results3"
                ? "Comparer results"
                : phase === "results4"
                  ? "Recommender results"
                  : phase === "finish"
                    ? "Final results"
                  : phase === "collecting"
                    ? "Scan to join the quiz"
                    : "Voting in progress"}
        </h2>
        {!["results1", "results2", "results3", "results4", "finish"].includes(phase) && (
          <p className="countdown">
            {minutes}:{seconds}
          </p>
        )}
      </div>
      {status === "loading" && <p>Creating quiz...</p>}
      {status === "ready" && (
        <>
          {phase === "collecting" && (
            <div className="qr">
              <QRCodeCanvas value={link} size={220} includeMargin />
              <a className="qr-link" href={link}>
                {link}
              </a>
              <p className="helper">
                {participantSummary.submittedCount} submissions
              </p>
            </div>
          )}
          {phase === "voting1" && (
            <div className="qr">
              <p className="helper">Waiting for voting...</p>
              <p className="helper">
                {voteSummary.votesCount} / {voteSummary.participantsCount} votes
              </p>
            </div>
          )}
          {phase === "results1" && (
            <div className="results">
              <ul>
                {results.map((item) => (
                  <li key={item.id} className="result-item">
                    <span className="result-count">{item.count}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="helper">No votes yet.</li>
                )}
              </ul>
            </div>
          )}
          {phase === "voting2" && (
            <div className="qr">
              <p className="helper">Waiting for voting...</p>
              <p className="helper">
                {voteSummary.votesCount} / {voteSummary.participantsCount} votes
              </p>
            </div>
          )}
          {phase === "results2" && (
            <div className="results">
              <ul>
                {results.map((item) => (
                  <li key={item.id} className="result-item">
                    <span className="result-count">{item.count}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="helper">No votes yet.</li>
                )}
              </ul>
            </div>
          )}
          {phase === "voting3" && (
            <div className="qr">
              <p className="helper">Waiting for voting...</p>
              <p className="helper">
                {voteSummary.votesCount} / {voteSummary.participantsCount} votes
              </p>
            </div>
          )}
          {phase === "results3" && (
            <div className="results">
              <ul>
                {results.map((item) => (
                  <li key={item.id} className="result-item">
                    <span className="result-count">{item.count}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="helper">No votes yet.</li>
                )}
              </ul>
            </div>
          )}
          {phase === "voting4" && (
            <div className="qr">
              <p className="helper">Waiting for voting...</p>
              <p className="helper">
                {voteSummary.votesCount} / {voteSummary.participantsCount} votes
              </p>
            </div>
          )}
          {phase === "results4" && (
            <div className="results">
              <ul>
                {results.map((item) => (
                  <li key={item.id} className="result-item">
                    <span className="result-count">{item.count}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="helper">No votes yet.</li>
                )}
              </ul>
            </div>
          )}
          {phase === "finish" && (
            <div className="results results--grid">
              <div className="results-column">
                <h3>Explorer</h3>
                <ul>
                  {finalResults.explorer.map((item) => (
                    <li key={item.id} className="result-item">
                      <span className="result-count">{item.count}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {finalResults.explorer.length === 0 && (
                    <li className="helper">No Explorer votes yet.</li>
                  )}
                </ul>
              </div>
              <div className="results-column">
                <h3>Introspector</h3>
                <ul>
                  {finalResults.introspector.map((item) => (
                    <li key={item.id} className="result-item">
                      <span className="result-count">{item.count}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {finalResults.introspector.length === 0 && (
                    <li className="helper">No Introspector votes yet.</li>
                  )}
                </ul>
              </div>
              <div className="results-column">
                <h3>Comparer</h3>
                <ul>
                  {finalResults.comparer.map((item) => (
                    <li key={item.id} className="result-item">
                      <span className="result-count">{item.count}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {finalResults.comparer.length === 0 && (
                    <li className="helper">No Comparer votes yet.</li>
                  )}
                </ul>
              </div>
              <div className="results-column">
                <h3>Recommender</h3>
                <ul>
                  {finalResults.recommender.map((item) => (
                    <li key={item.id} className="result-item">
                      <span className="result-count">{item.count}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {finalResults.recommender.length === 0 && (
                    <li className="helper">No Recommender votes yet.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
      {status === "error" && (
        <p className="message message--error">{link}</p>
      )}
      {phase === "collecting" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "voting1" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("voting1");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          Let's vote
        </button>
      )}
      {phase === "voting1" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "results1" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("results1");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          View Explorer Results
        </button>
      )}
      {phase === "results1" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "voting2" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("voting2");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          Vote Instrospector
        </button>
      )}
      {phase === "voting2" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "results2" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("results2");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          View Introspector Results
        </button>
      )}
      {phase === "results2" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "voting3" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("voting3");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          Vote Comparer
        </button>
      )}
      {phase === "voting3" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "results3" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("results3");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          View Comparer Results
        </button>
      )}
      {phase === "results3" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "voting4" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("voting4");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          Vote Recommender
        </button>
      )}
      {phase === "voting4" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "results4" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("results4");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          View Recommender Results
        </button>
      )}
      {phase === "results4" && (
        <button
          className="results-button"
          type="button"
          disabled={!quizzId}
          onClick={async () => {
            try {
              const response = await apiFetch(`/api/quizz/${quizzId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "finish" }),
              });
              if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
              }
              setPhaseAndNavigate("finish");
            } catch (error) {
              setLink(error.message);
              setStatus("error");
            }
          }}
        >
          Finish
        </button>
      )}
    </section>
  );
}
