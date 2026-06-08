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
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  LightbulbOutlined as HintIcon,
  SkipNext as SkipIcon,
  Replay as ReplayIcon,
  SportsEsports as GameIcon,
  Leaderboard as LeaderboardIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { db, auth } from "../../utils/firebase";
import {
  doc, getDoc, setDoc, collection, getDocs,
  query, orderBy, limit,
} from "firebase/firestore";

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
const LEADERBOARD_LIMIT = 10;

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

function avatarColor(name = "") {
  const palette = ["#1a8fff", "#00cfa5", "#b133cd", "#f58d3c", "#ffc107", "#ef5350", "#26c6da"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

const STATUS = { IDLE: "idle", PLAYING: "playing", RESULT: "result" };

// ── Leaderboard table ─────────────────────────────────────────────────────────
function Leaderboard({ entries, loading, currentUserId, colors }) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Box mt={4} width="100%" maxWidth={520}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <LeaderboardIcon sx={{ color: colors.blueAccent[400] }} />
        <Typography variant="h5" fontWeight="bold" color={colors.grey[100]}>
          Leaderboard
        </Typography>
      </Box>

      <Paper sx={{ bgcolor: colors.primary[400], borderRadius: 3, overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: colors.grey[400], fontWeight: 700, width: 40 }}>#</TableCell>
              <TableCell sx={{ color: colors.grey[400], fontWeight: 700 }}>Player</TableCell>
              <TableCell align="right" sx={{ color: colors.grey[400], fontWeight: 700 }}>Score</TableCell>
              <TableCell align="right" sx={{ color: colors.grey[400], fontWeight: 700 }}>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="text" width={20} sx={{ bgcolor: colors.primary[300] }} /></TableCell>
                    <TableCell><Skeleton variant="text" width={120} sx={{ bgcolor: colors.primary[300] }} /></TableCell>
                    <TableCell><Skeleton variant="text" width={40} sx={{ bgcolor: colors.primary[300] }} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} sx={{ bgcolor: colors.primary[300] }} /></TableCell>
                  </TableRow>
                ))
              : entries.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: colors.grey[400], py: 3 }}>
                    No scores yet — be the first!
                  </TableCell>
                </TableRow>
              )
              : entries.map((entry, i) => {
                  const isMe = entry.userId === currentUserId;
                  return (
                    <TableRow
                      key={entry.userId}
                      sx={{
                        bgcolor: isMe ? `${colors.blueAccent[800]}55` : "transparent",
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ color: colors.grey[300], fontWeight: 700 }}>
                        {medals[i] ?? i + 1}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            sx={{
                              width: 26, height: 26, fontSize: 12,
                              bgcolor: avatarColor(entry.name),
                            }}
                          >
                            {entry.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography
                            variant="body2"
                            sx={{ color: isMe ? colors.blueAccent[300] : colors.grey[100], fontWeight: isMe ? 700 : 400 }}
                          >
                            {entry.name}{isMe && " (you)"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color={colors.greenAccent[400]}>
                          {entry.score}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color={colors.grey[400]}>
                          {entry.date}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

async function saveScore(score) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "wordScrambleLeaderboard", user.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data().score : -1;
  if (score <= existing) return; // only save personal bests

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const name = userDoc.exists()
    ? `${userDoc.data().firstName || ""} ${userDoc.data().surname || ""}`.trim()
    : user.email?.split("@")[0] || "Anonymous";

  await setDoc(ref, {
    userId: user.uid,
    name,
    score,
    timestamp: new Date(),
  });
}

async function fetchLeaderboard() {
  const q = query(
    collection(db, "wordScrambleLeaderboard"),
    orderBy("score", "desc"),
    limit(LEADERBOARD_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    return {
      userId: d.id,
      name: data.name,
      score: data.score,
      date: ts.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const [flash, setFlash] = useState(null);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem("wordScrambleHigh") || "0", 10)
  );
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [isNewBest, setIsNewBest] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const currentUser = auth.currentUser;

  const currentWord = words[round];

  // Load leaderboard on mount
  useEffect(() => {
    fetchLeaderboard()
      .then(setLeaderboard)
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, []);

  const refreshLeaderboard = async () => {
    try {
      const entries = await fetchLeaderboard();
      setLeaderboard(entries);
    } catch {}
  };

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
            const newBest = final > highScore;
            if (newBest) {
              setHighScore(final);
              localStorage.setItem("wordScrambleHigh", String(final));
              setIsNewBest(true);
            }
            saveScore(final).then(refreshLeaderboard);
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
    setIsNewBest(false);
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

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (status === STATUS.IDLE) {
    return (
      <Box m="20px">
        <Header title="WORD SCRAMBLE" subtitle="Unscramble the word before time runs out" />
        <Box display="flex" flexDirection="column" alignItems="center" mt={4} gap={3}>
          <GameIcon sx={{ fontSize: 80, color: colors.blueAccent[400] }} />
          <Typography variant="h4" color={colors.grey[100]} textAlign="center">
            {ROUNDS} rounds &nbsp;·&nbsp; {TIMER_MAX}s per word &nbsp;·&nbsp; {POINTS_CORRECT} pts per correct answer
          </Typography>
          {highScore > 0 && (
            <Chip
              icon={<TrophyIcon />}
              label={`Your Best: ${highScore}`}
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

          <Leaderboard
            entries={leaderboard}
            loading={leaderboardLoading}
            currentUserId={currentUser?.uid}
            colors={colors}
          />
        </Box>
      </Box>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (status === STATUS.RESULT) {
    const perfect = score === ROUNDS * POINTS_CORRECT;
    return (
      <Box m="20px">
        <Header title="WORD SCRAMBLE" subtitle="Game Over" />
        <Box display="flex" flexDirection="column" alignItems="center" mt={4} gap={3}>
          <TrophyIcon sx={{ fontSize: 80, color: colors.blueAccent[400] }} />
          <Typography variant="h2" color={colors.grey[100]} fontWeight="bold">
            {perfect ? "Perfect Score!" : "Nice work!"}
          </Typography>
          <Typography variant="h3" color={colors.blueAccent[400]}>
            {score} / {ROUNDS * POINTS_CORRECT} pts
          </Typography>
          {isNewBest && score > 0 && (
            <Chip
              icon={<TrophyIcon />}
              label="New Personal Best!"
              sx={{ bgcolor: colors.greenAccent[700], color: "#fff", fontSize: 16, px: 2, py: 1 }}
            />
          )}
          <Box display="flex" gap={2} mt={1}>
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

          <Leaderboard
            entries={leaderboard}
            loading={leaderboardLoading}
            currentUserId={currentUser?.uid}
            colors={colors}
          />
        </Box>
      </Box>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  return (
    <Box m="20px">
      <Header title="WORD SCRAMBLE" subtitle={`Round ${round + 1} of ${ROUNDS}`} />

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

          {hintUsed && (
            <Chip
              icon={<HintIcon />}
              label={`Hint: ${currentWord.hint}`}
              sx={{ bgcolor: colors.primary[300], color: colors.grey[100], fontSize: 14 }}
            />
          )}

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
