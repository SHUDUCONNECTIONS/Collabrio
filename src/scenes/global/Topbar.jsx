import React, { useContext, useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Divider,
  Button,
  InputBase,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  DarkModeOutlined,
  LightModeOutlined,
  NotificationsOutlined,
  PersonOutlined,
  EditOutlined,
  LogoutOutlined,
  Search as SearchIcon,
  Event as EventIcon,
  PersonAdd as PersonAddIcon,
  FiberManualRecord as DotIcon,
} from "@mui/icons-material";
import { ColorModeContext, tokens } from "../../theme";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { alpha } from '@mui/material/styles';


const Topbar = ({ onLogout }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(new Set());
  const [user, setUser] = useState({
    firstName: "",
    surname: "",
    email: "",
  });
  const [authError, setAuthError] = useState(null);
  const open = Boolean(anchorEl);
  const notificationOpen = Boolean(notificationAnchorEl);
  const MAX_NOTIFICATIONS = 5;

  // Fetch user details on page refresh or auth state change
  // Consolidated useEffect for auth and notifications
  useEffect(() => {
    let unsubscribeNotifications;
    let unsubscribeBoards;

    // Track already processed board IDs to prevent duplicates
    const processedBoardIds = new Set();

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/Login", { replace: true });
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            firstName: userData.firstName,
            surname: userData.surname,
            email: userData.email,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }

      // Set up notification listener
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", currentUser.uid),
        orderBy("timestamp", "desc"),
        limit(MAX_NOTIFICATIONS)
      );

      unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const notificationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().timestamp,
        }));

        setNotifications(notificationsData);
        setUnreadNotifications(
          new Set(notificationsData.filter((n) => !n.read).map((n) => n.id))
        );
      });
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeBoards) unsubscribeBoards();
      processedBoardIds.clear();
    };
  }, [navigate]);

  useEffect(() => {
    let unsubscribeNotifications;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(MAX_NOTIFICATIONS)
        );

        unsubscribeNotifications = onSnapshot(q, (snapshot) => {
          const notificationsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().timestamp,
          }));

          setNotifications(notificationsData);
          setUnreadNotifications(
            new Set(notificationsData.filter((n) => !n.read).map((n) => n.id))
          );
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, []);

  const handleLogout = async () => {
    try {
      setAuthError(null);
      await auth.signOut();
      handleMenuClose();
    } catch (error) {
      setAuthError(error.message);
      console.error("Error logging out:", error);
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const getInitials = (firstName, surname) => {
    return `${firstName?.charAt(0) || ""}${surname?.charAt(0) || ""}`;
  };

  const handleEditProfile = () => {
    // Add your logic for editing the profile here
    console.log("Edit Profile clicked");
  };

  const reclassifyNotifications = () => {
    const now = new Date().getTime();
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) => {
        const notificationTime = notification.timestamp;
        const timeDiff = now - notificationTime;

        if (timeDiff > 24 * 60 * 60 * 1000) {
          return {
            ...notification,
            timestamp: notificationTime - 24 * 60 * 60 * 1000,
          };
        }
        return notification;
      })
    );
  };

  useEffect(() => {
    // const q = query(
    //   collection(db, "notifications"),
    //   where("userId", "==", user.uid),
    //   where("read", "==", false)  // Only fetch unread notifications
    // );

    const unsubscribe = onSnapshot(
      collection(db, "boards"),
      async (snapshot) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        for (const change of snapshot.docChanges()) {
          if (change.type === "added") {
            const boardId = change.doc.id;
            const boardData = change.doc.data();

            // Check if notification already exists
            const notificationExists = await checkExistingNotification(
              currentUser.uid,
              boardId
            );
            if (notificationExists) continue;

            // Skip notification if the current user is the creator of this board
            if (boardData.createdBy === currentUser.uid) continue;

            // Only notify if this user is a member
            if (boardData.memberIds.includes(currentUser.uid)) {
              const creatorDoc = await getDoc(
                doc(db, "users", boardData.createdBy)
              );
              const creatorName = creatorDoc.exists()
                ? creatorDoc.data().firstName
                : "Unknown User";

              // Add notification to Firestore
              const notificationRef = await addDoc(
                collection(db, "notifications"),
                {
                  userId: currentUser.uid,
                  message: `${creatorName} added you to ${boardData.boardName}`,
                  type: "board_addition",
                  read: false,
                  timestamp: new Date(),
                  boardId: boardId,
                }
              );

              // Cleanup old notifications
              const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", currentUser.uid),
                orderBy("timestamp", "asc")
              );

              const snapshot = await getDocs(notificationsQuery);
              if (snapshot.size > MAX_NOTIFICATIONS) {
                const batch = writeBatch(db);
                const toDelete = snapshot.docs
                  .slice(0, snapshot.size - MAX_NOTIFICATIONS)
                  .map((doc) => doc.ref);
                toDelete.forEach((ref) => batch.delete(ref));
                await batch.commit();
              }
            }
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const checkExistingNotification = async (userId, boardId) => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("boardId", "==", boardId),
      where("type", "==", "board_addition")
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  // Remove the deletion logic from handleNotificationItemClick
  const handleNotificationItemClick = async (notification) => {
    try {
      // Mark notification as read in Firestore
      await updateDoc(doc(db, "notifications", notification.id), {
        read: true,
      });

      // Update local state to mark notification as read
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );

      // Update unread count
      setUnreadNotifications((prevUnread) => {
        const newUnread = new Set(prevUnread);
        newUnread.delete(notification.id);
        return newUnread;
      });

      // Navigate if boardId exists
      if (notification.boardId) {
        navigate(`/boards/${notification.boardId}`);
      }

      handleNotificationClose();
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  // Enhanced groupNotificationsByDate function
  const groupNotificationsByDate = (notifications) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groupedNotifications = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    notifications.forEach((notification) => {
      if (!notification.createdAt) {
        groupedNotifications.Older.push(notification);
        return;
      }

      const notificationDate = notification.createdAt.toDate
        ? notification.createdAt.toDate()
        : new Date(notification.createdAt);

      const notificationDay = new Date(
        notificationDate.getFullYear(),
        notificationDate.getMonth(),
        notificationDate.getDate()
      );

      if (notificationDay.getTime() === today.getTime()) {
        groupedNotifications.Today.push(notification);
      } else if (notificationDay.getTime() === yesterday.getTime()) {
        groupedNotifications.Yesterday.push(notification);
      } else {
        groupedNotifications.Older.push(notification);
      }
    });

    // Sort notifications within each group by timestamp (newest first)
    Object.keys(groupedNotifications).forEach((key) => {
      groupedNotifications[key].sort((a, b) => {
        const dateA = a.createdAt.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt);
        const dateB = b.createdAt.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt);
        return dateB - dateA;
      });
    });

    return groupedNotifications;
  };

  return (
    <Box display="flex" justifyContent="space-between" p={2}>
      {/* SEARCH BAR */}
      <Box
        display="flex"
        backgroundColor={colors.primary[400]}
        borderRadius="3px"
        width="40%"
      >
        <InputBase sx={{ ml: 2, flex: 1 }} placeholder="Search..." />
        <IconButton type="button" sx={{ p: 1 }}>
          <SearchIcon />
        </IconButton>
      </Box>

      {/* ICONS AND PROFILE MENU */}
      <Box display="flex" alignItems="center">
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? (
            <DarkModeOutlined />
          ) : (
            <LightModeOutlined />
          )}
        </IconButton>
        <IconButton onClick={handleNotificationClick}>
          <Badge badgeContent={unreadNotifications.size} color="error">
            <NotificationsOutlined />
          </Badge>
        </IconButton>
        <IconButton
          onClick={handleMenuClick}
          aria-controls={open ? "profile-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
        >
          <PersonOutlined />
        </IconButton>

        {/* NOTIFICATION POPUP */}
        <Popover
          open={notificationOpen}
          anchorEl={notificationAnchorEl}
          onClose={handleNotificationClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <Box p={2} width={350} maxHeight={400} sx={{ overflowY: "auto" }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Notifications
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {unreadNotifications.size} unread
              </Typography>
            </Box>

            {Object.entries(groupNotificationsByDate(notifications)).map(
              ([dateGroup, groupNotifications]) =>
                groupNotifications.length > 0 && (
                  <Box key={dateGroup}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      sx={{
                        mt: 2,
                        mb: 1,
                        color:
                          theme.palette.mode === "dark"
                            ? colors.blueAccent[400]
                            : colors.blueAccent[700],
                        textTransform: "uppercase",
                        fontSize: "0.75rem",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {dateGroup}
                    </Typography>
                    <List dense>
                      {groupNotifications.map((notification) => {
                        const isUnread = !notification.read;
                        const isDeadlineDay =
                          notification.type === "deadline" &&
                          new Date(notification.deadline).toDateString() ===
                            new Date().toDateString();

                        return (
                          <ListItem
                            key={notification.id}
                            button
                            onClick={() =>
                              handleNotificationItemClick(notification)
                            }
                            sx={{
                              mb: 1,
                              borderRadius: "4px",
                              backgroundColor:
                                theme.palette.mode === "dark"
                                  ? isUnread
                                    ? isDeadlineDay
                                      ? alpha(colors.redAccent[500], 0.2) // Dark mode unread deadline
                                      : colors.primary[500] // Dark mode unread
                                    : colors.primary[600] // Dark mode read
                                  : isUnread
                                  ? isDeadlineDay
                                    ? alpha(colors.redAccent[200], 0.2) // Light mode unread deadline
                                    : colors.primary[50] // Light mode unread
                                  : colors.primary[200], // Light mode read
                              transition: "all 0.2s ease",
                              "&:hover": {
                                backgroundColor:
                                  theme.palette.mode === "dark"
                                    ? colors.primary[400]
                                    : colors.primary[300],
                              },
                              borderLeft: isUnread
                                ? `3px solid ${
                                    isDeadlineDay
                                      ? theme.palette.mode === "dark"
                                        ? colors.redAccent[400]
                                        : colors.redAccent[600]
                                      : theme.palette.mode === "dark"
                                      ? colors.blueAccent[400]
                                      : colors.blueAccent[600]
                                  }`
                                : "none",
                              padding: "8px 16px",
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 40,
                                color: isDeadlineDay
                                  ? theme.palette.mode === "dark"
                                    ? colors.redAccent[400]
                                    : colors.redAccent[600]
                                  : isUnread
                                  ? theme.palette.mode === "dark"
                                    ? colors.blueAccent[400]
                                    : colors.blueAccent[600]
                                  : theme.palette.mode === "dark"
                                  ? colors.grey[400]
                                  : colors.grey[600],
                              }}
                            >
                              {notification.type === "board_addition" ? (
                                <PersonAddIcon />
                              ) : notification.type === "deadline" ? (
                                <EventIcon />
                              ) : (
                                <NotificationsOutlined />
                              )}
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: isUnread ? 600 : 400,
                                  color:
                                    theme.palette.mode === "dark"
                                      ? isUnread
                                        ? colors.grey[100]
                                        : colors.grey[400]
                                      : isUnread
                                      ? colors.grey[900]
                                      : colors.grey[600],
                                  lineHeight: 1.4,
                                }}
                              >
                                {notification.message}
                              </Typography>
                            </Box>
                            {isUnread && (
                              <DotIcon
                                sx={{
                                  fontSize: 8,
                                  color: isDeadlineDay
                                    ? theme.palette.mode === "dark"
                                      ? colors.redAccent[400]
                                      : colors.redAccent[600]
                                    : theme.palette.mode === "dark"
                                    ? colors.blueAccent[400]
                                    : colors.blueAccent[600],
                                  ml: 1,
                                }}
                              />
                            )}
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )
            )}
          </Box>
        </Popover>

        {/* PROFILE MENU */}
        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <Box p={2} width={250}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Avatar>{getInitials(user.firstName, user.surname)}</Avatar>
              <Box>
                <Typography fontWeight="bold">
                  {user.firstName} {user.surname}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<EditOutlined />}
              fullWidth
              onClick={handleEditProfile}
              sx={{
                mb: 2,
                color: colors.blueAccent[500],
                borderColor: colors.blueAccent[500],
                "&:hover": {
                  backgroundColor: colors.blueAccent[500],
                  color: colors.grey[100],
                },
              }}
            >
              Edit Profile
            </Button>
            <Divider />
            <MenuItem onClick={onLogout}>
              <LogoutOutlined sx={{ mr: 1 }} />
              <Typography>Logout</Typography>
            </MenuItem>
          </Box>
        </Menu>
      </Box>
    </Box>
  );
};

export default Topbar;
