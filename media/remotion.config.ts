import { Config } from "@remotion/cli/config";
import path from "path";

// Resolves relative to CWD (C:\git\time-craft-scheduler-admin) where render is invoked
Config.setPublicDir(path.resolve("media", "public"));
