import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar,
  AvatarGroup,
  Tooltip,
  CircularProgress,
  Divider,
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  EmojiEvents as TrophyIcon,
  CheckCircleOutline as DoneIcon,
  HourglassEmpty as InProgressIcon,
  Groups as GroupsIcon,
  DashboardOutlined as BoardIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import AnimatedCounter from "../../components/AnimatedCounter";
import { SkeletonStatCard, SkeletonRow } from "../../components/SkeletonCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

const startOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const normalizeStatus = (s) => (s || "").toLowerCase().replace(/\s/g, "");

const formatDate = (val) => {
  if (!val) return "—";
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
};

const Team = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [users, setUsers] = useState([]);
  const [performance, setPerformance] = useState({});
  const [completedBoards, setCompletedBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(usersData);

        const boardsSnap = await getDocs(collection(db, "boards"));
        const boards = boardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const weekStart = startOfWeek();
        const perf = {};
        const doneBoards = [];

        // Track completed boards and per-user board completion
        boards.forEach((board) => {
          if (normalizeStatus(board.status) === "completed") {
            doneBoards.push(board);
            (board.memberIds || []).forEach((uid) => {
              if (!perf[uid]) perf[uid] = initPerf();
              perf[uid].boardsCompleted += 1;
            });
          }
        });

        // Sort completed boards newest first (by createdAt as fallback)
        doneBoards.sort((a, b) => {
          const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
          const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
          return tb - ta;
        });
        setCompletedBoards(doneBoards);

        // Task-level stats per assigned user
        await Promise.all(
          boards.map(async (board) => {
            const tasksSnap = await getDocs(collection(db, `boards/${board.id}/tasks`));
            tasksSnap.docs.forEach((td) => {
              const task = td.data();
              const uid = task.assignedTo?.id;
              if (!uid) return;
              if (!perf[uid]) perf[uid] = initPerf();

              perf[uid].total += 1;
              perf[uid].boardSet.add(board.id);

              if (task.status === "done") {
                perf[uid].done += 1;
                const updatedAt = task.updatedAt?.toDate
                  ? task.updatedAt.toDate()
                  : task.updatedAt ? new Date(task.updatedAt) : null;
                if (updatedAt && updatedAt >= weekStart) perf[uid].doneThisWeek += 1;
              } else if (task.status === "doing") {
                perf[uid].inProgress += 1;
              } else if (task.status === "todo") {
                perf[uid].todo += 1;
              } else if (task.status === "onHold") {
                perf[uid].onHold += 1;
              }
            });
          })
        );

        Object.values(perf).forEach((p) => {
          p.boards = p.boardSet.size;
          delete p.boardSet;
        });

        setPerformance(perf);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load team data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const initPerf = () => ({
    done: 0, doneThisWeek: 0, inProgress: 0, todo: 0, onHold: 0,
    total: 0, boards: 0, boardsCompleted: 0, boardSet: new Set(),
  });

  const enrichedUsers = users.map((u) => {
    const p = performance[u.id] || { done: 0, doneThisWeek: 0, inProgress: 0, todo: 0, total: 0, boards: 0, boardsCompleted: 0 };
    return { ...u, ...p, completionRate: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0 };
  });

  const totalDoneThisWeek = enrichedUsers.reduce((s, u) => s + (u.doneThisWeek || 0), 0);
  const totalInProgress = enrichedUsers.reduce((s, u) => s + (u.inProgress || 0), 0);
  const topPerformer = [...enrichedUsers].sort((a, b) => (b.doneThisWeek || 0) - (a.doneThisWeek || 0))[0];

  const summaryCards = [
    {
      label: "Tasks Done This Week",
      value: totalDoneThisWeek,
      icon: <DoneIcon sx={{ fontSize: 28, color: colors.greenAccent[400] }} />,
      color: colors.greenAccent[400],
    },
    {
      label: "In Progress Across Team",
      value: totalInProgress,
      icon: <InProgressIcon sx={{ fontSize: 28, color: colors.blueAccent[400] }} />,
      color: colors.blueAccent[400],
    },
    {
      label: "Team Members",
      value: users.length,
      icon: <GroupsIcon sx={{ fontSize: 28, color: colors.orangeAccent?.[400] || "#ff9800" }} />,
      color: colors.orangeAccent?.[400] || "#ff9800",
    },
    {
      label: "Boards Completed (All Time)",
      value: completedBoards.length,
      icon: <BoardIcon sx={{ fontSize: 28, color: "#7c5cbf" }} />,
      color: "#7c5cbf",
    },
    {
      label: "Top Performer This Week",
      value: topPerformer
        ? `${topPerformer.firstName || ""} ${topPerformer.surname || ""}`.trim() || "—"
        : "—",
      sub: topPerformer ? `${topPerformer.doneThisWeek} tasks done` : "",
      icon: <TrophyIcon sx={{ fontSize: 28, color: "#ffc107" }} />,
      color: "#ffc107",
    },
  ];

  const columns = [
    {
      field: "firstName",
      headerName: "Name",
      flex: 1.2,
      renderCell: ({ row }) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: colors.blueAccent[600] }}>
            {(row.firstName || "?").charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600} color={colors.greenAccent[300]}>
              {row.firstName} {row.surname}
            </Typography>
            <Typography variant="caption" color={colors.grey[400]}>
              {row.position || "—"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.3,
      renderCell: ({ value }) => (
        <Typography variant="body2" color={colors.grey[200]}>{value}</Typography>
      ),
    },
    {
      field: "doneThisWeek",
      headerName: "Done This Week",
      flex: 0.85,
      type: "number",
      renderCell: ({ value }) => (
        <Chip
          label={value || 0}
          size="small"
          sx={{
            bgcolor: (value || 0) > 0 ? colors.greenAccent[700] : colors.primary[600],
            color: (value || 0) > 0 ? colors.greenAccent[100] : colors.grey[400],
            fontWeight: 700, minWidth: 36,
          }}
        />
      ),
    },
    {
      field: "inProgress",
      headerName: "In Progress",
      flex: 0.75,
      type: "number",
      renderCell: ({ value }) => (
        <Chip
          label={value || 0}
          size="small"
          sx={{
            bgcolor: (value || 0) > 0 ? colors.blueAccent[700] : colors.primary[600],
            color: (value || 0) > 0 ? colors.blueAccent[100] : colors.grey[400],
            fontWeight: 700, minWidth: 36,
          }}
        />
      ),
    },
    {
      field: "boardsCompleted",
      headerName: "Boards Completed",
      flex: 0.9,
      type: "number",
      renderCell: ({ value }) => (
        <Chip
          label={value || 0}
          size="small"
          sx={{
            bgcolor: (value || 0) > 0 ? "#3d1f5e" : colors.primary[600],
            color: (value || 0) > 0 ? "#c084fc" : colors.grey[400],
            fontWeight: 700, minWidth: 36,
          }}
        />
      ),
    },
    {
      field: "total",
      headerName: "Total Tasks",
      flex: 0.7,
      type: "number",
    },
    {
      field: "completionRate",
      headerName: "Completion Rate",
      flex: 1.2,
      renderCell: ({ value, row }) => (
        <Box width="100%">
          <Box display="flex" justifyContent="space-between" mb={0.4}>
            <Typography variant="caption" color={colors.grey[300]}>
              {row.done || 0}/{row.total || 0}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              color={
                value >= 75 ? colors.greenAccent[400] :
                value >= 40 ? colors.blueAccent[400] :
                "#ef5350"
              }
            >
              {value}%
            </Typography>
          </Box>
          <Tooltip title={`${value}% completion rate`} placement="top">
            <LinearProgress
              variant="determinate"
              value={value}
              sx={{
                height: 6, borderRadius: 3,
                bgcolor: colors.primary[600],
                "& .MuiLinearProgress-bar": {
                  bgcolor: value >= 75 ? colors.greenAccent[500] : value >= 40 ? colors.blueAccent[500] : "#ef5350",
                  borderRadius: 3,
                },
              }}
            />
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box m="20px">
        <Header title="TEAM" subtitle="Weekly Performance Overview" />
        <Box display="flex" gap={2} flexWrap="wrap" mt={2} mb={3}>
          {[...Array(5)].map((_, i) => <Box key={i} flex="1 1 160px"><SkeletonStatCard /></Box>)}
        </Box>
        <Box sx={{ height: "50vh", bgcolor: colors.primary[400], borderRadius: 2, p: 2 }}>
          {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box m="20px">
        <Header title="TEAM" subtitle="Weekly Performance Overview" />
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box m="20px">
      <Header title="TEAM" subtitle="Weekly Performance Overview" />

      {/* ── Summary Cards ── */}
      <Box display="flex" gap={2} flexWrap="wrap" mt={1} mb={3}>
        {summaryCards.map((card, i) => (
          <Card
            key={i}
            sx={{
              flex: "1 1 160px",
              bgcolor: colors.primary[400],
              borderRadius: 3,
              boxShadow: theme.palette.mode === "dark" ? 3 : 1,
              borderLeft: `4px solid ${card.color}`,
              transition: "transform 0.2s, box-shadow 0.2s",
              animation: `fadeSlideUp 0.4s ease ${i * 0.08}s both`,
              "&:hover": { transform: "translateY(-3px)", boxShadow: 6 },
            }}
          >
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, py: "14px !important", px: 2 }}>
              {card.icon}
              <Box>
                <Typography variant="caption" color={colors.grey[400]} display="block" lineHeight={1.2}>
                  {card.label}
                </Typography>
                {typeof card.value === "number" ? (
                  <AnimatedCounter value={card.value} sx={{ color: colors.grey[100], lineHeight: 1.3 }} />
                ) : (
                  <Typography variant="h5" fontWeight={700} color={colors.grey[100]} lineHeight={1.3}>
                    {card.value}
                  </Typography>
                )}
                {card.sub && (
                  <Typography variant="caption" color={colors.grey[400]}>{card.sub}</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ── DataGrid ── */}
      <Box
        sx={{
          height: "50vh",
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-cell": { borderBottom: "none", display: "flex", alignItems: "center" },
          "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
          "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
          "& .MuiDataGrid-row:hover": { bgcolor: `${colors.primary[300]} !important` },
        }}
      >
        <DataGrid
          rows={enrichedUsers}
          columns={columns}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id}
          rowHeight={56}
          initialState={{
            sorting: { sortModel: [{ field: "doneThisWeek", sort: "desc" }] },
          }}
        />
      </Box>

      {/* ── Completed Boards History ── */}
      <Box mt={4} mb={2}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <BoardIcon sx={{ color: "#7c5cbf", fontSize: 22 }} />
          <Typography variant="h5" fontWeight={700} color={colors.grey[100]}>
            Completed Boards History
          </Typography>
          <Chip
            label={`${completedBoards.length} total`}
            size="small"
            sx={{ bgcolor: "#3d1f5e", color: "#c084fc", fontWeight: 700 }}
          />
        </Box>

        {completedBoards.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: colors.primary[400],
              borderRadius: 3,
              border: `1px dashed ${colors.grey[600]}`,
            }}
          >
            <Typography color={colors.grey[400]}>No boards have been completed yet.</Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 2,
            }}
          >
            {completedBoards.map((board) => {
              // Resolve member names from users list
              const members = (board.members || []).map((m) => {
                const found = users.find((u) => u.id === m.id);
                return found
                  ? `${found.firstName || ""} ${found.surname || ""}`.trim()
                  : m.name || "Unknown";
              });

              const creator = users.find((u) => u.id === board.createdBy);
              const creatorName = creator
                ? `${creator.firstName || ""} ${creator.surname || ""}`.trim()
                : "Unknown";

              return (
                <Paper
                  key={board.id}
                  elevation={2}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: colors.primary[400],
                    borderLeft: `4px solid ${colors.greenAccent[500]}`,
                    transition: "box-shadow 0.2s",
                    "&:hover": { boxShadow: 6 },
                  }}
                >
                  {/* Board name + completed chip */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      color={colors.grey[100]}
                      sx={{ flex: 1, mr: 1, lineHeight: 1.3 }}
                    >
                      {board.boardName || "Untitled Board"}
                    </Typography>
                    <Chip
                      label="Completed"
                      size="small"
                      sx={{
                        bgcolor: colors.greenAccent[700],
                        color: colors.greenAccent[100],
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        height: 20,
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  {/* Description */}
                  {board.description && (
                    <Typography
                      variant="body2"
                      color={colors.grey[400]}
                      sx={{
                        mb: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {board.description}
                    </Typography>
                  )}

                  <Divider sx={{ borderColor: colors.primary[600], mb: 1.5 }} />

                  {/* Meta row */}
                  <Box display="flex" flexDirection="column" gap={0.8}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon sx={{ fontSize: 14, color: colors.grey[500] }} />
                      <Typography variant="caption" color={colors.grey[400]}>
                        Created by <strong style={{ color: colors.grey[200] }}>{creatorName}</strong>
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon sx={{ fontSize: 14, color: colors.grey[500] }} />
                      <Typography variant="caption" color={colors.grey[400]}>
                        Deadline: <strong style={{ color: colors.grey[200] }}>{formatDate(board.deadline)}</strong>
                      </Typography>
                    </Box>

                    {board.priority && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={board.priority}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            bgcolor:
                              board.priority === "Critical" ? "#4a1010" :
                              board.priority === "Important" ? "#4a3010" : "#0f2e1a",
                            color:
                              board.priority === "Critical" ? "#ef5350" :
                              board.priority === "Important" ? "#ff9800" : "#4caf50",
                          }}
                        />
                      </Box>
                    )}

                    {/* Members avatars */}
                    {members.length > 0 && (
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <AvatarGroup
                          max={5}
                          sx={{
                            "& .MuiAvatar-root": {
                              width: 24,
                              height: 24,
                              fontSize: 10,
                              bgcolor: colors.blueAccent[700],
                              border: `1px solid ${colors.primary[400]}`,
                            },
                          }}
                        >
                          {members.map((name, idx) => (
                            <Tooltip key={idx} title={name}>
                              <Avatar>{name.charAt(0).toUpperCase()}</Avatar>
                            </Tooltip>
                          ))}
                        </AvatarGroup>
                        <Typography variant="caption" color={colors.grey[400]}>
                          {members.length} member{members.length !== 1 ? "s" : ""}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Team;
