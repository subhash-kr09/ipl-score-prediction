# IPL Live Score Prediction System

This folder contains the reusable Python ML pipeline described in the project brief. The main project dashboard uses the same input contract, while this package makes the training and Streamlit workflow easy to run locally.

## 1. Prepare the dataset

Place a historical IPL ball-by-ball CSV at:

```text
data/ipl_ball_by_ball.csv
```

The loader accepts the common delivery format with columns such as `id`, `date`, `venue`, `batting_team`, `bowling_team`, `over`, `ball`, `total_runs`, and `player_dismissed`. It also accepts `match_id` in place of `id`.

## 2. Install dependencies

```bash
cd ipl-score-prediction
python -m pip install -r requirements.txt
```

## 3. Train the models

```bash
python src/train_model.py --dataset data/ipl_ball_by_ball.csv
```

The trainer compares Linear Regression, Random Forest, and Gradient Boosting. XGBoost is listed in `requirements.txt` for extension, but the default pipeline stays dependency-light and explainable. It writes:

- `models/best_model.pkl`
- `models/metrics.json`

The split is chronological by complete match. No deliveries from the same match can appear in both training and evaluation. Historical team, venue, and matchup averages are updated only after an innings is complete.

## 4. Run the Streamlit app

```bash
streamlit run app.py
```

If the dataset or model artifact is missing, the app shows a clearly labeled heuristic baseline. It does not claim that an ML model has been trained.

## Feature engineering

Each training row represents the state immediately after a delivery. Features include current score, wickets, balls remaining, current/recent run rates, recent wickets, phase scoring rates, and historical priors. The final innings score is the target.

## Live prediction mode

The live dashboard accepts the match state after each over. Sending a new state updates the final-score estimate, range, current run rate, required run rate for a chase, and confidence. The React dashboard keeps the over snapshots in the browser so the progression chart is immediate; the Python app exposes the same prediction function for scripts and notebooks.
