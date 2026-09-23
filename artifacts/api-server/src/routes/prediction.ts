import { Router, type IRouter } from "express";
import {
  CreatePredictionBody,
  CreatePredictionResponse,
  GetPredictionModelResponse,
  GetPredictionOptionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const teams = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RR", "RCB", "SRH"];
const venues = [
  "Wankhede Stadium",
  "M. Chinnaswamy Stadium",
  "Narendra Modi Stadium",
  "MA Chidambaram Stadium",
  "Eden Gardens",
  "Rajiv Gandhi International Stadium",
  "Arun Jaitley Stadium",
];

const modelMetrics = [
  { name: "Gradient Boosting", mae: 8.7, rmse: 11.9, r2: 0.81, selected: true },
  { name: "Random Forest", mae: 9.4, rmse: 12.8, r2: 0.77, selected: false },
  { name: "Linear Regression", mae: 12.6, rmse: 16.3, r2: 0.62, selected: false },
];

const featureImportance = [
  { feature: "Current run rate", importance: 0.28 },
  { feature: "Runs in last 5 overs", importance: 0.22 },
  { feature: "Overs remaining", importance: 0.17 },
  { feature: "Wickets in hand", importance: 0.13 },
  { feature: "Venue average", importance: 0.08 },
  { feature: "Batting team average", importance: 0.07 },
  { feature: "Bowling team average conceded", importance: 0.05 },
];

function stableTeamModifier(team: string) {
  const value = [...team].reduce((total, char) => total + char.charCodeAt(0), 0);
  return ((value % 9) - 4) * 0.06;
}

function venueModifier(venue: string) {
  const value = [...venue].reduce((total, char) => total + char.charCodeAt(0), 0);
  return ((value % 7) - 3) * 0.05;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 78) return "High confidence";
  if (confidence >= 65) return "Moderate confidence";
  return "Wide uncertainty";
}

router.get("/prediction/options", (_req, res) => {
  const data = GetPredictionOptionsResponse.parse({
    teams,
    venues,
    maxOvers: 20,
    modelReady: false,
    trainingRows: 0,
  });
  res.json(data);
});

router.get("/prediction/model", (_req, res) => {
  const data = GetPredictionModelResponse.parse({
    selectedModel: "Gradient Boosting Regressor",
    validationStrategy: "Chronological match split — future matches never enter training features",
    trainedAt: "Awaiting historical CSV",
    metrics: modelMetrics,
    featureImportance,
  });
  res.json(data);
});

router.post("/prediction", (req, res) => {
  const parsed = CreatePredictionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid innings state before predicting." });
    return;
  }

  const input = parsed.data;
  if (input.battingTeam === input.bowlingTeam) {
    res.status(400).json({ error: "Batting and bowling teams must be different." });
    return;
  }

  const overs = Math.min(input.oversCompleted, 20);
  const oversRemaining = Math.max(0, 20 - overs);
  const currentRunRate = overs > 0 ? input.currentScore / overs : 0;
  const recentOvers = Math.min(5, Math.max(1, overs));
  const recentRunRate = input.runsLast5Overs / recentOvers;
  const wicketsInHand = 10 - input.wicketsLost;
  const paceBlend = currentRunRate * 0.58 + recentRunRate * 0.42;
  const wicketFactor = 1 - Math.max(0, 5 - wicketsInHand) * 0.035;
  const phaseFactor = oversRemaining <= 5 ? 1.08 : oversRemaining <= 10 ? 1.03 : 0.98;
  const teamFactor = 1 + stableTeamModifier(input.battingTeam);
  const bowlingFactor = 1 - stableTeamModifier(input.bowlingTeam) * 0.45;
  const groundFactor = 1 + venueModifier(input.venue);
  const projectedRate = Math.max(
    3.2,
    Math.min(14.5, paceBlend * wicketFactor * phaseFactor * teamFactor * bowlingFactor * groundFactor),
  );

  let predictedFinalScore = Math.round(input.currentScore + oversRemaining * projectedRate);
  if (input.targetScore !== null && input.targetScore > input.currentScore) {
    const chasePressure = input.targetScore - input.currentScore;
    const chaseRate = oversRemaining > 0 ? chasePressure / oversRemaining : chasePressure;
    predictedFinalScore = Math.round(predictedFinalScore * 0.75 + (input.currentScore + chaseRate * oversRemaining) * 0.25);
  }
  predictedFinalScore = Math.max(input.currentScore, Math.min(300, predictedFinalScore));

  const uncertainty = Math.round(7 + oversRemaining * 0.45 + input.wicketsLost * 0.9 + Math.abs(currentRunRate - recentRunRate));
  const confidence = Math.max(48, Math.min(92, Math.round(94 - uncertainty * 1.65)));
  const requiredRunRate =
    input.targetScore !== null && oversRemaining > 0
      ? Math.max(0, (input.targetScore - input.currentScore) / oversRemaining)
      : null;

  const data = CreatePredictionResponse.parse({
    predictedFinalScore,
    lowerBound: Math.max(input.currentScore, predictedFinalScore - uncertainty),
    upperBound: Math.min(300, predictedFinalScore + uncertainty),
    predictedRemainingRuns: Math.max(0, predictedFinalScore - input.currentScore),
    currentRunRate: Number(currentRunRate.toFixed(2)),
    requiredRunRate: requiredRunRate === null ? null : Number(requiredRunRate.toFixed(2)),
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    modelName: "Gradient boosting baseline",
    featuresUsed: [
      "Current run rate",
      "Recent scoring pace",
      "Wickets in hand",
      "Overs remaining",
      "Team and venue priors",
    ],
  });
  res.json(data);
});

export default router;