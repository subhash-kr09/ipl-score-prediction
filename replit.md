# IPL Score Predictor

An explainable live IPL innings dashboard that predicts the expected final score from the current match state.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/ipl-score-predictor run dev` — run the live prediction dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `python ipl-score-prediction/src/train_model.py --dataset ipl-score-prediction/data/ipl_ball_by_ball.csv` — train the Python models
- `streamlit run ipl-score-prediction/app.py` — run the standalone Streamlit interface

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- UI: React + Vite + Tailwind + TanStack Query
- ML: Python, pandas, scikit-learn, joblib, optional XGBoost
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ipl-score-predictor/` — responsive dashboard and model diagnostics route
- `artifacts/api-server/src/routes/prediction.ts` — prediction options, forecast, and model diagnostics API
- `lib/api-spec/openapi.yaml` — source of truth for typed prediction contracts
- `ipl-score-prediction/` — reusable Python preprocessing, feature engineering, training, prediction, and Streamlit app

## Architecture decisions

- The dashboard uses generated OpenAPI hooks so UI requests and server validation share one contract.
- Predictions use a clearly labeled baseline until a historical ball-by-ball CSV is supplied and trained.
- Training snapshots are built after each delivery and split by complete match chronology to avoid future-match leakage.
- The UI keeps live over progression local to the current match; no database is required for the first version.

## Product

- Live prediction workspace with team, venue, score, over, wickets, recent-form, and chase-target inputs.
- Forecasted final score, expected range, remaining runs, current/required run rates, and confidence.
- Model diagnostics page with MAE, RMSE, R², feature importance, and leakage-prevention explanation.
- Standalone Python pipeline for training and Streamlit use with missing-dataset fallback messaging.

## User preferences

No additional preferences recorded.

## Gotchas

- The API currently returns a deterministic baseline and `trainingRows: 0` until the user provides `ipl-score-prediction/data/ipl_ball_by_ball.csv`.
- Run API codegen after changing `lib/api-spec/openapi.yaml` before updating consumers.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
