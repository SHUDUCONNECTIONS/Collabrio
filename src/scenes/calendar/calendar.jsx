import React, { useState, useEffect } from "react";
import FullCalendar, { formatDate } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { db } from "../../utils/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";


const Calendar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode) || {
    primary: { 400: "#FFFFFF" },
    greenAccent: { 500: "#00FF00" },
    blueAccent: { 500: "#0000FF" },
    redAccent: { 500: "#FF0000" },
    yellowAccent: { 500: "#FFFF00" },
  };
  const [currentEvents, setCurrentEvents] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchBoards = async (userId) => {
      try {
        const boardsRef = collection(db, "boards");
        const querySnapshot = await getDocs(boardsRef);


        const today = new Date();
        today.setHours(0, 0, 0, 0);


        const events = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((board) =>
            board.members.some((member) => member.id === userId)
          )
          .map((board) => {
            if (!board.deadline) return null;


            // Convert Firestore timestamp to Date object
            const deadline = board.deadline.toDate();
           
            // Create the event with the full date (including time)
            return {
              id: board.id,
              title: board.boardName,
              date: deadline, // Use the full date object instead of just the date string
              backgroundColor: isSameDay(deadline, today) && board.status !== "completed"
                ? colors.redAccent[500]
                : getEventColor(board.status),
              className:
                isSameDay(deadline, today) &&
                board.status !== "completed"
                  ? "blink-event"
                  : "",
              allDay: true, // Set to false if you want to show specific times
            };
          })
          .filter(Boolean);


        setCurrentEvents(events);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching boards:", error);
        setLoading(false);
      }
    };


    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchBoards(user.uid);
      } else {
        console.error("No user is logged in.");
        setLoading(false);
      }
    });
  }, []);


  // Helper function to compare dates
  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };


  const getEventColor = (status) => {
    switch (status) {
      case "in-progress":
        return colors.blueAccent[500];
      case "To DO":
        return colors.yellowAccent[500];
      case "urgent":
        return colors.redAccent[500];
      case "completed":
        return colors.greenAccent[500];
      default:
        return colors.greenAccent[500];
    }
  };


  const handleDateClick = (selected) => {
    // const title = prompt("Please enter a new title for your event");
    // const calendarApi = selected.view.calendar;
    // calendarApi.unselect();


    // if (title) {
    //   const eventDate = new Date(selected.startStr);
    //   const today = new Date();
    //   today.setHours(0, 0, 0, 0);


    //   const newEvent = {
    //     id: `${selected.dateStr}-${title}`,
    //     title,
    //     date: eventDate,
    //     backgroundColor: isSameDay(eventDate, today)
    //       ? colors.redAccent[500]
    //       : colors.greenAccent[500],
    //     className: isSameDay(eventDate, today) ? "blink-event" : "",
    //     allDay: true,
    //   };


    //   setCurrentEvents((prev) => [...prev, newEvent]);
    //   calendarApi.addEvent(newEvent);
    // }
  };


  const handleEventClick = (selected) => {
    if (
      window.confirm(
        `Are you sure you want to delete the event '${selected.event.title}'`
      )
    ) {
      setCurrentEvents((prev) =>
        prev.filter((event) => event.id !== selected.event.id)
      );
      selected.event.remove();
    }
  };


  if (loading) {
    return (
      <Box m="20px">
        <Typography>Loading events...</Typography>
      </Box>
    );
  }


 
 


  return (
    <Box m="20px">
      <Header title="Calendar" subtitle="Full Calendar Interactive Page" />


      <Box component="style">
        {`
          @keyframes blinker {
            50% {
              opacity: 0;
            }
          }
          .blink-event {
            animation: blinker 1s linear infinite;
          }
        `}
      </Box>


      <Box display="flex" justifyContent="space-between">
        <Box
          flex="1 1 20%"
          backgroundColor={colors.primary[400]}
          p="15px"
          borderRadius="4px"
          sx={{
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5">Events</Typography>
          <List>
            {currentEvents.map((event) => (
              <ListItem
                key={event.id}
                sx={{
                  backgroundColor: event.backgroundColor,
                  margin: "10px 0",
                  borderRadius: "2px",
                  animation: event.className === "blink-event" ? "blinker 1s linear infinite" : "none",
                }}
              >
                <ListItemText
                  primary={event.title}
                  secondary={
                    <Typography>
                      {formatDate(event.date, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>


        <Box flex="1 1 100%" ml="50px">
          <FullCalendar
            height="67vh"
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              listPlugin,
            ]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView="dayGridMonth"
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateClick}
            eventClick={handleEventClick}
            events={currentEvents}
          />
        </Box>
      </Box>
    </Box>
  );
};


export default Calendar;

