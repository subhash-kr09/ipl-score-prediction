"""Dataset loading and normalization for IPL ball-by-ball data.

The project accepts the common Kaggle IPL delivery format as well as the
slightly different column names used by several public cricket datasets.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


COLUMN_ALIASES = {
    "match_id": ["match_id", "id"],
    "season": ["season", "year"],
    "date": ["date", "match_date"],
    "venue": ["venue", "stadium"],
    "batting_team": ["batting_team", "battingTeam"],
    "bowling_team": ["bowling_team", "bowlingTeam"],
    "over": ["over", "overs"],
    "ball": ["ball", "delivery"],
    "total_runs": ["total_runs", "total_run", "runs_total"],
    "extras": ["extras", "extra_runs"],
    "player_dismissed": ["player_dismissed", "dismissed_player"],
    "is_wicket": ["is_wicket", "wicket"],
}


def _first_present(frame: pd.DataFrame, names: list[str]) -> str | None:
    return next((name for name in names if name in frame.columns), None)


def normalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Rename known aliases and create safe defaults for optional fields."""
    renamed: dict[str, str] = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        source = _first_present(frame, aliases)
        if source:
            renamed[source] = canonical

    normalized = frame.rename(columns=renamed).copy()
    required = ["match_id", "batting_team", "bowling_team", "over", "total_runs"]
    missing = [column for column in required if column not in normalized.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")

    defaults: dict[str, object] = {
        "season": "Unknown",
        "date": pd.NaT,
        "venue": "Unknown venue",
        "ball": 0,
        "extras": 0,
        "player_dismissed": "",
        "is_wicket": 0,
    }
    for column, default in defaults.items():
        if column not in normalized.columns:
            normalized[column] = default

    normalized["date"] = pd.to_datetime(normalized["date"], errors="coerce")
    normalized["over"] = pd.to_numeric(normalized["over"], errors="coerce").fillna(0).astype(int)
    normalized["ball"] = pd.to_numeric(normalized["ball"], errors="coerce").fillna(0).astype(int)
    normalized["total_runs"] = pd.to_numeric(normalized["total_runs"], errors="coerce").fillna(0).astype(int)
    normalized["extras"] = pd.to_numeric(normalized["extras"], errors="coerce").fillna(0).astype(int)
    normalized["is_wicket"] = (
        normalized["is_wicket"].astype(str).str.lower().isin(["1", "true", "yes", "wicket"]).astype(int)
    )
    normalized["is_wicket"] = normalized["is_wicket"] | normalized["player_dismissed"].fillna("").ne("").astype(int)

    return normalized.sort_values(["date", "match_id", "over", "ball"], na_position="last").reset_index(drop=True)


def load_dataset(path: str | Path) -> pd.DataFrame:
    """Load, normalize, and validate a CSV delivery dataset."""
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")
    return normalize_columns(pd.read_csv(csv_path))


def split_by_match_chronology(
    frame: pd.DataFrame, test_fraction: float = 0.2
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split complete matches chronologically so one match never straddles sets."""
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction must be between 0 and 1")

    match_dates = (
        frame.groupby("match_id", as_index=False)["date"]
        .min()
        .sort_values(["date", "match_id"], na_position="last")
    )
    split_index = max(1, int(len(match_dates) * (1 - test_fraction)))
    train_matches = set(match_dates.iloc[:split_index]["match_id"])
    train = frame[frame["match_id"].isin(train_matches)].copy()
    test = frame[~frame["match_id"].isin(train_matches)].copy()
    return train, test