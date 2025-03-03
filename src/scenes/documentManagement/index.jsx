import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  IconButton,
  CircularProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

import { doc, updateDoc } from "firebase/firestore";
import { ref, deleteObject, getDownloadURL } from "firebase/storage";
import { useParams } from "react-router-dom";
import { auth, db, storage } from "../../utils/firebase";

const DocumentManagement = ({
  documents = [],
  setDocuments = () => {},
  onUpload,
  isUploading,
  boardId: propBoardId,
}) => {
  const { boardId: paramBoardId } = useParams();
  const boardId = propBoardId || paramBoardId;

  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setError(null);
      await onUpload(
        files.map((file) => ({
          file,
          uploadedBy: {
            uid: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            displayName:
              auth.currentUser?.displayName || auth.currentUser?.email,
          },
        }))
      );
    } catch (uploadError) {
      console.error("Error uploading file:", uploadError);
      setError("Failed to upload documents");
    }
  };

  const getUploaderDisplayName = (document) => {
    if (document.uploadedBy?.displayName) {
      return document.uploadedBy.displayName;
    }
    if (document.uploadedBy?.email) {
      return document.uploadedBy.email;
    }
    return "Unknown User";
  };

  const handleDeleteClick = (document, e) => {
    e.stopPropagation();
    setSelectedDoc(document);
    setDeleteConfirmOpen(true);
  };

  const handleDownload = async (document) => {
    setError(null);
    if (!document.url) {
      setError("Download failed: No file URL available.");
      return;
    }

    try {
      const downloadURL = await getDownloadURL(ref(storage, document.url));
      window.open(downloadURL, "_blank");
    } catch (downloadError) {
      console.error("Download error:", downloadError);
      setError("Download failed: File may not exist or URL is incorrect.");
    }
  };

  const confirmDelete = async () => {
    if (!selectedDoc || !boardId) {
      setError("Unable to delete document: Missing required information");
      return;
    }

    setIsDeleting(true);
    try {
      if (selectedDoc.url) {
        try {
          const fileUrl = new URL(selectedDoc.url);
          const filePath = decodeURIComponent(
            fileUrl.pathname.split("/o/")[1].split("?")[0]
          );
          const storageRef = ref(storage, filePath);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.error("Storage delete error:", storageError);
          throw new Error("Failed to delete file from storage");
        }
      }

      const boardRef = doc(db, "boards", boardId);
      const updatedDocuments = documents.filter(
        (docItem) => docItem.url !== selectedDoc.url
      );

      await updateDoc(boardRef, { documents: updatedDocuments });

      if (typeof setDocuments === "function") {
        setDocuments(updatedDocuments);
      } else {
        console.error("setDocuments is not a function");
      }

      setError(null);
    } catch (err) {
      console.error("Delete error:", err);
      setError(`Failed to delete document: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedDoc(null);
    }
  };

  return (
    <Box
      sx={{
        mt: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        maxHeight: "150px",
        minHeight: "80px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Documents</Typography>
          <Box>
            <input
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
              style={{ display: "none" }}
              id="document-upload"
              type="file"
              multiple
              onChange={handleFileUpload}
            />
            <label htmlFor="document-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={
                  isUploading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <CloudUploadIcon />
                  )
                }
                disabled={isUploading}
                sx={{ color: "white" }}
              >
                {isUploading ? "Uploading..." : "Upload Documents"}
              </Button>
            </label>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      <Box sx={{ overflowY: "auto", flex: 1, p: 1 }}>
        {documents.length > 0 ? (
          documents.map((document, index) => (
            <Paper
              key={document.url || index}
              elevation={1}
              sx={{
                p: 1,
                mb: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box>
                <Typography variant="subtitle2">
                  {index + 1}. {document.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Uploaded by {getUploaderDisplayName(document)}
                  {document.uploadedAt &&
                    ` on ${new Date(document.uploadedAt).toLocaleString()}`}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(document);
                  }}
                  size="small"
                >
                  <DownloadIcon />
                </IconButton>
                <IconButton
                  onClick={(e) => handleDeleteClick(document, e)}
                  size="small"
                  color="error"
                  disabled={isDeleting && selectedDoc?.url === document.url}
                >
                  {isDeleting && selectedDoc?.url === document.url ? (
                    <CircularProgress size={20} />
                  ) : (
                    <DeleteIcon />
                  )}
                </IconButton>
              </Box>
            </Paper>
          ))
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No documents uploaded yet
          </Typography>
        )}
      </Box>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !isDeleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDoc?.name}"? This action
            cannot be undone.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentManagement;
