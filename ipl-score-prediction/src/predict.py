"""Reusable prediction helpers for the Streamlit application."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from feature_engineering import FEATURE_COLUMNS


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "best_model.pkl"


def heuristic_prediction(state: dict[str, object]) -> dict[str, object]:
    """Useful demo fallback while a real historical CSV is being prepared."""
    score = float(state["current_score"])
    overs = max(float(state["overs_completed"]), 0.1)
    remaining = max(0.0, 20.0 - overs)
    current_rate = score / overs
    recent_rate = float(state["runs_last_5_overs"]) / min(5.0, overs)
    wickets = float(state["wickets_lost"])
    pace = max(3.2, (current_rate * 0.58 + recent_rate * 0.42) * (1 - max(0, wickets - 5) * 0.035))
    final_score = round(score + remaining * pace)
    uncertainty = round(7 + remaining * 0.45 + wickets * 0.9)
    return {
        "predicted_final_score": final_score,
        "lower_bound": max(int(score), final_score - uncertainty),
        "upper_bound": final_score + uncertainty,
        "current_run_rate": round(current_rate, 2),
        "confidence": max(48, min(92, round(94 - uncertainty * 1.65))),
    }


def predict(state: dict[str, object], model_path: str | Path = MODEL_PATH) -> dict[str, object]:
    path = Path(model_path)
    if not path.exists():
        return heuristic_prediction(state) | {"model_name": "Heuristic baseline"}

    score = float(state["current_score"])
    overs = max(float(state["overs_completed"]), 0.1)
    balls = min(120, max(1, round(overs * 6)))
    current_rate = score / overs
    recent_runs = float(state["runs_last_5_overs"])
    recent_wickets = float(state["wickets_last_5_overs"])
    live_features = {
        "batting_team": state["batting_team"],
        "bowling_team": state["bowling_team"],
        "venue": state["venue"],
        "current_score": score,
        "wickets_lost": float(state["wickets_lost"]),
        "overs_completed": overs,
        "balls_remaining": max(0, 120 - balls),
        "current_run_rate": current_rate,
        "average_run_rate": current_rate,
        "runs_last_1_over": recent_runs / 5,
        "runs_last_3_overs": recent_runs * 3 / 5,
        "runs_last_5_overs": recent_runs,
        "wickets_last_5_overs": recent_wickets,
        "batting_team_historical_average": 160.0,
        "bowling_team_historical_average_conceded": 160.0,
        "venue_historical_average": 165.0,
        "team_matchup_historical_average": 160.0,
        "powerplay_rate": current_rate,
        "middle_over_rate": current_rate,
        "death_over_rate": current_rate,
    }
    frame = pd.DataFrame([{column: live_features[column] for column in FEATURE_COLUMNS}])
    model = joblib.load(path)
    final_score = max(int(state["current_score"]), round(float(model.predict(frame)[0])))
    return {
        "predicted_final_score": final_score,
        "lower_bound": max(int(state["current_score"]), final_score - 10),
        "upper_bound": final_score + 10,
        "current_run_rate": round(float(state["current_score"]) / max(float(state["overs_completed"]), 0.1), 2),
        "confidence": 76,
        "model_name": "Trained score regressor",
    }