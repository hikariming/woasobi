import type { Skill } from "@/types";

export const mockSkills: Skill[] = [
  { id: "s1", name: "Code Generation", description: "Generate code from natural language", icon: "FileCode" },
  { id: "s2", name: "Code Review", description: "Review code for bugs and best practices", icon: "Search" },
  { id: "s3", name: "Bug Fix", description: "Identify and fix bugs in your code", icon: "Bug" },
  { id: "s4", name: "Refactor", description: "Refactor code for better structure", icon: "RefreshCw" },
  { id: "s5", name: "Test Writing", description: "Generate unit and integration tests", icon: "FlaskConical" },
  { id: "s6", name: "Documentation", description: "Generate docs and comments", icon: "FileText" },
  { id: "s7", name: "Image Generation", description: "Generate images from text", icon: "Image" },
  { id: "s8", name: "Translation", description: "Translate text between languages", icon: "Globe" },
];
