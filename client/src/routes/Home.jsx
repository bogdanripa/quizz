import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="card">
      <h2>Run a live scenario pulse in minutes</h2>
      <p className="helper">
        Collect Explorer, Introspector, Comparer, and Recommender scenarios,
        then guide your group through fast rounds of voting and instantly share
        ranked results.
      </p>
      <Link className="primary-button" to="/start">
        Lets start
      </Link>
    </section>
  );
}
