import { useState, useEffect } from "react";
import { ResponsiveBar } from "@nivo/bar";
import {
  Box, CircularProgress, Typography, useTheme,
  ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import {
  CalendarMonth as MonthIcon,
  AllInclusive as AllTimeIcon,
} from "@mui/icons-material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { tokens } from "../../theme";

// ── helpers ──────────────────────────────────────────────────────────────────

const avatarBg = (name = "") => {
  const palette = ["#1a8fff", "#00cfa5", "#b133cd", "#f58d3c", "#ffc107", "#ef5350", "#26c6da", "#ec407a"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

// Custom layer — renders floating avatars above the top of each bar
const AvatarsAboveBars = ({ bars, userMap }) => {
  const r = 18;
  return (
    <>
      {bars.map((bar, i) => {
        const cx = bar.x + bar.width / 2;
        const cy = bar.y - r - 8; // sit just above the bar top
        const value = bar.data.indexValue;
        const info = userMap[value] || {};
        const photo = info.photoURL;
        const full = info.fullName || value;
        const initial = (full || "?").charAt(0).toUpperCase();
        const bg = avatarBg(full);
        const clipId = `av-clip-${i}-${String(value).replace(/\s/g, "")}`;
        const delay = `${(i % 8) * 0.18}s`;

        return (
          <g key={bar.key} transform={`translate(${cx},${cy})`}>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-6; 0,0"
                dur="2.4s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.45 0.05 0.55 0.95; 0.45 0.05 0.55 0.95"
                begin={delay}
              />

              <title>{full}</title>

              {/* glow ring */}
              <circle cx={0} cy={0} r={r + 3} fill="none" stroke={bg} strokeWidth="2" opacity="0.4" />
              {/* background */}
              <circle cx={0} cy={0} r={r} fill={bg} />

              {photo ? (
                <>
                  <defs>
                    <clipPath id={clipId}>
                      <circle cx={0} cy={0} r={r} />
                    </clipPath>
                  </defs>
                  <image
                    href={photo}
                    x={-r} y={-r}
                    width={r * 2} height={r * 2}
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </>
              ) : (
                <text
                  x={0} y={5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={15}
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {initial}
                </text>
              )}

              {/* white border */}
              <circle cx={0} cy={0} r={r} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            </g>
          </g>
        );
      })}
    </>
  );
};

// ── main component ────────────────────────────────────────────────────────────

const UserBoardsChart = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isDark = theme.palette.mode === "dark";

  const [totalData, setTotalData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [userMap, setUserMap] = useState({}); // { firstName: { photoURL, fullName, email } }
  const [view, setView] = useState("total");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnap, boardsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "boards")),
        ]);

        // Build user lookup keyed by firstName (used as chart index)
        const userDetails = {};
        const map = {};
        usersSnap.docs.forEach((d) => {
          const u = d.data();
          const firstName = u.firstName || `User-${d.id.slice(0, 4)}`;
          const fullName = `${u.firstName || ""} ${u.surname || ""}`.trim() || firstName;
          userDetails[d.id] = { firstName, fullName, email: u.email, photoURL: u.photoURL || null };
          map[firstName] = { fullName, photoURL: u.photoURL || null, email: u.email };
        });
        setUserMap(map);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const totalCounts = {};
        const monthCounts = {};

        boardsSnap.docs.forEach((d) => {
          const board = d.data();
          const memberIds = board.memberIds || [];

          let createdAt = null;
          if (board.createdAt?.toDate) createdAt = board.createdAt.toDate();
          else if (board.createdAt) createdAt = new Date(board.createdAt);

          const isThisMonth = createdAt && createdAt >= monthStart && createdAt <= monthEnd;

          memberIds.forEach((uid) => {
            const u = userDetails[uid];
            if (!u) return;
            totalCounts[u.firstName] = (totalCounts[u.firstName] || 0) + 1;
            if (isThisMonth) monthCounts[u.firstName] = (monthCounts[u.firstName] || 0) + 1;
          });
        });

        const build = (counts) =>
          Object.keys(userDetails)
            .reduce((acc, uid) => {
              const u = userDetails[uid];
              const c = counts[u.firstName] || 0;
              if (c > 0) acc.push({ user: u.firstName, boards: c, email: u.email, fullName: u.fullName });
              return acc;
            }, [])
            .sort((a, b) => b.boards - a.boards);

        setTotalData(build(totalCounts));
        setMonthData(build(monthCounts));
        setLoading(false);
      } catch (err) {
        console.error("Chart fetch error:", err);
        setError("Failed to load chart data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="350px">
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (error) {
    return <Box m="20px"><Typography color="error">{error}</Typography></Box>;
  }

  const activeData = view === "total" ? totalData : monthData;
  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <Box m="20px">
      {/* Toggle */}
      <Box display="flex" justifyContent="flex-end" mb={1} pr={1}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontSize: "0.75rem",
              px: 1.5, py: 0.5,
              color: colors.grey[300],
              borderColor: colors.primary[300],
              "&.Mui-selected": {
                bgcolor: colors.blueAccent[700],
                color: colors.blueAccent[100],
                borderColor: colors.blueAccent[500],
                "&:hover": { bgcolor: colors.blueAccent[600] },
              },
            },
          }}
        >
          <ToggleButton value="total">
            <AllTimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
            All Time
          </ToggleButton>
          <ToggleButton value="month">
            <MonthIcon sx={{ fontSize: 14, mr: 0.5 }} />
            {monthLabel}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Chart or empty state */}
      {activeData.length === 0 ? (
        <Box
          height="42vh"
          display="flex" alignItems="center" justifyContent="center"
          sx={{
            border: `1px dashed ${colors.grey[600]}`,
            borderRadius: 2,
            bgcolor: colors.primary[400],
          }}
        >
          <Typography color={colors.grey[400]}>
            {view === "month" ? `No boards created in ${monthLabel}.` : "No board data available."}
          </Typography>
        </Box>
      ) : (
        <Box
          height="42vh"
          border={`1px solid ${colors.primary[300]}`}
          borderRadius="8px"
          bgcolor={colors.primary[400]}
          p={2}
        >
          <ResponsiveBar
            data={activeData}
            keys={["boards"]}
            indexBy="user"
            margin={{ top: 58, right: 30, bottom: 60, left: 60 }}
            padding={0.35}
            layers={[
              "grid", "axes", "bars", "markers", "legends",
              (props) => <AvatarsAboveBars {...props} userMap={userMap} />,
            ]}
            valueScale={{ type: "linear" }}
            colors={view === "month" ? colors.blueAccent[400] : colors.greenAccent[500]}
            borderRadius={5}
            borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: view === "month" ? "Boards This Month" : "Total Boards",
              legendPosition: "middle",
              legendOffset: -50,
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -30,
              legend: "Team Members",
              legendPosition: "middle",
              legendOffset: 50,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: "color", modifiers: [["darker", 3]] }}
            theme={{
              axis: {
                ticks: { text: { fill: colors.grey[200], fontSize: 11 } },
                legend: { text: { fill: colors.grey[200], fontSize: 12 } },
              },
              grid: {
                line: { stroke: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
              },
              labels: {
                text: { fill: colors.grey[100], fontSize: 12, fontWeight: 600 },
              },
            }}
            tooltip={({ value, data }) => (
              <Box
                sx={{
                  bgcolor: colors.primary[400],
                  p: 1.5,
                  border: `1px solid ${colors.primary[300]}`,
                  borderRadius: 2,
                  boxShadow: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                {/* mini avatar in tooltip */}
                <Box
                  sx={{
                    width: 32, height: 32, borderRadius: "50%",
                    bgcolor: avatarBg(data.fullName || data.user),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", flexShrink: 0,
                  }}
                >
                  {userMap[data.user]?.photoURL ? (
                    <img src={userMap[data.user].photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                      {(data.fullName || data.user).charAt(0).toUpperCase()}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color={colors.grey[100]}>
                    {data.fullName || data.user}
                  </Typography>
                  <Typography variant="body2" color={colors.greenAccent[300]}>
                    {value} board{value !== 1 ? "s" : ""}{" "}
                    {view === "month" ? `in ${monthLabel}` : "total"}
                  </Typography>
                  {data.email && (
                    <Typography variant="caption" color={colors.grey[400]}>{data.email}</Typography>
                  )}
                </Box>
              </Box>
            )}
          />
        </Box>
      )}
    </Box>
  );
};

export default UserBoardsChart;
