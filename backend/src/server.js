import express from "express";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.route.js";  
import postRoutes from "./routes/post.routes.js";
import protectRoute from "./middleware/auth.middleware.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

const app = express();



app.use(cors());

// Configure Express with limits that work with Vercel's free tier
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Configure for file uploads within Vercel's limits
app.use(express.raw({ limit: '4mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  next();
});

app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);


app.use((err, req, res, next) => {
  console.error("Error occurred:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const startServer = async () => {
  try{
    await connectDB();
    if (ENV.NODE_ENV === "production") {
       app.listen(ENV.PORT || 3000, () => {
         console.log(`Server is running on port ${ENV.PORT || 3000}`);
       });
    }
    
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();

export default app;