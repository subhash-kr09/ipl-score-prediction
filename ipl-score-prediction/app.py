"""Streamlit interface for the IPL live score predictor.

Run with:
    streamlit run app.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from predict import predict  # noqa: E402


st.set_page_config(page_title="IPL Score Predictor", page_icon="🏏", layout="wide")
st.title("IPL Live Score Predictor")
st.caption("A leakage-safe innings forecast from the current match state.")

with st.sidebar:
    st.header("Live innings state")
    batting_team = st.selectbox("Batting team", ["CSK", "MI", "RCB", "KKR", "SRH", "GT", "RR", "DC", "PBKS", "LSG"])
    bowling_team = st.selectbox("Bowling team", ["MI", "CSK", "KKR", "RCB", "SRH", "GT", "RR", "DC", "PBKS", "LSG"])
    venue = st.selectbox("Venue", ["Wankhede Stadium", "M. Chinnaswamy Stadium", "Eden Gardens", "Narendra Modi Stadium"])
    current_score = st.number_input("Current score", min_value=0, max_value=300, value=92)
    overs_completed = st.number_input("Overs completed", min_value=0.0, max_value=20.0, value=12.0, step=0.1)
    wickets_lost = st.number_input("Wickets lost", min_value=0, max_value=10, value=3)
    runs_last_5 = st.number_input("Runs in last 5 overs", min_value=0, max_value=100, value=48)
    wickets_last_5 = st.number_input("Wickets in last 5 overs", min_value=0, max_value=5, value=1)
    target = st.number_input("Target score (optional)", min_value=0, max_value=300, value=0)

state = {
    "batting_team": batting_team,
    "bowling_team": bowling_team,
    "venue": venue,
    "current_score": current_score,
    "overs_completed": overs_completed,
    "wickets_lost": wickets_lost,
    "runs_last_5_overs": runs_last_5,
    "wickets_last_5_overs": wickets_last_5,
    "target_score": target or None,
}

if batting_team == bowling_team:
    st.error("Choose different batting and bowling teams.")
else:
    result = predict(state)
    columns = st.columns(4)
    columns[0].metric("Projected final", result["predicted_final_score"])
    columns[1].metric("Expected range", f'{result["lower_bound"]}–{result["upper_bound"]}')
    columns[2].metric("Current run rate", result["current_run_rate"])
    columns[3].metric("Confidence", f'{result["confidence"]}%')

    st.subheader("Forecast path")
    overs = list(range(int(overs_completed), 21))
    rate = max(3.2, result["current_run_rate"])
    projection = [current_score + (over - overs_completed) * rate for over in overs]
    chart = pd.DataFrame({"Over": overs, "Projected score": projection}).set_index("Over")
    st.line_chart(chart)
    st.info(f'Model source: {result["model_name"]}. Add data/ipl_ball_by_ball.csv and run the training command for a trained artifact.')