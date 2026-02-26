import express from "express";
import { createProjects, createVideo, deleteProject, getAllPublishedProjects } from "../controllers/projectController.js";
import { protect } from "../middlewares/auth.js";
import upload from "../configs/multer.js";

const projectRouter = express.Router()

projectRouter.post('/create', upload.array('images', 2), protect, createProjects)
projectRouter.post('/video', protect, createVideo)
projectRouter.post('/published', getAllPublishedProjects)
projectRouter.post('/:projectId', protect, deleteProject)

export default projectRouter;   

