import  { useState } from "react";
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Link,
  MenuItem,
} from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import Header from "../../components/Header";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../utils/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const departments = [
  "Human Resources",
  "Finance",
  "Information Technology",
  "Marketing",
  "Operations",
  "Sales",
  "Research & Development",
  "Legal",
];

const companyEmails = [
  "chris@shuduconnections.com",
  "buhle@shuduconnections.com",
  "lucky@shuduconnections.com",
  "thulani@shuduconnections.com",
  "jean@shuduconnections.com",
  "johanna@shuduconnections.com",
  "lindokuhle@shuduconnections.com",
  "rinae@shuduconnections.com",
  "sizwe@shuduconnections.com",
  "dimakatso@shuduconnections.com",
  "dimpho@shuduconnections.com",
  "zinhle@shuduconnections.com",
];

const SignUp = ({ onSignupSuccess }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createUserDocument = async (userId, userData) => {
    try {
      await setDoc(doc(db, "users", userId), {
        firstName: userData.firstName,
        surname: userData.surname,
        department: userData.department,
        position: userData.position,
        email: userData.email,
        contact: userData.contact,
        role:"employee",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  };

  const handleFormSubmit = async (values, { setSubmitting }) => {
    setIsSubmitting(true);
    setError("");
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // Create user document in Firestore
      await createUserDocument(user.uid, values);

      // Store minimal user info in localStorage if needed
      const userData = {
        firstName: values.firstName,
        email: values.email,
        department: values.department,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      // Call the success callback if provided
      if (onSignupSuccess && typeof onSignupSuccess === "function") {
        onSignupSuccess(userData);
      }

      // Navigate to the appropriate page (consider navigating to dashboard instead)
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      let errorMessage = "An error occurred during signup. Please try again.";

      // Handle specific Firebase auth errors
      if (err.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Please use a different email or try logging in.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "The email address is invalid.";
      } else if (err.code === "auth/operation-not-allowed") {
        errorMessage =
          "Email/password accounts are not enabled. Please contact support.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "The password is too weak.";
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  const textFieldSx = {
    "& .MuiFilledInput-root": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      borderRadius: "8px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "#4cceac",
      },
      "&.Mui-focused": {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "#4cceac",
      },
    },
    "& .MuiFilledInput-input": {
      color: "#ffffff",
      padding: "16px",
      fontSize: "1rem",
    },
    "& .MuiInputLabel-root": {
      color: "rgba(255, 255, 255, 0.7)",
      transform: "translate(16px, 16px) scale(1)",
    },
    "& .MuiInputLabel-shrink": {
      transform: "translate(16px, 4px) scale(0.75)",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#4cceac",
    },
    "& .MuiFormHelperText-root": {
      color: "#ff6b6b",
      marginLeft: "16px",
    },
    "& .MuiSelect-select": {
      padding: "16px",
    },
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: `linear-gradient(rgba(20, 27, 45, 0.8), rgba(20, 27, 45, 0.9)), url('/download.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        overflowY: "auto",
        padding: "20px",
      }}
    >
      <Box
        width="100%"
        maxWidth="800px"
        p="32px"
        borderRadius="12px"
        boxShadow="0px 4px 20px rgba(0, 0, 0, 0.3)"
        bgcolor="#1f2940"
      >
        <Box display="flex" justifyContent="center" mb={4}>
          <img
            src="/SHUDU CONNNECTIONS transparency.png"
            alt="Company Logo"
            style={{ width: "150px", height: "auto" }}
          />
        </Box>

        <Header
          title="SIGN UP"
          subtitle="Create a New Account"
          sx={{
            "& .MuiTypography-h2": {
              color: "#ffffff",
              fontSize: "24px",
              mb: 1,
            },
            "& .MuiTypography-subtitle1": {
              color: "rgba(255, 255, 255, 0.7)",
              mb: 2,
            },
          }}
        />

        {error && (
          <Box mb={2}>
            <Alert
              severity="error"
              sx={{ backgroundColor: "#ff6b6b20", color: "#ff6b6b" }}
            >
              {error}
            </Alert>
          </Box>
        )}

        <Formik
          onSubmit={handleFormSubmit}
          initialValues={initialValues}
          validationSchema={signupSchema}
        >
          {({
            values,
            errors,
            touched,
            handleBlur,
            handleChange,
            handleSubmit,
          }) => (
            <form onSubmit={handleSubmit}>
              <Box
                display="grid"
                gap="16px"
                gridTemplateColumns="repeat(2, 1fr)"
                sx={{
                  "@media (max-width: 600px)": {
                    gridTemplateColumns: "1fr",
                  },
                }}
              >
                <TextField
                  fullWidth
                  variant="filled"
                  type="text"
                  label="First Name"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.firstName}
                  name="firstName"
                  error={!!touched.firstName && !!errors.firstName}
                  helperText={touched.firstName && errors.firstName}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  variant="filled"
                  type="text"
                  label="Surname"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.surname}
                  name="surname"
                  error={!!touched.surname && !!errors.surname}
                  helperText={touched.surname && errors.surname}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  select
                  variant="filled"
                  label="Department"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.department}
                  name="department"
                  error={!!touched.department && !!errors.department}
                  helperText={touched.department && errors.department}
                  sx={textFieldSx}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  variant="filled"
                  type="text"
                  label="Position"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.position}
                  name="position"
                  error={!!touched.position && !!errors.position}
                  helperText={touched.position && errors.position}
                  sx={textFieldSx}
                />
                <TextField
                  fullWidth
                  select
                  variant="filled"
                  label="Email Address"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.email}
                  name="email"
                  error={!!touched.email && !!errors.email}
                  helperText={touched.email && errors.email}
                  sx={textFieldSx}
                >
                  {companyEmails.map((email) => (
                    <MenuItem key={email} value={email}>
                      {email}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  variant="filled"
                  type="text"
                  label="Contact Number"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.contact}
                  name="contact"
                  error={!!touched.contact && !!errors.contact}
                  helperText={touched.contact && errors.contact}
                  sx={textFieldSx}
                />
                
                <Box display="grid" gap="16px" gridTemplateColumns="1fr">
                  <TextField
                    fullWidth
                    variant="filled"
                    type="password"
                    label="Password"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.password}
                    name="password"
                    error={!!touched.password && !!errors.password}
                    helperText={touched.password && errors.password}
                    sx={textFieldSx}
                  />
                  <TextField
                    fullWidth
                    variant="filled"
                    type="password"
                    label="Confirm Password"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.confirmPassword}
                    name="confirmPassword"
                    error={
                      !!touched.confirmPassword && !!errors.confirmPassword
                    }
                    helperText={
                      touched.confirmPassword && errors.confirmPassword
                    }
                    sx={textFieldSx}
                  />
                </Box>
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt="24px"
              >
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                  sx={{
                    textDecoration: "none",
                    color: "#1976d2",
                    "&:hover": {
                      color: "#1565c0",
                    },
                  }}
                >
                  Already have an account? Login
                </Link>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{
                    minWidth: "120px",
                    color: "white",
                    "&:disabled": {
                      color: "rgba(255, 255, 255, 0.7)",
                    },
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </Box>
            </form>
          )}
        </Formik>
      </Box>
    </Box>
  );
};

const phoneRegExp =
  /^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/;

const signupSchema = yup.object().shape({
  firstName: yup.string().required("Required"),
  surname: yup.string().required("Required"),
  department: yup.string().required("Required"),
  position: yup.string().required("Required"),
  email: yup.string().email("Invalid email").required("Required"),
  contact: yup
    .string()
    .matches(phoneRegExp, "Phone number is not valid")
    .required("Required"),
  // homeAddress: yup.string().required("Required"),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .required("Required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Required"),
});

const initialValues = {
  firstName: "",
  surname: "",
  department: "",
  position: "",
  email: "",
  contact: "",
  // homeAddress: "",
  password: "",
  confirmPassword: "",
};

export default SignUp;
