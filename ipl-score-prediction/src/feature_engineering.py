"""Leakage-safe match snapshot features.

Each training row represents what was known immediately after a delivery.
The target is the completed innings score, while historical priors are built
from earlier matches only.
"""

from __future__ import annotations

import pandas as pd


FEATURE_COLUMNS = [
    "batting_team",
    "bowling_team",
    "venue",
    "current_score",
    "wickets_lost",
    "overs_completed",
    "balls_remaining",
    "current_run_rate",
    "average_run_rate",
    "runs_last_1_over",
    "runs_last_3_overs",
    "runs_last_5_overs",
    "wickets_last_5_overs",
    "batting_team_historical_average",
    "bowling_team_historical_average_conceded",
    "venue_historical_average",
    "team_matchup_historical_average",
    "powerplay_rate",
    "middle_over_rate",
    "death_over_rate",
]


def _safe_rate(runs: float, balls: float) -> float:
    return float(runs / balls * 6) if balls else 0.0


def build_training_frame(deliveries: pd.DataFrame) -> pd.DataFrame:
    """Build snapshots using only delivery history available at each row."""
    rows: list[dict[str, object]] = []
    prior_team_scores: dict[str, list[float]] = {}
    prior_bowling_conceded: dict[str, list[float]] = {}
    prior_venue_scores: dict[str, list[float]] = {}
    prior_matchup_scores: dict[tuple[str, str], list[float]] = {}

    innings_groups = deliveries.groupby(["match_id", "batting_team"], sort=False)
    for (match_id, batting_team), innings in innings_groups:
        innings = innings.sort_values(["over", "ball"]).copy()
        final_score = int(innings["total_runs"].sum())
        bowling_team = str(innings["bowling_team"].iloc[0])
        venue = str(innings["venue"].iloc[0])
        historical_team = prior_team_scores.get(str(batting_team), [])
        historical_bowling = prior_bowling_conceded.get(bowling_team, [])
        historical_venue = prior_venue_scores.get(venue, [])
        historical_matchup = prior_matchup_scores.get((str(batting_team), bowling_team), [])

        innings["cum_score"] = innings["total_runs"].cumsum()
        innings["cum_wickets"] = innings["is_wicket"].cumsum()
        innings["ball_number"] = range(1, len(innings) + 1)

        for _, delivery in innings.iterrows():
            ball_number = int(delivery["ball_number"])
            current_score = int(delivery["cum_score"])
            overs_completed = ball_number / 6
            current_over = int(delivery["over"])
            recent = innings[innings["ball_number"] <= ball_number]
            recent_1 = recent[recent["over"] >= current_over]
            recent_3 = recent[recent["over"] >= current_over - 2]
            recent_5 = recent[recent["over"] >= current_over - 4]
            powerplay = recent[recent["over"] < 6]
            middle = recent[(recent["over"] >= 6) & (recent["over"] < 15)]
            death = recent[recent["over"] >= 15]

            rows.append(
                {
                    "match_id": match_id,
                    "batting_team": batting_team,
                    "bowling_team": bowling_team,
                    "venue": venue,
                    "current_score": current_score,
                    "wickets_lost": int(delivery["cum_wickets"]),
                    "overs_completed": round(overs_completed, 3),
                    "balls_remaining": max(0, 120 - ball_number),
                    "current_run_rate": _safe_rate(current_score, ball_number),
                    "average_run_rate": _safe_rate(current_score, ball_number),
                    "runs_last_1_over": int(recent_1["total_runs"].sum()),
                    "runs_last_3_overs": int(recent_3["total_runs"].sum()),
                    "runs_last_5_overs": int(recent_5["total_runs"].sum()),
                    "wickets_last_5_overs": int(recent_5["is_wicket"].sum()),
                    "batting_team_historical_average": sum(historical_team) / len(historical_team)
                    if historical_team
                    else 160.0,
                    "bowling_team_historical_average_conceded": sum(historical_bowling) / len(historical_bowling)
                    if historical_bowling
                    else 160.0,
                    "venue_historical_average": sum(historical_venue) / len(historical_venue)
                    if historical_venue
                    else 165.0,
                    "team_matchup_historical_average": sum(historical_matchup) / len(historical_matchup)
                    if historical_matchup
                    else 160.0,
                    "powerplay_rate": _safe_rate(powerplay["total_runs"].sum(), len(powerplay)),
                    "middle_over_rate": _safe_rate(middle["total_runs"].sum(), len(middle)),
                    "death_over_rate": _safe_rate(death["total_runs"].sum(), len(death)),
                    "final_score": final_score,
                }
            )

        prior_team_scores.setdefault(str(batting_team), []).append(final_score)
        prior_bowling_conceded.setdefault(bowling_team, []).append(final_score)
        prior_venue_scores.setdefault(venue, []).append(final_score)
        prior_matchup_scores.setdefault((str(batting_team), bowling_team), []).append(final_score)

    return pd.DataFrame(rows)