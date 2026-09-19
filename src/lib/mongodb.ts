import mongoose, { ConnectionStates } from "mongoose";
import dns from "dns";

// Configure DNS for MongoDB Atlas SRV resolution on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://fundtrace:fundtrace123@cluster0.94w4lrn.mongodb.net/fundtrace?retryWrites=true&w=majority&appName=Cluster0";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isFallback: boolean;
}

let cached: CachedConnection = (global as any).mongooseCached || {
  conn: null,
  promise: null,
  isFallback: false,
};

if (!(global as any).mongooseCached) {
  (global as any).mongooseCached = cached;
}

export async function connectToDatabase(): Promise<{ isConnected: boolean; isFallback: boolean }> {
  if ((mongoose.connection?.readyState as number) === 1) {
    return { isConnected: true, isFallback: false };
  }

  if (cached.isFallback) {
    return { isConnected: false, isFallback: true };
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        cached.isFallback = false;
        console.log("🍃 Connected successfully to MongoDB Atlas!");
        return m;
      })
      .catch((err) => {
        console.warn("⚠️ MongoDB connection error, using offline fallback cache:", err.message);
        cached.isFallback = true;
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
    const isConnected = (mongoose.connection.readyState as number) === 1;
    return { isConnected, isFallback: !isConnected };
  } catch (err) {
    cached.isFallback = true;
    return { isConnected: false, isFallback: true };
  }
}
