import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  LinearProgress,
  useTheme,
  Fade,
  Paper,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  LightbulbOutlined as HintIcon,
  SkipNext as SkipIcon,
  Replay as ReplayIcon,
  SportsEsports as GameIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";
import Header from "../../components/Header";

const WORDS = [
  { word: "dashboard", hint: "Main overview page" },
  { word: "calendar", hint: "Schedule and events" },
  { word: "deadline", hint: "Task due date" },
  { word: "project", hint: "A group of related tasks" },
  { word: "meeting", hint: "Team discussion" },
  { word: "invoice", hint: "Billing document" },
  { word: "strategy", hint: "Plan of action" },
  { word: "feedback", hint: "Response or evaluation" },
  { word: "workflow", hint: "Process sequence" },
  { word: "milestone", hint: "Key project checkpoint" },
  { word: "budget", hint: "Financial plan" },
  { word: "report", hint: "Summary of findings" },
  { word: "colleague", hint: "Coworker" },
  { word: "priority", hint: "Order of importance" },
  { word: "contract", hint: "Legal agreement" },
  { word: "progress", hint: "Forward movement" },
  { word: "approval", hint: "Official agreement" },
  { word: "schedule", hint: "Planned timetable" },
  { word: "resource", hint: "Asset or tool" },
  { word: "objective", hint: "Goal to achieve" },
];

const ROUNDS = 5;
const TIMER_MAX = 30;
const POINTS_CORRECT = 10;
const POINTS_HINT = -3;

function scramble(word) {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join("");
  return result === word ? scramble(word) : result;
}

function pickWords() {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ROUNDS);
}

const STATUS = { IDLE: "idle", PLAYING: "playing", RESULT: "result" };

