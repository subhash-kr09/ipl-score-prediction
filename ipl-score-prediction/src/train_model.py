"""Train and compare score regressors using a chronological match split."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from data_preprocessing import load_dataset, split_by_match_chronology
from feature_engineering import FEATURE_COLUMNS, build_training_frame


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"


def _make_preprocessor(categorical: list[str], numeric: list[str]) -> ColumnTransformer:
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    return ColumnTransformer(
        [
            ("categorical", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("encoder", encoder)]), categorical),
            ("numeric", SimpleImputer(strategy="median"), numeric),
        ],
        remainder="drop",
    )


def train(dataset_path: str | Path, model_dir: str | Path = MODEL_DIR) -> dict[str, object]:
    """Train all supported regressors and persist the best pipeline."""
    raw = load_dataset(dataset_path)
    train_deliveries, test_deliveries = split_by_match_chronology(raw)
    train_frame = build_training_frame(train_deliveries)
    test_frame = build_training_frame(test_deliveries)
    if train_frame.empty or test_frame.empty:
        raise ValueError("Chronological split needs at least two groups of matches.")

    categorical = ["batting_team", "bowling_team", "venue"]
    numeric = [column for column in FEATURE_COLUMNS if column not in categorical]
    X_train, y_train = train_frame[FEATURE_COLUMNS], train_frame["final_score"]
    X_test, y_test = test_frame[FEATURE_COLUMNS], test_frame["final_score"]

    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=250, random_state=42, n_jobs=-1, min_samples_leaf=2),
        "Gradient Boosting": GradientBoostingRegressor(random_state=42, n_estimators=180, max_depth=3, learning_rate=0.04),
    }
    results: list[dict[str, object]] = []
    fitted: dict[str, Pipeline] = {}
    for name, estimator in candidates.items():
        pipeline = Pipeline([("features", _make_preprocessor(categorical, numeric)), ("model", estimator)])
        pipeline.fit(X_train, y_train)
        predicted = pipeline.predict(X_test)
        results.append(
            {
                "name": name,
                "mae": round(float(mean_absolute_error(y_test, predicted)), 3),
                "rmse": round(float(mean_squared_error(y_test, predicted) ** 0.5), 3),
                "r2": round(float(r2_score(y_test, predicted)), 3),
                "selected": False,
            }
        )
        fitted[name] = pipeline

    best = min(results, key=lambda item: float(item["mae"]))
    best["selected"] = True
    model_path = Path(model_dir)
    model_path.mkdir(parents=True, exist_ok=True)
    joblib.dump(fitted[str(best["name"])], model_path / "best_model.pkl")
    (model_path / "metrics.json").write_text(json.dumps({"metrics": results, "selected_model": best["name"]}, indent=2))
    return {"metrics": results, "selected_model": best["name"], "training_rows": len(train_frame)}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train IPL score models.")
    parser.add_argument("--dataset", default=str(ROOT / "data" / "ipl_ball_by_ball.csv"))
    args = parser.parse_args()
    print(json.dumps(train(args.dataset), indent=2))