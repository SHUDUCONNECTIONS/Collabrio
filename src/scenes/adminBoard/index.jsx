import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Divider,
  Pagination,
  useTheme,
  useMediaQuery,
  Skeleton,
  Grid,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import Header from "../../components/Header";
import { db } from "../../utils/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";


const EmployeeListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 8;


  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "users"), where("role", "==", "employee")),
      (snapshot) => {
        const employeesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: `${doc.data().firstName} ${doc.data().surname}`.trim(),
          email: doc.data().email,
        }));
        setEmployees(employeesData);
        setIsLoading(false);
      }
    );


    return () => unsubscribe();
  }, []);


  const paginatedEmployees = employees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header title="Employees" subtitle="Manage team members" />


      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Box sx={{ maxWidth: 1200, margin: "0 auto" }}>
          <Grid container spacing={3}>
            {isLoading
              ? Array(8)
                  .fill()
                  .map((_, i) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                      <Skeleton variant="rounded" height={150} />
                    </Grid>
                  ))
              : paginatedEmployees.map((employee) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
                    <Card
                      component={Link}
                      to={`/employeeBoards/${employee.id}`}
                      sx={{
                        textDecoration: "none",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.2s",
                        "&:hover": { transform: "translateY(-4px)" },
                      }}
                    >
                      <CardContent sx={{ textAlign: "center", flexGrow: 1, bgcolor: "#003152", }}>
                        <Avatar
                          sx={{
                            width: 80,
                            height: 80,
                            mb: 2,
                            mx: "auto",
                            bgcolor: theme.palette.primary.main, // Background color
                            color: theme.palette.getContrastText(
                              theme.palette.primary.main
                            ), // Text color for contrast
                          }}
                        >
                          {employee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </Avatar>
                        <Typography variant="h6">{employee.name}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {employee.email}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
          </Grid>


          <Pagination
            count={Math.ceil(employees.length / itemsPerPage)}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            sx={{ mt: 4, display: "flex", justifyContent: "center" }}
          />
        </Box>
      </Box>
    </Box>
  );
};


export default EmployeeListPage;





