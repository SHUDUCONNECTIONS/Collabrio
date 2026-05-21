import { useState, useEffect, useRef } from "react";
import {
  Box, Button, TextField, Avatar, IconButton,
  Typography, CircularProgress, Alert, useTheme,
} from "@mui/material";
import { CameraAlt as CameraIcon } from "@mui/icons-material";
import { Formik } from "formik";
import * as yup from "yup";
import useMediaQuery from "@mui/material/useMediaQuery";
import Header from "../../components/Header";
import { auth, db, storage } from "../../utils/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { alpha } from "@mui/material/styles";

const phoneRegExp =
  /^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/;

const checkoutSchema = yup.object().shape({
  firstName: yup.string().required("Required"),
  surname: yup.string().required("Required"),
  email: yup.string().email("Invalid email").required("Required"),
  contact: yup.string().matches(phoneRegExp, "Phone number is not valid").required("Required"),
  department: yup.string().required("Required"),
  position: yup.string().required("Required"),
});

const ProfileForm = () => {
  const theme = useTheme();
  const isNonMobile = useMediaQuery("(min-width:600px)");

  const [initialFormValues, setInitialFormValues] = useState(null);
  const [photoURL, setPhotoURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // Load user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { setError("Not authenticated"); return; }

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setInitialFormValues(data);
          setPhotoURL(data.photoURL || null);
        } else {
          setInitialFormValues({ firstName: "", surname: "", email: user.email, contact: "", department: "", position: "" });
        }
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Handle profile picture selection & upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }

    setUploadError("");
    setUploading(true);
    try {
      const user = auth.currentUser;
      const storagePath = `profile-pictures/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) =>
        task.on("state_changed", null, reject, resolve)
      );

      const url = await getDownloadURL(task.snapshot.ref);
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      setPhotoURL(url);
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = async (values, { setSubmitting }) => {
    try {
      const user = auth.currentUser;
      if (!user) { setError("Not authenticated"); return; }
      await updateDoc(doc(db, "users", user.uid), values);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
      <CircularProgress color="secondary" />
    </Box>
  );

  if (error) return <Box m="20px"><Typography color="error">{error}</Typography></Box>;

  const initials = `${initialFormValues?.firstName?.charAt(0) || ""}${initialFormValues?.surname?.charAt(0) || ""}`.toUpperCase();

  return (
    <Box m="20px">
      <Header title="PROFILE" subtitle="Edit your profile details" />

      {/* ── Avatar upload ── */}
      <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
        <Box sx={{ position: "relative", display: "inline-block" }}>
          <Avatar
            src={photoURL || undefined}
            sx={{
              width: 110,
              height: 110,
              fontSize: 38,
              fontWeight: 700,
              bgcolor: theme.palette.secondary.main,
              border: `3px solid ${alpha(theme.palette.secondary.main, 0.4)}`,
              boxShadow: 4,
            }}
          >
            {!photoURL && initials}
          </Avatar>

          {/* Camera overlay button */}
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 32,
              height: 32,
              bgcolor: theme.palette.secondary.main,
              color: "#fff",
              border: `2px solid ${theme.palette.background.default}`,
              "&:hover": { bgcolor: theme.palette.secondary.dark },
            }}
          >
            {uploading
              ? <CircularProgress size={14} color="inherit" />
              : <CameraIcon sx={{ fontSize: 16 }} />
            }
          </IconButton>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoChange}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mt={1}>
          Click the camera icon to upload a photo (max 5 MB)
        </Typography>

        {uploadError && (
          <Alert severity="error" sx={{ mt: 1, py: 0 }}>{uploadError}</Alert>
        )}
        {uploading && (
          <Typography variant="caption" color="secondary" mt={0.5}>Uploading…</Typography>
        )}
      </Box>

      {/* ── Form fields ── */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>Profile saved successfully!</Alert>
      )}

      <Formik
        onSubmit={handleFormSubmit}
        initialValues={initialFormValues}
        validationSchema={checkoutSchema}
        enableReinitialize
      >
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
          <form onSubmit={handleSubmit}>
            <Box
              display="grid"
              gap="24px"
              gridTemplateColumns="repeat(4, minmax(0, 1fr))"
              sx={{ "& > div": { gridColumn: isNonMobile ? undefined : "span 4" } }}
            >
              <TextField
                fullWidth variant="filled" label="First Name"
                onBlur={handleBlur} onChange={handleChange}
                value={values.firstName} name="firstName"
                error={!!touched.firstName && !!errors.firstName}
                helperText={touched.firstName && errors.firstName}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth variant="filled" label="Surname"
                onBlur={handleBlur} onChange={handleChange}
                value={values.surname} name="surname"
                error={!!touched.surname && !!errors.surname}
                helperText={touched.surname && errors.surname}
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                fullWidth variant="filled" label="Email"
                onBlur={handleBlur} onChange={handleChange}
                value={values.email} name="email"
                error={!!touched.email && !!errors.email}
                helperText={touched.email && errors.email}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth variant="filled" label="Contact Number"
                onBlur={handleBlur} onChange={handleChange}
                value={values.contact} name="contact"
                error={!!touched.contact && !!errors.contact}
                helperText={touched.contact && errors.contact}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth variant="filled" label="Department"
                onBlur={handleBlur} onChange={handleChange}
                value={values.department} name="department"
                error={!!touched.department && !!errors.department}
                helperText={touched.department && errors.department}
                sx={{ gridColumn: "span 4" }}
              />
              <TextField
                fullWidth variant="filled" label="Position"
                onBlur={handleBlur} onChange={handleChange}
                value={values.position} name="position"
                error={!!touched.position && !!errors.position}
                helperText={touched.position && errors.position}
                sx={{ gridColumn: "span 4" }}
              />
            </Box>

            <Box display="flex" justifyContent="flex-end" mt="24px">
              <Button
                type="submit"
                color="secondary"
                variant="contained"
                disabled={isSubmitting}
                sx={{ px: 4, fontWeight: 600 }}
              >
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </Box>
          </form>
        )}
      </Formik>
    </Box>
  );
};

export default ProfileForm;
