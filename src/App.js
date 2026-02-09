import { useEffect, useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import StarRating from "./StarRating";

const average = (arr) =>
  arr.reduce((acc, cur, i, arr) => acc + cur / arr.length, 0);

const totalRunTime = (arr) =>
  arr.reduce((acc, cur) => {
    const num = typeof cur === "number" && !isNaN(cur) ? cur : 0;
    return acc + num;
  }, 0);

const API_KEY = "8fe69795";

export default function App() {
  const [movies, setMovies] = useState([]);
  const [watched, setWatched] = useState(() => {
    const watchedList = JSON.parse(localStorage.getItem("watched"));
    return watchedList;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const debouncedQuery = useDebounce(query.trim(), 500);

  function handleSelectedMovie(id) {
    setSelectedId((selectedId) => (id === selectedId ? null : id));
  }

  function handleCloseSelectedMovie() {
    setSelectedId(null);
  }

  function handleAddWatched(movie) {
    setWatched((watched) => [...watched, movie]);
  }

  function handleDeleteWatched(movie) {
    setWatched((watched) =>
      watched.filter((mov) => mov.imdbId !== movie.imdbId),
    );
  }

  useEffect(() => {
    localStorage.setItem("watched", JSON.stringify(watched));
  }, [watched]);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchMovies() {
      try {
        setError("");
        setIsLoading(true);

        const res = await fetch(
          `http://www.omdbapi.com/?apikey=${API_KEY}&s=${debouncedQuery}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error("Something went wrong with fetching movies");
        }

        const data = await res.json();

        if (data.Response === "False") {
          throw new Error("Movie not found!");
        }
        handleCloseSelectedMovie();
        setMovies(data.Search);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err?.message || "Movie not found!");
      } finally {
        setIsLoading(false);
      }
    }

    if (query.length < 3) {
      setMovies([]);
      setError("");
      return;
    }

    fetchMovies();
    return () => controller.abort();
  }, [debouncedQuery, query.length]);

  return (
    <>
      <NavBar>
        <Logo />
        <Search query={query} setQuery={setQuery} />
        <NumResults movies={movies} />
      </NavBar>
      <Main>
        <Box>
          {isLoading && <Loader />}
          {!isLoading && !error && (
            <MovieList movies={movies} onSelectedMovie={handleSelectedMovie} />
          )}
          {error && <Error message={error} />}
        </Box>
        <Box>
          {selectedId ? (
            <SelectedMovie
              selectedId={selectedId}
              onCloseMovie={handleCloseSelectedMovie}
              onAddWatched={handleAddWatched}
              onDeleteWatched={handleDeleteWatched}
              watched={watched}
            />
          ) : (
            <>
              <WatchedSummary watched={watched} />
              <WatchedList
                watched={watched}
                onDeleteWatched={handleDeleteWatched}
              />
            </>
          )}
        </Box>
      </Main>
    </>
  );
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

function NavBar({ children }) {
  return <nav className="nav-bar">{children}</nav>;
}

function Search({ query, setQuery }) {
  const inputEl = useRef(null);

  useEffect(() => inputEl.current.focus());

  return (
    <input
      className="search"
      type="text"
      placeholder="Search movies..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      ref={inputEl}
    />
  );
}

function Logo() {
  return (
    <div className="logo">
      <span role="img">🍿</span>
      <h1>usePopcorn</h1>
    </div>
  );
}

function NumResults({ movies }) {
  return (
    <p className="num-results">
      Found <strong>{movies.length}</strong> results
    </p>
  );
}

function Main({ children }) {
  return <main className="main">{children}</main>;
}

function Box({ children }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="box">
      <button className="btn-toggle" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? "–" : "+"}
      </button>
      {isOpen && children}
    </div>
  );
}

function MovieList({ movies, onSelectedMovie }) {
  return (
    <ul className="list list-movies">
      {movies?.map((movie) => (
        <Movie
          movie={movie}
          key={movie.imdbID}
          onSelectedMovie={onSelectedMovie}
        />
      ))}
    </ul>
  );
}

function Movie({ movie, onSelectedMovie }) {
  const imagePlaceHolder = "https://placehold.net/400x600.png";
  return (
    <li onClick={() => onSelectedMovie(movie.imdbID)}>
      <img
        src={movie.Poster ? movie.Poster : imagePlaceHolder}
        alt={`${movie.Title} poster`}
        onError={(e) => {
          e.target.src = imagePlaceHolder;
        }}
      />
      <h3>{movie.Title}</h3>
      <div>
        <p>
          <span>🗓️</span>
          <span>{movie.Year}</span>
        </p>
      </div>
    </li>
  );
}

function SelectedMovie({
  selectedId,
  onCloseMovie,
  onAddWatched,
  watched,
  onDeleteWatched,
}) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [userRating, setUserRating] = useState(0);
  const isWatched = watched.map((m) => m.imdbId).includes(selectedId);

  const {
    Title: title,
    Year: year,
    Poster: poster,
    Runtime: runtime,
    imdbRating,
    Plot: plot,
    Released: released,
    Actors: actors,
    Director: director,
    Genre: genre,
  } = movie;

  useEffect(
    function () {
      async function getMovieDetails() {
        try {
          setIsLoading(true);
          const res = await fetch(
            `http://www.omdbapi.com/?apikey=${API_KEY}&i=${selectedId}`,
          );
          const data = await res.json();
          setMovie(data);
          setIsLoading(false);
        } catch (err) {
          setError(err?.message || "Movie not found!");
        }
      }
      getMovieDetails();
    },
    [selectedId],
  );

  useEffect(() => {
    const watchedMovie = watched.find((m) => m.imdbId === selectedId);
    setUserRating(watchedMovie ? watchedMovie.userRating : 0);
  }, [selectedId, watched]);

  useEffect(() => {
    if (!title) return;
    document.title = `Movie | ${title}`;

    return () => (document.title = "usePopcorn");
  }, [title]);

  useEffect(() => {
    const closeSelectedMovie = (e) => {
      if (e.code === "Escape") {
        onCloseMovie();
      }
    };
    document.addEventListener("keydown", closeSelectedMovie);

    return () => document.removeEventListener("keydown", closeSelectedMovie);
  }, [onCloseMovie]);

  function handleAdd() {
    if (isWatched) return;
    const newWatchedMovie = {
      imdbId: selectedId,
      title,
      year,
      poster,
      imdbRating: Number(imdbRating),
      runtime: Number(runtime.split(" ").at(0)),
      userRating,
    };

    onAddWatched(newWatchedMovie);
    onCloseMovie();
  }

  return (
    <>
      {isLoading && <Loader />}
      {!isLoading && !error && (
        <div className="details">
          <header>
            <button className="btn-back" onClick={onCloseMovie}>
              <FaArrowLeft />
            </button>
            <img src={poster} alt={`Poster of ${title}`} />
            <div className="details-overview">
              <h2>{title}</h2>
              <p>
                {released} &bull; {runtime}
              </p>
              <p>{genre}</p>
              <p>
                <span>⭐</span>
                {imdbRating} IMDB Rating
              </p>
            </div>
          </header>
          <section>
            <div className="rating">
              <StarRating
                size={27}
                maxRating={10}
                onSetRating={setUserRating}
                rating={userRating}
              />
              {userRating > 0 && (
                <button
                  className={isWatched ? "btn-added" : "btn-add"}
                  onClick={() =>
                    isWatched
                      ? onDeleteWatched({ imdbId: selectedId })
                      : handleAdd()
                  }
                >
                  {isWatched ? "⛔ Remove from the list" : "+ Add to list"}
                </button>
              )}
            </div>
            <p>
              <em>{plot}</em>
            </p>
            <p>Starring {actors}</p>
            <p>Directed by {director}</p>
          </section>
        </div>
      )}
      ;{error && <Error message={error} />}
    </>
  );
}

function WatchedSummary({ watched }) {
  const avgImdbRating = average(watched.map((movie) => movie.imdbRating));
  const avgUserRating = average(watched.map((movie) => movie.userRating));
  const totalRuntime = totalRunTime(watched.map((movie) => movie.runtime));

  function convertDecimal(value) {
    return Number.isInteger(value) ? value : Number(value.toFixed(2));
  }

  function runtimePostfix(time) {
    if (time < 60) return time;
    const newTime = time / 60;
    return `${newTime.toFixed(2)} ${newTime > 2 ? "hr" : "hrs"}`;
  }

  return (
    <div className="summary">
      <h2>Movies you watched</h2>
      <div>
        <p>
          <span>#️⃣</span>
          <span>{watched.length} movies</span>
        </p>
        <p>
          <span>⭐️</span>
          <span>{convertDecimal(avgImdbRating)}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{convertDecimal(avgUserRating)}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{runtimePostfix(totalRuntime)}</span>
        </p>
      </div>
    </div>
  );
}

function WatchedList({ watched, onDeleteWatched }) {
  return (
    <ul className="list">
      {watched.map((movie) => (
        <WatchedMovie
          movie={movie}
          key={movie.imdbId}
          onDeleteWatched={() => onDeleteWatched(movie)}
        />
      ))}
    </ul>
  );
}

function WatchedMovie({ movie, onDeleteWatched }) {
  return (
    <li>
      <img src={movie.poster} alt={`${movie.title} poster`} />
      <h3>{movie.title}</h3>
      <div>
        <p>
          <span>⭐️</span>
          <span>{movie.imdbRating}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{movie.userRating}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{movie.runtime || 0} min</span>
        </p>
      </div>
      <button className="btn-delete" onClick={() => onDeleteWatched(movie)}>
        x
      </button>
    </li>
  );
}

function Loader() {
  return <p className="loader">Loading, please wait...</p>;
}

function Error({ message }) {
  return <p className="error">{message}</p>;
}