export default function WordScrambleGame() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [status, setStatus] = useState(STATUS.IDLE);
  const [round, setRound] = useState(0);
  const [words, setWords] = useState([]);
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_MAX);
  const [hintUsed, setHintUsed] = useState(false);
  const [flash, setFlash] = useState(null); // "correct" | "wrong" | null
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem("wordScrambleHigh") || "0", 10)
  );

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const currentWord = words[round];

  const endRound = useCallback(
    (wasCorrect) => {
      clearInterval(timerRef.current);
      setFlash(wasCorrect ? "correct" : "wrong");
      setTimeout(() => {
        setFlash(null);
        if (round + 1 >= ROUNDS) {
          setStatus(STATUS.RESULT);
          setScore((prev) => {
            const final = prev;
            if (final > highScore) {
              setHighScore(final);
              localStorage.setItem("wordScrambleHigh", String(final));
            }
            return prev;
          });
        } else {
          const next = round + 1;
          setRound(next);
          setScrambled(scramble(words[next].word));
          setInput("");
          setHintUsed(false);
          setTimeLeft(TIMER_MAX);
        }
      }, 800);
    },
    [round, words, highScore]
  );

  // Timer tick
  useEffect(() => {
    if (status !== STATUS.PLAYING || flash) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endRound(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, round, flash, endRound]);

  function startGame() {
    const picked = pickWords();
    setWords(picked);
    setScrambled(scramble(picked[0].word));
    setRound(0);
    setScore(0);
    setInput("");
    setHintUsed(false);
    setTimeLeft(TIMER_MAX);
    setFlash(null);
    setStatus(STATUS.PLAYING);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || flash) return;
    const correct = input.trim().toLowerCase() === currentWord.word;
    if (correct) setScore((s) => s + POINTS_CORRECT);
    endRound(correct);
  }

  function handleHint() {
    if (hintUsed || flash) return;
    setHintUsed(true);
    setScore((s) => Math.max(0, s + POINTS_HINT));
  }

  function handleSkip() {
    if (flash) return;
    endRound(false);
  }

  const timerColor =
    timeLeft > 15
      ? colors.greenAccent[400]
      : timeLeft > 7
      ? colors.blueAccent[400]
      : "#ff6b6b";

  const flashBg =
    flash === "correct"
      ? colors.greenAccent[700] || "#1a5c48"
      : flash === "wrong"
      ? "#5c1a1a"
      : "transparent";

  // ── IDLE screen ─────────────────────────────────────────────────────────────
  if (status === STATUS.IDLE) {
    return (
      <Box m="20px">
        <Header title="WORD SCRAMBLE" subtitle="Unscramble the word before time runs out" />
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          mt={6}
          gap={3}
        >
          <GameIcon sx={{ fontSize: 80, color: colors.blueAccent[400] }} />
          <Typography variant="h4" color={colors.grey[100]} textAlign="center">
            {ROUNDS} rounds &nbsp;·&nbsp; {TIMER_MAX}s per word &nbsp;·&nbsp; {POINTS_CORRECT} pts per correct answer
          </Typography>
          {highScore > 0 && (
            <Chip
              icon={<TrophyIcon />}
              label={`High Score: ${highScore}`}
              sx={{ bgcolor: colors.blueAccent[700], color: colors.grey[100], fontSize: 16, px: 2, py: 1 }}
            />
          )}
          <Button
            variant="contained"
            size="large"
            onClick={startGame}
            sx={{
              bgcolor: colors.blueAccent[500],
              color: "#fff",
              px: 6,
              py: 1.5,
              fontSize: 18,
              borderRadius: 3,
              "&:hover": { bgcolor: colors.blueAccent[400] },
            }}
          >
            Start Game
          </Button>
        </Box>
      </Box>
    );
  }

  // ── RESULT screen ────────────────────────────────────────────────────────────
  if (status === STATUS.RESULT) {
    const perfect = score === ROUNDS * POINTS_CORRECT;
    return (
      <Box m="20px">
        <Header title="WORD SCRAMBLE" subtitle="Game Over" />
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          mt={6}
          gap={3}
        >
          <TrophyIcon sx={{ fontSize: 80, color: colors.blueAccent[400] }} />
          <Typography variant="h2" color={colors.grey[100]} fontWeight="bold">
            {perfect ? "Perfect Score!" : "Nice work!"}
          </Typography>
          <Typography variant="h3" color={colors.blueAccent[400]}>
            {score} / {ROUNDS * POINTS_CORRECT} pts
          </Typography>
          {score >= highScore && score > 0 && (
            <Chip
              icon={<TrophyIcon />}
              label="New High Score!"
              sx={{ bgcolor: colors.greenAccent[700], color: "#fff", fontSize: 16, px: 2, py: 1 }}
            />
          )}
          <Box display="flex" gap={2} mt={2}>
            <Button
              variant="contained"
              startIcon={<ReplayIcon />}
              onClick={startGame}
              sx={{
                bgcolor: colors.blueAccent[500],
                color: "#fff",
                px: 4,
                py: 1.5,
                "&:hover": { bgcolor: colors.blueAccent[400] },
              }}
            >
              Play Again
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── PLAYING screen ───────────────────────────────────────────────────────────
  return (
    <Box m="20px">
      <Header title="WORD SCRAMBLE" subtitle={`Round ${round + 1} of ${ROUNDS}`} />

      {/* Score / high-score bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Chip
          label={`Score: ${score}`}
          sx={{ bgcolor: colors.primary[400], color: colors.grey[100], fontWeight: "bold", fontSize: 15 }}
        />
        {highScore > 0 && (
          <Chip
            icon={<TrophyIcon />}
            label={`Best: ${highScore}`}
            sx={{ bgcolor: colors.primary[400], color: colors.blueAccent[300], fontSize: 14 }}
          />
        )}
      </Box>

      {/* Timer */}
      <Box mb={1}>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2" color={colors.grey[300]}>Time</Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color: timerColor }}>
            {timeLeft}s
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(timeLeft / TIMER_MAX) * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: colors.primary[400],
            "& .MuiLinearProgress-bar": { bgcolor: timerColor, transition: "none" },
          }}
        />
      </Box>

      {/* Game card */}
      <Fade in={!flash} timeout={300}>
        <Paper
          elevation={4}
          sx={{
            mt: 4,
            p: 4,
            borderRadius: 4,
            bgcolor: flash ? flashBg : colors.primary[400],
            transition: "background-color 0.3s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          {/* Scrambled word */}
          <Typography
            variant="h1"
            fontWeight="bold"
            letterSpacing={6}
            sx={{ color: colors.blueAccent[300], userSelect: "none", wordBreak: "break-all" }}
          >
            {scrambled.toUpperCase()}
          </Typography>

          <Typography variant="body1" color={colors.grey[300]}>
            {currentWord.word.length} letters
          </Typography>

          {/* Hint */}
          {hintUsed && (
            <Chip
              icon={<HintIcon />}
              label={`Hint: ${currentWord.hint}`}
              sx={{ bgcolor: colors.primary[300], color: colors.grey[100], fontSize: 14 }}
            />
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              variant="outlined"
              placeholder="Type your answer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!flash}
              autoComplete="off"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: colors.primary[500],
                  color: colors.grey[100],
                  borderRadius: 2,
                  "& fieldset": { borderColor: colors.blueAccent[600] },
                  "&:hover fieldset": { borderColor: colors.blueAccent[400] },
                  "&.Mui-focused fieldset": { borderColor: colors.blueAccent[400] },
                },
                "& input": { color: colors.grey[100], fontSize: 20, textAlign: "center" },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={!!flash || !input.trim()}
              sx={{
                mt: 2,
                bgcolor: colors.blueAccent[500],
                color: "#fff",
                py: 1.5,
                fontSize: 16,
                borderRadius: 2,
                "&:hover": { bgcolor: colors.blueAccent[400] },
                "&.Mui-disabled": { bgcolor: colors.primary[300] },
              }}
            >
              Submit
            </Button>
          </form>

          {/* Secondary actions */}
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<HintIcon />}
              onClick={handleHint}
              disabled={hintUsed || !!flash}
              sx={{
                borderColor: colors.grey[500],
                color: colors.grey[300],
                "&:hover": { borderColor: colors.blueAccent[400], color: colors.blueAccent[400] },
                "&.Mui-disabled": { borderColor: colors.grey[700], color: colors.grey[700] },
              }}
            >
              Hint ({POINTS_HINT} pts)
            </Button>
            <Button
              variant="outlined"
              startIcon={<SkipIcon />}
              onClick={handleSkip}
              disabled={!!flash}
              sx={{
                borderColor: colors.grey[500],
                color: colors.grey[300],
                "&:hover": { borderColor: "#ff6b6b", color: "#ff6b6b" },
                "&.Mui-disabled": { borderColor: colors.grey[700], color: colors.grey[700] },
              }}
            >
              Skip
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Correct / Wrong overlay text */}
      {flash && (
        <Box mt={2} textAlign="center">
          <Typography
            variant="h3"
            fontWeight="bold"
            sx={{ color: flash === "correct" ? colors.greenAccent[400] : "#ff6b6b" }}
          >
            {flash === "correct" ? `+${POINTS_CORRECT} Correct!` : `The word was: ${currentWord.word}`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
